// Harmonic-series relationships between the constituent tones of a chord
// voiced above the detected root (the "current sound"). Pure domain code:
// the JI subgroup, the common-denominator (otonal) view, and the root
// partials each tone shares. Feeds the chord builder in
// state/useChordBuilder.

import {
  formatRatio,
  gcdBig,
  PRIMES,
  ratioToMonzo,
  scaleFromText,
  type Rational,
} from "./scale-input";

// ── Subgroup ──────────────────────────────────────────────────────────────

export type Subgroup = {
  primes: bigint[];
  label: string;
};

// The JI subgroup spanned by the ratios: every prime appearing in any
// factorization, e.g. {5/4, 3/2, 7/4} -> 2.3.5.7. Primes beyond the
// factorization table are ignored here; the builder warns about them.
export const subgroupOf = (ratios: Rational[]): Subgroup => {
  const present = new Set<number>();
  for (const ratio of ratios) {
    if (ratio.n <= 0n) continue;
    const monzo = ratioToMonzo(ratio);
    if (!monzo) continue;
    for (const index of Object.keys(monzo)) present.add(Number(index));
  }
  const primes = [...present]
    .sort((a, b) => a - b)
    .map((index) => PRIMES[index]);
  return { primes, label: primes.map(String).join(".") };
};

// ── Common-denominator (otonal) view ───────────────────────────────────────

const lcmBig = (a: bigint, b: bigint): bigint => (a * b) / gcdBig(a, b);

export type CommonDenominatorChord = {
  // The shared denominator: the root sits on this harmonic of the virtual
  // fundamental 1/denominator.
  denominator: bigint;
  // Harmonic number of each input ratio, aligned with input order.
  toneHarmonics: bigint[];
  // Sorted unique harmonics including the root's own position.
  withRoot: bigint[];
  // e.g. "4:5:6:7"
  label: string;
};

// Voice the chord on a single harmonic series: over the LCM of the
// denominators, a tone n/d is harmonic n·(D/d), and the root itself is
// harmonic D. {5/4, 3/2, 7/4} -> 4:5:6:7 over /4.
export const commonDenominatorChord = (
  ratios: Rational[],
): CommonDenominatorChord => {
  let denominator = 1n;
  for (const { d } of ratios) denominator = lcmBig(denominator, d);

  const toneHarmonics = ratios.map(({ n, d }) => (n * denominator) / d);
  const withRoot = [...new Set([denominator, ...toneHarmonics])].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );

  return {
    denominator,
    toneHarmonics,
    withRoot,
    label: withRoot.join(":"),
  };
};

// ── Shared root partials ───────────────────────────────────────────────────

// A tone at n/d above the root coincides with the root's own harmonic series
// at every multiple of its (reduced) numerator: 5/4 shares the root's
// harmonics 5, 10, 15, ... — the partials where the two sounds physically
// overlap.
export const sharedRootPartials = (
  ratio: Rational,
  limit: number,
): number[] => {
  const numerator = Number(ratio.n);
  if (!Number.isSafeInteger(numerator) || numerator < 1) return [];
  const partials: number[] = [];
  for (let harmonic = numerator; harmonic <= limit; harmonic += numerator) {
    partials.push(harmonic);
  }
  return partials;
};

// ── Fusion columns ─────────────────────────────────────────────────────────

export type FusionColumn = {
  harmonic: number;
  // How many constituent tones share this root partial.
  toneCount: number;
};

// Root harmonics where two or more constituent tones overlap — the partials
// where tones fuse with each other, not just with the root.
export const fusionColumns = (
  ratios: Rational[],
  limit: number,
): FusionColumn[] => {
  const counts = new Map<number, number>();
  for (const ratio of ratios) {
    for (const harmonic of sharedRootPartials(ratio, limit)) {
      counts.set(harmonic, (counts.get(harmonic) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, toneCount]) => toneCount >= 2)
    .map(([harmonic, toneCount]) => ({ harmonic, toneCount }))
    .sort((a, b) => a.harmonic - b.harmonic);
};

// ── Chord text parsing ─────────────────────────────────────────────────────

// The parser's last interval is the equave; a huge anchor guarantees that
// slot never swallows a tone, whatever the user types.
const EQUAVE_ANCHOR = "1000000/1";

export type ParsedTone = {
  ratio: Rational;
  cents: number;
  source: string;
};

export type ParsedChord = {
  // Ascending by cents; duplicates coalesced; the unison (the root itself,
  // i.e. the current sound) dropped.
  tones: ParsedTone[];
  warnings: string[];
};

// Parse chord text: each newline-separated line is one constituent tone —
// full Scale Workshop expressions (ratios, compositions, monzos, FJS) work.
// A line holding several values ("5/4 3/2 7/4") falls back to
// whitespace-separated tones. Exact non-rational pitches (cents, EDO steps)
// can't align partials and are skipped with a warning. Throws on hard syntax
// errors.
export const parseChordText = (text: string): ParsedChord => {
  const warnings: string[] = [];
  const byRatio = new Map<string, ParsedTone>();
  const errors: string[] = [];

  // Adds one tone from a single Scale Workshop expression; throws on syntax
  // errors, warns and skips values that aren't exact positive ratios.
  const addTone = (source: string) => {
    const degrees = scaleFromText(`${source}\n${EQUAVE_ANCHOR}`).degrees;
    if (degrees.length === 0) return; // unison: the root itself
    const { pitch } = degrees[0];
    if (pitch.ratio === null) {
      warnings.push(`Skipped "${source}" — not an exact ratio.`);
      return;
    }
    if (pitch.ratio.n <= 0n) {
      warnings.push(`Skipped "${source}" — ratios must be positive.`);
      return;
    }
    const tone: ParsedTone = {
      ratio: pitch.ratio,
      cents: pitch.cents,
      source,
    };
    const key = formatRatio(tone.ratio);
    if (!byRatio.has(key)) byRatio.set(key, tone);
  };

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    try {
      addTone(line);
    } catch {
      // Not one expression — treat the line as whitespace-separated tones.
      for (const token of line.split(/\s+/).filter(Boolean)) {
        try {
          addTone(token);
        } catch (error) {
          errors.push(`${(error as Error).message} (in "${token}")`);
        }
      }
    }
  }

  if (errors.length > 0) throw new Error(errors.join(" "));

  const tones = [...byRatio.values()].sort((a, b) => a.cents - b.cents);
  return { tones, warnings };
};
