// Parser for Scale Workshop–style scale data (see
// https://github.com/xenharmonic-devs/scale-workshop). Each non-empty line is
// one interval; the final interval is the interval of equivalence (equave).
//
// Supported pitch syntax:
//   ratios            3/2        (bare integers are fractions: 2 means 2/1)
//   cents             701.9      (any number containing a ".")
//   EDO steps         7\12
//   EDJI              5\12<3/2>
//   decimal ratios    1.5e  14e-1
//   monzos            [-1 1 0>
//   FJS               M3^5  m7v13
//   compositions      32/27 * 81/80   27/16 % 81/80   7\12 + 1.96
//                     P8 - 1.96       4/3 *~ 1.23     3/2 %~ 5.1
// Trailing `"label"` / 'label' and CSS colors (#fae123, yellow) attach metadata.
// (* block comments *) are stripped everywhere. Directives `simplify`,
// `defer simplify` and `organize(tolerance)` / `defer organize(tolerance)` are
// understood; simplify is a no-op here because fractions are always kept
// reduced. Unknown directives are collected as warnings instead of failing.

export type Rational = { n: bigint; d: bigint };

export type ScalePitch = {
  cents: number;
  ratio: Rational | null;
};

export type ScaleEntry = {
  pitch: ScalePitch;
  label: string | null;
  color: string | null;
};

export type ParsedScale = {
  degrees: ScaleEntry[];
  equave: ScalePitch;
  warnings: string[];
};

const PRIMES = [
  2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n,
  59n, 61n, 67n, 71n,
];

const gcdBig = (a: bigint, b: bigint): bigint =>
  b === 0n ? a : gcdBig(b, a % b);

export const rat = (n: bigint, d: bigint = 1n): Rational => {
  if (d === 0n) throw new Error("Division by zero in ratio.");
  if (d < 0n) [n, d] = [-n, -d];
  const g = gcdBig(n < 0n ? -n : n, d);
  return { n: n / g, d: d / g };
};

const mulRat = (a: Rational, b: Rational) => rat(a.n * b.n, a.d * b.d);
const divRat = (a: Rational, b: Rational) => rat(a.n * b.d, a.d * b.n);
const invRat = (a: Rational) => rat(a.d, a.n);
const powRat = (value: Rational, exp: number): Rational =>
  exp >= 0
    ? rat(powBig(value.n, exp), powBig(value.d, exp))
    : rat(powBig(value.d, -exp), powBig(value.n, -exp));

const powBig = (base: bigint, exp: number): bigint => {
  let result = 1n;
  const magnitude = Math.abs(exp);
  for (let i = 0; i < magnitude; i++) result *= base;
  return exp < 0 ? 1n / result : result;
};

export const rationalToCents = ({ n, d }: Rational): number =>
  1200 * Math.log2(Number(n) / Number(d));

const UNISON_RATIO: Rational = { n: 1n, d: 1n };

const isUnison = (pitch: ScalePitch) =>
  pitch.ratio !== null
    ? pitch.ratio.n === 1n && pitch.ratio.d === 1n
    : Math.abs(pitch.cents) < 1e-6;

// ── Factorization (monzo <-> ratio) ──────────────────────────────────────

export type Monzo = Record<number, number>; // index into PRIMES -> exponent

export const monzoToRatio = (monzo: Monzo): Rational => {
  let numerator = 1n;
  let denominator = 1n;
  PRIMES.forEach((prime, index) => {
    const exp = monzo[index];
    if (!exp) return;
    if (exp > 0) numerator *= powBig(prime, exp);
    else denominator *= powBig(prime, -exp);
  });
  return rat(numerator, denominator);
};

export const ratioToMonzo = ({ n, d }: Rational): Monzo | null => {
  const monzo: Monzo = {};
  for (let index = 0; index < PRIMES.length; index++) {
    let exp = 0;
    while (n % PRIMES[index] === 0n) {
      n /= PRIMES[index];
      exp++;
    }
    while (d % PRIMES[index] === 0n) {
      d /= PRIMES[index];
      exp--;
    }
    if (exp !== 0) monzo[index] = exp;
  }
  return n === 1n && d === 1n ? monzo : null;
};

// ── FJS ──────────────────────────────────────────────────────────────────

// Pythagorean fifths-count for each in-octave degree residue (degrees 1..7).
const FIFTHS_BY_RESIDUE = [0, 2, 4, -1, 1, 3, 5];
const PERFECT_RESIDUES = new Set([0, 3, 4]); // unison, fourth, fifth positions
const APOTOME = rat(powBig(3n, 7), powBig(2n, 11)); // 2187/2048

type Quality = "P" | "M" | "m" | "A" | "d";

const pythagoreanRatio = (degree: number, quality: Quality): Rational => {
  const residue = (((degree - 1) % 7) + 7) % 7;
  const octaves = Math.floor((degree - 1) / 7);
  const isPerfectClass = PERFECT_RESIDUES.has(residue);

  if (isPerfectClass && (quality === "M" || quality === "m")) {
    throw new Error(`Degree ${degree} does not take ${quality} quality.`);
  }
  if (!isPerfectClass && quality === "P") {
    throw new Error(`Degree ${degree} requires M or m quality.`);
  }

  const fifths = FIFTHS_BY_RESIDUE[residue];
  let value =
    fifths >= 0 ? rat(powBig(3n, fifths)) : rat(1n, powBig(3n, -fifths));

  if (quality === "m") value = divRat(value, APOTOME);
  if (quality === "A") value = mulRat(value, APOTOME);
  if (quality === "d") value = divRat(value, powRat(APOTOME, 2));

  // Bring back into [1, 2) before re-applying the octave displacement.
  let { n, d } = value;
  while (n < d) n *= 2n;
  while (n >= d * 2n) d *= 2n;

  return rat(n * powBig(2n, octaves), d);
};

// Classic FJS master algorithm: walk the circle of fifths until the prime
// lands within the radius of tolerance (65/63, ~54.9 cents) of +-k fifths;
// the formal comma is p * 2^twos * 3^threes, octave-reduced into (-600, 600).
// Note the comma may be smaller than 1 (^5 multiplies by 80/81, flattening
// the Pythagorean third onto 5/4).
const FJS_RADIUS = 1200 * Math.log2(65 / 63);
const FIFTH_CENTS = 1200 * Math.log2(1.5);

const circleDistance = (a: number, b: number): number => {
  const deviation = Math.abs(a - b) % 1200;
  return deviation > 600 ? 1200 - deviation : deviation;
};

const commaCache = new Map<number, Rational>();

const fjsComma = (prime: number): Rational => {
  const cached = commaCache.get(prime);
  if (cached) return cached;

  const primeCents = 1200 * Math.log2(prime);
  let pythagoras = 0;
  let k = 0;
  let found: [number, number] | null =
    circleDistance(primeCents, 0) < FJS_RADIUS ? [0, 0] : null;

  while (!found) {
    pythagoras += FIFTH_CENTS;
    k++;
    if (circleDistance(primeCents, pythagoras) < FJS_RADIUS) {
      found = [k, -k];
    } else if (circleDistance(primeCents, -pythagoras) < FJS_RADIUS) {
      found = [-k, k];
    }
  }

  const [twos, threes] = found;
  const numerator =
    BigInt(prime) *
    powBig(2n, Math.max(twos, 0)) *
    powBig(3n, Math.max(threes, 0));
  const denominator =
    powBig(2n, Math.max(-twos, 0)) * powBig(3n, Math.max(-threes, 0));

  let comma = rat(numerator, denominator);
  while (rationalToCents(comma) > 600) comma = rat(comma.n, comma.d * 2n);
  while (rationalToCents(comma) < -600) comma = rat(comma.n * 2n, comma.d);

  commaCache.set(prime, comma);
  return comma;
};

const FJS_TOKEN = /^([PMmAd])(\d+)((?:[\^v]\d+)*)$/;

const parseFJS = (token: string): Rational => {
  const match = token.match(FJS_TOKEN);
  if (!match) throw new Error(`Invalid FJS interval "${token}".`);

  const [, quality, degreeText, inflections] = match;
  let value = pythagoreanRatio(Number(degreeText), quality as Quality);

  for (const [, sign, primeText] of inflections.matchAll(/([\^v])(\d+)/g)) {
    const comma = fjsComma(Number(primeText));
    value = sign === "^" ? mulRat(value, comma) : divRat(value, comma);
  }
  return value;
};

// ── Values ───────────────────────────────────────────────────────────────

type Value = { cents: number; ratio: Rational | null };

const fromRatio = (ratio: Rational): Value => ({
  cents: rationalToCents(ratio),
  ratio,
});

const fromCents = (cents: number): Value => ({ cents, ratio: null });

const negateValue = (value: Value): Value =>
  value.ratio ? fromRatio(invRat(value.ratio)) : fromCents(-value.cents);

const evalMonzo = (text: string): Value => {
  const exponents = text
    .slice(1, -1)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);

  if (exponents.some((exp) => !Number.isFinite(exp))) {
    throw new Error(`Invalid monzo "${text}".`);
  }
  if (exponents.length > PRIMES.length) {
    throw new Error(`Monzo "${text}" exceeds supported prime limit.`);
  }

  if (exponents.every((exp) => Number.isInteger(exp))) {
    const monzo: Monzo = {};
    exponents.forEach((exp, index) => {
      if (exp !== 0) monzo[index] = exp;
    });
    return fromRatio(monzoToRatio(monzo));
  }

  // Fractional exponents leave the rational domain: evaluate in cents.
  const cents = exponents.reduce(
    (sum, exp, index) => sum + exp * 1200 * Math.log2(Number(PRIMES[index])),
    0
  );
  return fromCents(cents);
};

const evalEdoStep = (text: string): number => {
  const match = text.match(/^(\d+)\\(\d+)(?:<(\d+)\/(\d+)>)?$/);
  if (!match) throw new Error(`Invalid EDO step "${text}".`);
  const [, steps, divisions, equaveN, equaveD] = match;
  if (Number(divisions) <= 0) throw new Error(`Invalid EDO step "${text}".`);
  const equaveCents = equaveN
    ? 1200 * Math.log2(Number(equaveN) / Number(equaveD))
    : 1200;
  return (Number(steps) / Number(divisions)) * equaveCents;
};

const evalDecimalRatio = (text: string): Value => {
  // A bare trailing "e" is a type marker, not an exponent ("1.5e").
  const normalized = /[eE]$/.test(text) ? `${text}0` : text;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid decimal ratio "${text}".`);
  }
  return fromCents(1200 * Math.log2(value));
};

const evalAtom = (text: string): Value => {
  if (text.startsWith("[")) return evalMonzo(text);
  if (text.includes("\\")) return fromCents(evalEdoStep(text));
  if (/^\d+(?:\.\d+)?e(?:[+-]?\d+)?$/i.test(text)) return evalDecimalRatio(text);
  if (/[PMmAd]/.test(text[0]) && /^\d/.test(text.slice(1))) {
    return fromRatio(parseFJS(text));
  }
  if (text.includes(".")) {
    const cents = Number(text);
    if (!Number.isFinite(cents)) throw new Error(`Unknown token "${text}".`);
    return fromCents(cents);
  }
  if (text.includes("/")) {
    const [n, d] = text.split("/");
    return fromRatio(rat(BigInt(n), BigInt(d)));
  }
  if (/^\d+$/.test(text)) return fromRatio(rat(BigInt(text)));
  throw new Error(`Unknown token "${text}".`);
};

// ── Operators ────────────────────────────────────────────────────────────

const applyOp = (op: string, a: Value, b: Value): Value => {
  const bothExact = a.ratio !== null && b.ratio !== null;

  switch (op) {
    case "*":
      if (bothExact) return fromRatio(mulRat(a.ratio!, b.ratio!));
      throw new Error(
        'Cannot multiply non-rational pitches; use "*~" to compose with cents.'
      );
    case "%":
      if (bothExact) return fromRatio(divRat(a.ratio!, b.ratio!));
      return fromCents(a.cents - b.cents);
    case "+":
    case "*~":
      return fromCents(a.cents + b.cents);
    case "-":
    case "%~":
      return fromCents(a.cents - b.cents);
    default:
      throw new Error(`Unknown operator "${op}".`);
  }
};

// ── Tokenizer ────────────────────────────────────────────────────────────

type Token =
  | { kind: "operator"; text: string }
  | { kind: "string"; text: string }
  | { kind: "color"; text: string }
  | { kind: "atom"; text: string };

// All patterns are anchored at the scan position; alternations must be grouped
// so `^` applies to every branch.
const OPERATOR_PATTERN = /^(?:\*~|%~|[+\-*%])/;
const STRING_PATTERN =
  /^(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)')/;
const MONZO_PATTERN = /^\[[^\]]*>/;
const COLOR_HEX_PATTERN = /^#[0-9a-fA-F]{3,8}\b/;
const FJS_PATTERN = /^[PMmAd]\d+(?:[\^v]\d+)*/;
const ATOM_PATTERNS = [
  /^\d+(?:\.\d+)?e(?:[+-]?\d+)?/i, // decimal ratio before plain numbers
  /^\d+\.\d*/, // cents
  /^\d+\/\d+/, // ratio
  /^\d+\\\d+(?:<\d+\/\d+>)?/, // EDO / EDJI
  /^\d+/, // bare integer
];
const WORD_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*/;

const CSS_COLORS = new Set([
  "clear", "red", "orange", "yellow", "green", "cyan", "blue", "purple",
  "magenta", "white", "black", "gray", "grey", "pink", "brown", "silver",
]);

const tokenizeLine = (line: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < line.length) {
    if (/\s/.test(line[index])) {
      index++;
      continue;
    }

    const rest = line.slice(index);

    const operator = rest.match(OPERATOR_PATTERN);
    if (operator) {
      tokens.push({ kind: "operator", text: operator[0] });
      index += operator[0].length;
      continue;
    }

    const quoted = rest.match(STRING_PATTERN);
    if (quoted) {
      tokens.push({ kind: "string", text: quoted[1] ?? quoted[2] });
      index += quoted[0].length;
      continue;
    }

    const hex = rest.match(COLOR_HEX_PATTERN);
    if (hex) {
      tokens.push({ kind: "color", text: hex[0] });
      index += hex[0].length;
      continue;
    }

    const monzo = rest.match(MONZO_PATTERN);
    if (monzo) {
      tokens.push({ kind: "atom", text: monzo[0] });
      index += monzo[0].length;
      continue;
    }

    const fjs = rest.match(FJS_PATTERN);
    if (fjs && FJS_TOKEN.test(fjs[0])) {
      tokens.push({ kind: "atom", text: fjs[0] });
      index += fjs[0].length;
      continue;
    }

    const atom = ATOM_PATTERNS.map((pattern) => rest.match(pattern)).find(
      Boolean
    );
    if (atom) {
      tokens.push({ kind: "atom", text: atom[0] });
      index += atom[0].length;
      continue;
    }

    const word = rest.match(WORD_PATTERN);
    if (word && CSS_COLORS.has(word[0])) {
      tokens.push({ kind: "color", text: word[0] });
      index += word[0].length;
      continue;
    }

    throw new Error(`Unrecognized text "${rest.slice(0, 20)}" in scale data.`);
  }

  return tokens;
};

// ── Expression parsing ───────────────────────────────────────────────────

class TokenStream {
  constructor(private tokens: Token[]) {}

  peek(): Token | undefined {
    return this.tokens[0];
  }

  next(): Token | undefined {
    return this.tokens.shift();
  }

  expectOperator(text: string): boolean {
    const token = this.peek();
    if (token?.kind === "operator" && token.text === text) {
      this.next();
      return true;
    }
    return false;
  }

  isEmpty(): boolean {
    return this.tokens.length === 0;
  }
}

const isOperator = (token: Token | undefined, texts: string[]): token is Extract<Token, { kind: 'operator'; text: string }> =>
  token?.kind === "operator" && texts.includes(token.text);

const parseProduct = (stream: TokenStream): Value => {
  if (isOperator(stream.peek(), ["-", "+"])) {
    const sign = (stream.next() as { text: string }).text;
    const value = parseProduct(stream);
    return sign === "-" ? negateValue(value) : value;
  }

  const head = stream.next();
  if (!head || head.kind !== "atom") {
    throw new Error("Expected a pitch value.");
  }
  let value = evalAtom(head.text);

  while (isOperator(stream.peek(), ["*", "%", "*~", "%~"])) {
    const op = (stream.next() as { text: string }).text;
    const operandToken = stream.next();
    if (!operandToken || operandToken.kind !== "atom") {
      throw new Error(`Operator "${op}" is missing an operand.`);
    }
    value = applyOp(op, value, evalAtom(operandToken.text));
  }

  return value;
};

const parseSum = (stream: TokenStream): Value => {
  let value = parseProduct(stream);
  while (isOperator(stream.peek(), ["+", "-"])) {
    const op = (stream.next() as { text: string }).text;
    value = applyOp(op, value, parseProduct(stream));
  }
  return value;
};

const parseExpressionTokens = (tokens: Token[]): Value => {
  const stream = new TokenStream(tokens);
  const value = parseSum(stream);
  if (!stream.isEmpty()) throw new Error("Unexpected extra tokens.");
  return value;
};

// ── Line-level parsing ───────────────────────────────────────────────────

const DIRECTIVE_PATTERN = /^(?:defer\s+)?(simplify|organize)\s*(?:\(([^)]*)\))?$/;

const entryComplexity = (entry: ScaleEntry): number => {
  if (!entry.pitch.ratio) return Infinity;
  return Number(entry.pitch.ratio.n) + Number(entry.pitch.ratio.d);
};

// Merge adjacent degrees closer than `tolerance` cents into whichever entry
// has the simpler ratio.
const organizeEntries = (entries: ScaleEntry[], tolerance: number) => {
  const merged: ScaleEntry[] = [];

  for (const entry of entries) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      entry.pitch.cents - previous.pitch.cents <= tolerance
    ) {
      merged[merged.length - 1] =
        entryComplexity(entry) < entryComplexity(previous) ? entry : previous;
      continue;
    }
    merged.push(entry);
  }
  return merged;
};

// Drop near-identical neighbours that survived sorting.
const coalesceDuplicates = (entries: ScaleEntry[]) =>
  entries.filter(
    (entry, index) =>
      index === 0 ||
      entry.pitch.cents - entries[index - 1].pitch.cents > 1e-6
  );

export const scaleFromText = (input: string): ParsedScale => {
  const withoutComments = input.replace(/\(\*[\s\S]*?\*\)/g, " ");
  const rawLines = withoutComments
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (rawLines.length === 0) throw new Error("Scale data is empty.");

  const warnings: string[] = [];
  const intervals: ScaleEntry[] = [];
  let organizeTolerance: number | null = null;

  for (const line of rawLines) {
    const directive = line.match(DIRECTIVE_PATTERN);
    if (directive) {
      const [, name, args] = directive;
      if (name === "organize") {
        const tolerance = args !== undefined ? Number(args) : 0;
        if (Number.isNaN(tolerance)) throw new Error(`Bad organize(${args}).`);
        organizeTolerance = tolerance;
      }
      continue;
    }

    // Lowercase-leading lines are directives we do not implement — except
    // FJS intervals with minor/diminished qualities ("m3v5", "d5").
    if (/^[a-z_]/.test(line) && !FJS_TOKEN.test(line)) {
      warnings.push(`Ignored unsupported directive "${line}".`);
      continue;
    }

    let tokens: Token[];
    try {
      tokens = tokenizeLine(line);
    } catch (error) {
      throw new Error(`${(error as Error).message} (line: ${line})`);
    }

    const expressionTokens = tokens.filter(
      (token) => token.kind === "atom" || token.kind === "operator"
    );
    const metaTokens = tokens.filter(
      (token) => token.kind === "string" || token.kind === "color"
    );

    const value = parseExpressionTokens(expressionTokens);
    const lastOfKind = (kind: Token["kind"]) => {
      for (let i = metaTokens.length - 1; i >= 0; i--) {
        if (metaTokens[i].kind === kind) {
          return (metaTokens[i] as { text: string }).text;
        }
      }
      return null;
    };
    intervals.push({
      pitch: { cents: value.cents, ratio: value.ratio },
      label: lastOfKind("string"),
      color: lastOfKind("color"),
    });
  }

  if (intervals.length === 0) {
    throw new Error("Scale data must define at least one interval.");
  }

  const sorted = coalesceDuplicates(
    [...intervals].sort((a, b) => a.pitch.cents - b.pitch.cents)
  );
  const organized =
    organizeTolerance === null ? sorted : organizeEntries(sorted, organizeTolerance);

  const nonUnison = organized.filter((entry) => !isUnison(entry.pitch));
  if (nonUnison.length === 0) {
    throw new Error("Scale data must define at least one non-unison interval.");
  }

  return {
    degrees: nonUnison.slice(0, -1),
    equave: nonUnison[nonUnison.length - 1].pitch,
    warnings,
  };
};

export const formatRatio = ({ n, d }: Rational): string =>
  d === 1n ? `${n}` : `${n}/${d}`;

export const UNISON = UNISON_RATIO;
