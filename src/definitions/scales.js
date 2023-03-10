import { scalarIntervallicDistances } from "./scalar-intervals";
import { useTemperament } from "../state/temperament";
import { sum } from "../helpers";

const { notes, noteNames, pitchClassNames } = useTemperament();

const pitchClassNumbersFromIntervallicDistances = (intervals, rootNoteName) =>
  intervals.reduce(
    (builtScale, intervallicDistance) => {
      builtScale.push(intervallicDistance + builtScale.at(-1));
      return builtScale;
    },
    [rootNoteName ? pitchClassNames.indexOf(rootNoteName) : 0]
  );

export const scalesFor = (rootNoteName) =>
  Object.fromEntries(
    Object.entries(scalarIntervallicDistances).map(([scaleName, intervals]) => [
      scaleName,
      {
        notes: Array.from(scale(intervals, rootNoteName)),
        period: sum(intervals),
        intervals,
        degrees: intervals.length,
        rootNoteName,
        pitchClassNumbers: pitchClassNumbersFromIntervallicDistances(
          intervals,
          rootNoteName
        ),
      },
    ])
  );

// TODO: This may leave out notes below the rootNote on the list of absolute pitches
export function* scale(intervals, rootNoteName) {
  const startingNoteNameIndex = pitchClassNames.indexOf(rootNoteName);
  const endingNoteNameIndex = notes.length - 1;
  let pitchCount = 0;
  let noteNameIndex = startingNoteNameIndex;
  while (pitchCount + startingNoteNameIndex <= endingNoteNameIndex) {
    if (!noteNames[noteNameIndex]) break;
    yield notes[noteNameIndex];
    noteNameIndex += intervals[pitchCount % intervals.length];
    ++pitchCount;
  }
}

export const scaleNames = Object.keys(scalarIntervallicDistances);

