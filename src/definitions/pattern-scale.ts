import { parsePattern, stepDeltasToScale, patternWalk } from "./interval-pattern";
import { pitchClassNumbersFromIntervals } from "./scale-builder";
import type { PitchClass, Note, PatternScaleDefinition, PitchName } from "./types";

/**
 * Build a complete pattern scale by running the full pipeline:
 * 1. Parse the interval pattern string into step deltas
 * 2. Convert deltas to intervals/period (for badge coloring + "Intervals" display)
 * 3. Walk the pattern across the fretboard span
 * 4. Map walk offsets to Note[] anchored at the root pitch on the fretboard
 */
export function buildPatternScale(
  input: string,
  rootPitchName: PitchName,
  edo: number,
  noteNames: PitchName[],
  notes: Note[],
  spanSteps: number
): PatternScaleDefinition {
  const rootNoteName = rootPitchName.replace(/\d/, "") as PitchClass;
  const pitchClassNames = notes.map((note) => note.pitchClass);

  const deltas = parsePattern(input, edo);
  const { intervals, period } = stepDeltasToScale(deltas, edo);
  const walk = patternWalk(deltas, spanSteps);

  const rootIndex = noteNames.indexOf(rootPitchName);
  const uniqueOffsets = Array.from(new Set(walk)).sort((a, b) => a - b);
  const NoteConstructor = notes[0]?.constructor as { new (p: PitchName): Note };
  const scaleNotes = uniqueOffsets
    .map((offset) => noteNames[rootIndex + offset])
    .filter((pitchName): pitchName is PitchName => Boolean(pitchName))
    .map((pitchName) => new NoteConstructor(pitchName));

  return {
    notes: scaleNotes,
    period,
    intervals,
    degrees: intervals.length,
    rootNoteName,
    deltas,
    walk,
    pitchClassNumbers: pitchClassNumbersFromIntervals(
      intervals,
      rootNoteName,
      pitchClassNames
    ),
  };
}
