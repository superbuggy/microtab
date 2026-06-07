import { sum } from "../helpers";
import type { PitchClass, Note, ScaleDefinition } from "./types";

// ── Pure scale builder (no Vue dependencies) ─────────────────────────

/**
 * Generate the notes of a scale given its interval pattern and root.
 * Walks up the temperament's note list yielding Note objects.
 */
export function* generateScale(
  intervals: number[],
  rootNoteName: PitchClass,
  pitchClassNames: string[],
  notes: Note[]
): Generator<Note> {
  const startingIndex = pitchClassNames.indexOf(rootNoteName);
  const endIndex = notes.length - 1;
  let pitchCount = 0;
  let noteIndex = startingIndex;

  while (pitchCount + startingIndex <= endIndex) {
    if (!notes[noteIndex]) break;
    yield notes[noteIndex];
    noteIndex += intervals[pitchCount % intervals.length];
    ++pitchCount;
  }
}

/**
 * Compute pitch-class numbers from an interval pattern, starting at the
 * root's index in the temperament's pitch-class list.
 */
export function pitchClassNumbersFromIntervals(
  intervals: number[],
  rootNoteName: PitchClass,
  pitchClassNames: string[]
): number[] {
  return intervals.reduce(
    (acc, interval) => {
      acc.push(interval + (acc.at(-1) as number));
      return acc;
    },
    [rootNoteName ? pitchClassNames.indexOf(rootNoteName) : 0]
  );
}

/**
 * Build all built-in scales for a given temperament, keyed by scale name.
 * Takes explicit context so it can be called from tests without Vue.
 */
export function buildScalesForTemperament(
  intervallicDistances: Record<string, number[]>,
  rootNoteName: PitchClass,
  pitchClassNames: string[],
  notes: Note[]
): Record<string, ScaleDefinition> {
  return Object.fromEntries(
    Object.entries(intervallicDistances).map(([scaleName, intervals]) => [
      scaleName,
      {
        notes: Array.from(generateScale(intervals, rootNoteName, pitchClassNames, notes)),
        period: sum(intervals),
        intervals,
        degrees: intervals.length,
        rootNoteName,
        pitchClassNumbers: pitchClassNumbersFromIntervals(
          intervals,
          rootNoteName,
          pitchClassNames
        ),
      },
    ])
  );
}
