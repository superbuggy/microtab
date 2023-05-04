import { computed } from "vue";
import { useTemperament } from "../state/temperament";
// import { scalarIntervallicDistances12EDO } from "./12-tet-scalar-intervals"
import { scalarIntervallicDistances16EDO } from "./16-tet-scalar-intervals";
import { scalarIntervallicDistances24EDO } from "./24-tet-scalar-intervals";
import { sum } from "../helpers";

const { chosenTemperamentName, notes, noteNames, pitchClassNames } =
  useTemperament();
export function useScales() {
  const intervallicDistancesForTemperaments = {
    // "12 TET": scalarIntervallicDistances12EDO,
    "16 TET": scalarIntervallicDistances16EDO,
    "24 TET": scalarIntervallicDistances24EDO,
  };
  const intervallicDistancesForChosenTemperament = computed(
    () => intervallicDistancesForTemperaments[chosenTemperamentName.value]
  );
  const scaleNames = computed(() =>
    Object.keys(intervallicDistancesForChosenTemperament.value)
  );

  const scalesFor = computed(
    () => (rootNoteName) =>
      Object.fromEntries(
        Object.entries(intervallicDistancesForChosenTemperament.value).map(
          ([scaleName, intervals]) => [
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
          ]
        )
      )
  );

  return {
    scaleNames,
    scalesFor,
  };
}

// TODO: This may leave out notes below the rootNote on the list of absolute pitches
function* scale(intervals, rootNoteName) {
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

function pitchClassNumbersFromIntervallicDistances(intervals, rootNoteName) {
  return intervals.reduce(
    (builtScale, intervallicDistance) => {
      builtScale.push(intervallicDistance + builtScale.at(-1));
      return builtScale;
    },
    [rootNoteName ? pitchClassNames.indexOf(rootNoteName) : 0]
  );
}
