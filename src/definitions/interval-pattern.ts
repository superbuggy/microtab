import { mod } from "../helpers";

// Interval names are defined once in cents (derived from 24-TET, where one step
// is 50 cents) and converted to whatever EDO is active by rounding to the
// nearest step. This lets neutral / super / sub intervals collapse sensibly in
// temperaments that have no quarter tones (e.g. 12-TET).
//
// The `S` (super) and `s` (sub) modifiers shift a base interval by one 24-TET
// step (±50 cents) and are handled at parse time, so only the unmodified base
// intervals need to live in this table.
export const INTERVAL_CENTS: Record<string, number> = {
  U: 0,
  m2: 100,
  n2: 150,
  M2: 200,
  m3: 300,
  n3: 350,
  M3: 400,
  d4: 400,
  P4: 500,
  A4: 600,
  d5: 600,
  P5: 700,
  m6: 800,
  n6: 850,
  M6: 900,
  m7: 1000,
  n7: 1050,
  M7: 1100,
  "8": 1200,
};

const SUPER_SUB_CENTS = 50; // one 24-TET step

const centsPerStep = (edo: number) => 1200 / edo;

// Resolve an interval *name* to cents, applying an optional leading S/s
// modifier. Returns null when the name is not recognized.
const intervalNameToCents = (name: string): number | null => {
  if (name in INTERVAL_CENTS) return INTERVAL_CENTS[name];

  const modifier = name[0];
  if (modifier === "S" || modifier === "s") {
    const base = name.slice(1);
    if (base in INTERVAL_CENTS) {
      const shift = modifier === "S" ? SUPER_SUB_CENTS : -SUPER_SUB_CENTS;
      return INTERVAL_CENTS[base] + shift;
    }
  }

  return null;
};

// Convert an interval name to a (signed) number of EDO steps in the active
// temperament. Returns null for unrecognized names.
export const intervalNameToSteps = (name: string, edo: number): number | null => {
  const cents = intervalNameToCents(name);
  if (cents === null) return null;
  return Math.round(cents / centsPerStep(edo));
};

const OPERATORS = new Set(["+", "-"]);

// Parse a whitespace-separated pattern of tokens into an array of signed step
// deltas measured in EDO steps of the active temperament. A token is an
// optional operator (`+` ascending, the default, or `-` descending) followed by
// a distance that is either an integer number of EDO steps or an interval name.
export const parsePattern = (input: string, edo: number): number[] => {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    throw new Error("Pattern is empty.");
  }

  return tokens.map((token) => {
    let rest = token;
    let sign = 1;
    if (OPERATORS.has(rest[0])) {
      sign = rest[0] === "-" ? -1 : 1;
      rest = rest.slice(1);
    }

    if (rest.length === 0) {
      throw new Error(`Token "${token}" is missing a distance.`);
    }

    // A purely numeric distance is interpreted as EDO steps in the active
    // temperament. This shadows the bare octave name "8" (use s8 / S8 or the
    // explicit step count for octaves), which keeps integer tokens unambiguous.
    if (/^\d+$/.test(rest)) {
      return sign * Number(rest);
    }

    const steps = intervalNameToSteps(rest, edo);
    if (steps === null) {
      throw new Error(`Unknown interval token "${token}".`);
    }
    return sign * steps;
  });
};

const MAX_CYCLES = 64; // guards against patterns that never close on the octave

export type PatternScaleShape = {
  pitchClasses: number[];
  intervals: number[];
  period: number;
};

// Walk the signed deltas cumulatively from the root: the first delta is measured
// from the root and each subsequent delta from the note the previous delta
// landed on. The pattern keeps repeating (continuing from the last note of the
// prior cycle) until the running offset lands back on an octave-equivalent of
// the root, collecting every octave-reduced pitch class it visits. The visited
// set is then expressed as a positive interval array that sums to one octave so
// the scale tiles at the octave like every other scale.
export const stepDeltasToScale = (
  deltas: number[],
  edo: number
): PatternScaleShape => {
  const pitchClasses = new Set<number>([0]);
  let offset = 0;

  for (let cycle = 0; cycle < MAX_CYCLES; cycle++) {
    for (const delta of deltas) {
      offset += delta;
      pitchClasses.add(mod(offset, edo));
    }
    if (mod(offset, edo) === 0) break;
  }

  const sorted = Array.from(pitchClasses).sort((a, b) => a - b);

  const intervals = sorted.map((pitchClass, index) => {
    const next = sorted[index + 1] ?? sorted[0] + edo;
    return next - pitchClass;
  });

  return { pitchClasses: sorted, intervals, period: edo };
};

// Walk the signed deltas cumulatively from the root (first delta from the root,
// each subsequent delta from the previous landed note) and keep repeating the
// pattern beyond the octave until the running offset covers `spanSteps`. Returns
// the ordered absolute step offsets from the root, clamped to the [0, spanSteps]
// range so callers can map them onto the fretboard. This is the literal played
// sequence; it is intentionally neither sorted nor octave-reduced.
export const patternWalk = (deltas: number[], spanSteps: number): number[] => {
  const walk = [0];
  let offset = 0;

  for (let cycle = 0; cycle < MAX_CYCLES && offset < spanSteps; cycle++) {
    for (const delta of deltas) {
      offset += delta;
      walk.push(offset);
    }
  }

  return walk.filter((step) => step >= 0 && step <= spanSteps);
};
