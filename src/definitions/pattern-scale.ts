import { parsePattern, stepDeltasToScale, patternWalk } from "./interval-pattern";
import { pitchClassNumbersFromIntervals } from "./scale-builder";
import type { PitchClass, Note, PatternScaleDefinition, PitchName } from "./types";

/**
 * Build a complete pattern scale by running the full pipeline:
 * 1. Parse the interval pattern string into step deltas
 * 2. Convert deltas to intervals/period (for badge coloring + "Intervals" display)
 * 3. Walk the pattern across the fretboard span
 * 4. Map walk offsets to Note[] via the temperament's note list
 */
export function buildPatternScale(
  input: string,
  rootNoteName: PitchClass,
  edo: number,
  pitchClassNames: string[],
  notes: Note[],
  spanSteps: number
): PatternScaleDefinition {
  // Step 1: Parse pattern into signed step deltas
  const deltas = parsePattern(input, edo);

  // Step 2: Convert deltas to interval/period for scale display
  const { intervals, period } = stepDeltasToScale(deltas, edo);

  // Step 3: Walk the pattern across the fretboard span
  const walk = patternWalk(deltas, spanSteps);

  // Step 4: Map walk offsets to Note objects
  const rootIndex = pitchClassNames.indexOf(rootNoteName);
  const uniqueOffsets = Array.from(new Set(walk)).sort((a, b) => a - b);
  const scaleNotes = uniqueOffsets
    .map((offset) => pitchClassNames[rootIndex + offset])
    .filter((pitchName): pitchName is PitchName => Boolean(pitchName))
    .map((pitchName) => new (notes[0]?.constructor as { new (p: PitchName): Note })(pitchName));

  return {
    notes: scaleNotes,
    period,
    intervals,
    degrees: intervals.length,
    rootNoteName,
    deltas,
    walk,
    pitchClassNumbers: pitchClassNumbersFromIntervals(intervals, rootNoteName, pitchClassNames),
  };
}
