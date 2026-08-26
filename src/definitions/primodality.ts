// Primodality (Zhea Erose): scales built from a fixed prime p as denominator,
// emphasizing the timbral gestalt of the prime family over harmonic limits.
//
// A "Mode mp" of the harmonic series spans harmonics mp..2mp; Mode p and
// Mode 2p are the first and second octaves of the family /p. Neji
// (near-equal JI) re-tunes a primodal scale so steps land near an equal
// division of the period while every degree keeps the shared denominator p.

import { rat, rationalToCents, type Rational } from "./scale-input";

const PRIME_ADJECTIVES: Record<number, string> = {
  3: "ternary",
  5: "quintal",
  7: "septimal",
  11: "undecimal",
  13: "tridecimal",
  17: "septendecimal",
  19: "novemdecimal",
  23: "trivigesimal",
};

export const adjectiveForPrime = (prime: number): string =>
  PRIME_ADJECTIVES[prime] ?? `${prime}-limit-free`;

export const isPrime = (value: number): boolean => {
  if (!Number.isInteger(value) || value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor++) {
    if (value % divisor === 0) return false;
  }
  return true;
};

// ── Prime-family scale builder ───────────────────────────────────────────

export type HarmonicSegmentOptions = {
  // Which octave of the family: Mode p is 1, Mode 2p is 2, etc.
  // Mode mp spans harmonics mp .. 2mp.
  mode?: number;
  // Restrict to these absolute harmonic numbers within the segment.
  include?: number[];
};

export const harmonicSegment = (
  prime: number,
  options: HarmonicSegmentOptions = {}
): { numerators: number[]; ratios: Rational[]; from: number; to: number } => {
  if (!isPrime(prime)) throw new Error(`${prime} is not a prime.`);
  const mode = Math.max(1, Math.floor(options.mode ?? 1));
  const from = mode * prime;
  const to = 2 * mode * prime;

  let numerators = Array.from({ length: to - from - 1 }, (_, i) => from + i + 1);
  if (options.include) {
    const wanted = new Set(options.include);
    numerators = numerators.filter((n) => wanted.has(n));
    if (numerators.length === 0) {
      throw new Error("No selected harmonics fall inside the segment.");
    }
  }

  return {
    numerators,
    ratios: numerators.map((n) => rat(BigInt(n), BigInt(prime))),
    from,
    to,
  };
};

// Scale Workshop–format text for a prime-family scale: one n/p line per
// harmonic, ending on the period ((mode+1)p)/p.
export const primeFamilyScaleText = (
  prime: number,
  options: HarmonicSegmentOptions = {}
): string => {
  const { numerators, from, to } = harmonicSegment(prime, options);
  return [`${from}/${prime}`, ...numerators.map((n) => `${n}/${prime}`), `${to}/${prime}`]
    .join("\n");
};

// ── Neji (near-equal JI) ──────────────────────────────────────────────────

export type NejiResult = {
  ratios: Rational[];
  // Largest absolute deviation from the equal division of the period, cents.
  maxDeviationCents: number;
};

// Quantize a prime-family scale toward equal steps of its period while every
// degree keeps denominator p. Each degree i picks the numerator nearest the
// ideal equal-step position (searching up to `maxShift` harmonics away),
// staying strictly increasing.
export const nejiQuantize = (
  prime: number,
  options: HarmonicSegmentOptions & { maxShift?: number } = {}
): NejiResult => {
  if (!isPrime(prime)) throw new Error(`${prime} is not a prime.`);
  const mode = Math.max(1, Math.floor(options.mode ?? 1));
  const maxShift = options.maxShift ?? 3;

  const from = mode * prime;
  const to = 2 * mode * prime;
  const stepCount = to - from;
  const stepCents = rationalToCents(rat(BigInt(to), BigInt(from))) / stepCount;

  const ratios: Rational[] = [];
  let worst = 0;
  let previous = from;

  for (let i = 1; i <= stepCount; i++) {
    if (i === stepCount) {
      ratios.push(rat(BigInt(to), BigInt(prime)));
      break;
    }

    const idealCents = i * stepCents;
    const lowBound = Math.max(previous + 1, from + i - maxShift);
    const highBound = Math.min(to - 1, from + i + maxShift);

    let bestNumerator = from + i;
    let bestDeviation = Infinity;
    for (let candidate = lowBound; candidate <= highBound; candidate++) {
      const deviation = Math.abs(
        rationalToCents(rat(BigInt(candidate), BigInt(from))) - idealCents
      );
      if (deviation < bestDeviation) {
        bestDeviation = deviation;
        bestNumerator = candidate;
      }
    }

    worst = Math.max(worst, bestDeviation);
    previous = bestNumerator;
    ratios.push(rat(BigInt(bestNumerator), BigInt(prime)));
  }

  return { ratios, maxDeviationCents: worst };
};

// ── Gestalt analysis ──────────────────────────────────────────────────────

export type GestaltEntry = {
  ratio: Rational;
  // Denominator after reduction: the prime family this interval belongs to.
  familyDenominator: bigint;
  breaksFamily: boolean;
};

export type GestaltReport = {
  dominantDenominator: bigint;
  entries: GestaltEntry[];
  blended: number;
  broken: number;
};

// Analyze a chord voiced as intervals above a primodal tonic. Intervals whose
// reduced denominator matches the reference family blend into the shared
// gestalt; others introduce a competing identity. The reference defaults to
// the most common denominator in the chord.
export const chordGestaltReport = (
  ratios: Rational[],
  options: { familyDenominator?: bigint } = {}
): GestaltReport => {
  if (ratios.length === 0) throw new Error("A chord needs at least one interval.");

  let dominantDenominator = options.familyDenominator ?? ratios[0].d;

  if (options.familyDenominator === undefined) {
    const counts = new Map<bigint, number>();
    for (const { d } of ratios) counts.set(d, (counts.get(d) ?? 0) + 1);
    for (const [denominator, count] of counts) {
      const bestCount = counts.get(dominantDenominator)!;
      if (count > bestCount || (count === bestCount && denominator < dominantDenominator)) {
        dominantDenominator = denominator;
      }
    }
  }

  const entries: GestaltEntry[] = ratios.map((ratio) => ({
    ratio,
    familyDenominator: ratio.d,
    breaksFamily: ratio.d !== dominantDenominator,
  }));

  return {
    dominantDenominator,
    entries,
    blended: entries.filter((entry) => !entry.breaksFamily).length,
    broken: entries.filter((entry) => entry.breaksFamily).length,
  };
};
