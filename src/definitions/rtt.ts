// Regular Temperament Theory engine: comma lists -> mappings -> tunings.
//
// A temperament is defined by the commas it tempers out. Its mapping assigns
// each prime a combination of generators; every just interval's monzo then
// maps to a step vector whose dot product with the generator tunings gives its
// tempered size in cents. Tunings are computed either as POTE (pure octaves,
// Tenney-weighted error minimized) or CTE (commas tuned to exactly zero).

import {
  rat,
  ratioToMonzo,
  type Monzo,
  type Rational,
} from "./scale-input";
import {
  constrainedLeastSquares,
  leastSquares,
  matVec,
  nullspaceOverQ,
  primitiveIntegerVector,
  transpose,
  type Matrix,
} from "./linalg";

// ── Comma list parsing ───────────────────────────────────────────────────

// Accepts ratios separated by commas, whitespace or newlines: "81/80 50/49".
export const parseCommaList = (text: string): Rational[] => {
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) throw new Error("Comma list is empty.");

  return tokens.map((token) => {
    if (token.includes("/")) {
      const [n, d] = token.split("/");
      return rat(BigInt(n), BigInt(d));
    }
    return rat(BigInt(token));
  });
};

const monzoDimension = (monzos: Monzo[]): number =>
  Math.max(0, ...monzos.flatMap((monzo) => Object.keys(monzo).map(Number))) + 1;

export const monzoToVector = (monzo: Monzo, dimension: number): number[] =>
  Array.from({ length: dimension }, (_, index) => monzo[index] ?? 0);

// ── Mapping from commas ──────────────────────────────────────────────────

// Integer mapping (rows = generators, columns = primes) spanning the nullspace
// of the comma monzo matrix. Generator order follows the reduced basis and is
// canonical for the presets; custom comma lists get a valid but possibly
// non-canonical basis.
export const mappingFromCommaMonzos = (
  monzos: Monzo[]
): { mapping: Matrix; primeCount: number } => {
  if (monzos.length === 0) throw new Error("No commas given.");
  const primeCount = monzoDimension(monzos);

  const commaMatrix = monzos.map((monzo) => monzoToVector(monzo, primeCount));
  const rationalBasis = nullspaceOverQ(commaMatrix, primeCount);

  const integerBasis = rationalBasis
    .map(primitiveIntegerVector)
    .filter((vector): vector is number[] => vector !== null);

  if (integerBasis.length === 0) {
    throw new Error("Commas leave no valid mapping.");
  }

  // Rows are generators: transpose of the nullspace basis.
  return { mapping: transpose(integerBasis), primeCount };
};

export const monzosFromRationals = (rationals: Rational[]): Monzo[] =>
  rationals.map((rational) => {
    const monzo = ratioToMonzo(rational);
    if (!monzo) throw new Error("Comma exceeds the supported prime limit.");
    return monzo;
  });

export type Mapping = {
  name: string;
  commas: Rational[];
  // rows = generators (first row is the period), columns = primes
  mapping: Matrix;
};

// Preset temperaments with verified canonical mappings. Each mapping sends
// its comma list to exactly zero steps (asserted in tests).
const buildPreset = (name: string, commaText: string, mapping: Matrix): Mapping => ({
  name,
  commas: parseCommaList(commaText),
  mapping,
});

export const TEMPERAMENT_PRESETS: Mapping[] = [
  // Meantone (5-limit): fifths ~696.6c, major thirds near 5/4
  buildPreset("Meantone (5-limit)", "81/80", [
    [1, 1, 0],
    [0, 1, 4],
  ]),
  // Meantone extended to the 7-limit
  buildPreset("Meantone septimal", "81/80 126/125", [
    [1, 1, 0, -3],
    [0, 1, 4, 10],
  ]),
];

// ── Tempering ────────────────────────────────────────────────────────────

// Step vector of a monzo through the mapping: one entry per generator.
export const temperedSteps = (mapping: Matrix, monzo: Monzo, primeCount?: number): number[] => {
  const dimension = primeCount ?? monzoDimension([monzo]);
  const vector = monzoToVector(monzo, Math.max(dimension, mapping[0]?.length ?? 0));
  return matVec(mapping, vector);
};

export const temperedCentsOfMonzo = (
  mapping: Matrix,
  generatorCents: number[],
  monzo: Monzo
): number => {
  const steps = temperedSteps(mapping, monzo);
  return steps.reduce((sum, step, g) => sum + step * generatorCents[g], 0);
};

// ── Tuning computation ───────────────────────────────────────────────────

const PRIME_NUMBERS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47,
  53, 59, 61, 67, 71];

type TuningInput = {
  mapping: Matrix;
  commas: Rational[];
};

// Tenney-weighted least-squares objective over the primes themselves: each
// prime's tempered size should approach its just size. (A temperament's own
// commas vanish for every tuning, so they carry no tuning information.)
const primeObjective = (mapping: Matrix) => {
  const primeCount = mapping[0]?.length ?? 0;
  const periodCents = 1200;

  const rows: Matrix = [];
  const targets: number[] = [];
  const weights: number[] = [];

  for (let p = 0; p < primeCount; p++) {
    const stepContributions = mapping.map((row) => row[p]);
    const jip = 1200 * Math.log2(PRIME_NUMBERS[p]);
    rows.push(stepContributions.slice(1));
    targets.push(jip - stepContributions[0] * periodCents);
    weights.push(1 / PRIME_NUMBERS[p]);
  }

  return {
    rows: rows.map((row, i) => row.map((value) => value * weights[i])),
    targets: targets.map((value, i) => value * weights[i]),
  };
};

// Hard equality constraints from the commas (CTE): each comma must land on
// exactly zero cents. Rows with no free-generator contribution are dropped —
// they hold for every tuning.
const commaConstraints = ({ mapping, commas }: TuningInput) => {
  const rows: Matrix = [];
  const targets: number[] = [];
  const periodCents = 1200;

  for (const comma of commas) {
    const monzo = ratioToMonzo(comma);
    if (!monzo) throw new Error("Comma exceeds the supported prime limit.");
    const steps = temperedSteps(mapping, monzo, mapping[0].length);
    const freeRow = steps.slice(1);
    if (freeRow.every((value) => Math.abs(value) < 1e-9)) continue;
    rows.push(freeRow);
    targets.push(-steps[0] * periodCents);
  }
  return { rows, targets };
};

// Generator tunings in cents. The period generator is always held pure at
// 1200 cents (pure octaves); remaining generators minimize the Tenney-weighted
// prime error (POTE).
export const poteGenerators = ({ mapping }: TuningInput): number[] => {
  const generatorCount = mapping.length;
  const tunings = new Array<number>(generatorCount).fill(0);
  tunings[0] = 1200;
  if (generatorCount === 1) return tunings;

  const { rows, targets } = primeObjective(mapping);
  const solution = leastSquares(rows, targets);
  if (!solution) return tunings;

  for (let g = 1; g < generatorCount; g++) tunings[g] = solution[g - 1];
  return tunings;
};

// CTE: commas tuned to exactly zero (when the constraints allow it), any
// remaining freedom spent minimizing the Tenney-weighted prime error.
export const cteGenerators = ({ mapping, commas }: TuningInput): number[] | null => {
  const generatorCount = mapping.length;
  const fallback = poteGenerators({ mapping, commas });
  if (generatorCount === 1 || commas.length === 0) return fallback;

  const { rows, targets } = commaConstraints({ mapping, commas });
  if (rows.length === 0) return fallback;

  const objective = primeObjective(mapping);
  const solution = constrainedLeastSquares(
    objective.rows,
    objective.targets,
    rows,
    targets
  );
  if (!solution) return null;

  const tunings = new Array<number>(generatorCount).fill(0);
  tunings[0] = 1200;
  for (let g = 1; g < generatorCount; g++) tunings[g] = solution[g - 1];
  return tunings;
};

// ── Scale integration ────────────────────────────────────────────────────

import type { TiledScale } from "./ratio-scale";

// Replace exact-ratio degrees of a tiled scale with their tempered sizes.
// Cents-only degrees are left untouched; labels/colors carry through. The
// period generator is re-expressed per scale period so guides stay inside the
// fretboard span.
export const temperTiledScale = (
  tiled: TiledScale,
  mapping: Matrix,
  generatorCents: number[]
): TiledScale => ({
  ...tiled,
  degrees: tiled.degrees.map((degree) => {
    if (!degree.pitch.ratio) return degree;
    const monzo = ratioToMonzo(degree.pitch.ratio);
    if (!monzo) return degree;

    const absoluteTempered = temperedCentsOfMonzo(mapping, generatorCents, monzo);
    return {
      ...degree,
      pitch: {
        cents: absoluteTempered - degree.period * generatorCents[0],
        ratio: null,
      },
    };
  }),
});
