import { scalarIntervallicDistances } from "./scalar-intervals";

const scaleFromIntervallicDistances = (steps, start = 0) =>
  steps.reduce(
    (builtScale, intervallicDistance) => {
      builtScale.push(intervallicDistance + builtScale.at(-1));
      return builtScale;
    },
    [start]
  );

export const scaleNames = Object.keys(scalarIntervallicDistances);

export function* scaleGenerator(
  scaleName,
  noteNames,
  startingNoteNameIndex,
  endingNoteNameIndex
) {
  let pitchCount = 0;
  let noteNameIndex = startingNoteNameIndex;
  const intervals = scalarIntervallicDistances[scaleName];
  while (pitchCount + startingNoteNameIndex <= endingNoteNameIndex) {
    if (!noteNames[noteNameIndex]) break;
    yield noteNameIndex;
    // yield {
    //   absolutePitchNumber: noteNameIndex,
    //   noteName: noteNames[noteNameIndex],
    // };
    noteNameIndex += intervals[pitchCount % intervals.length];
    ++pitchCount;
  }
}

const intervallicDistances = (pitchNumbers) =>
  pitchNumbers.slice(1).reduce(
    (intervals, pitchNumber, index) => {
      intervals.push(pitchNumber - pitchNumbers[index]);
      return intervals;
    },
    [pitchNumbers[0]]
  );

const compareCentsForEDO = (centsValues, edo) =>
  centsValues.map((i) => Math.round(i / (1200 / edo)) * (1200 / edo) - i);

const centsToEDO = (centsValues, edo) =>
  centsValues.map((i) => Math.round(i / (1200 / edo)));

const approxBohlenPierceCents = [
  0, 133.2, 301.8, 435.1, 582.5, 736.9, 884.4, 1017.0, 1165.0, 1319.4, 1466.9,
  1600.1, 1768.7, 1900,
];
const modifiedBohlenPierceCents = [
  0, 133.2, 301.8, 435.1, 590.2, 745.8, 884.4, 1035.0 /* neutral 7th */, 1165.0,
  1328.3, 1453.8, 1600.1, 1768.7, 1900,
];

const overTonePrimes = [0, 386, 702, 969, 551, 840, 105, 297, 1200].sort(
  (a, b) => a - b
); // octave reduced

const scales = {}; //TODO: Convert these

scales["Bohlen-Pierce 24 EDO Approximation"] = intervallicDistances(
  centsToEDO(approxBohlenPierceCents, 24)
);
scales["Bohlen-Pierce 24 EDO (Neutral 7th)"] = intervallicDistances(
  centsToEDO(modifiedBohlenPierceCents, 24)
);
scales["Prime Overtone 24 EDO"] = intervallicDistances(
  centsToEDO(overTonePrimes, 24)
);

// export const buildScales = Object.fromEntries(
//   Object.entries(scalarIntervallicDistances).map(([scaleName, intervals]) => [
//     scaleName,
//     // scaleFromIntervallicDistances(intervals),
//   ])
// );
