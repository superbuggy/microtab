import { watch, ref, computed } from "vue";
import { useScales } from "../definitions/scales";
import { useTemperament } from "./temperament";
import { useTuning } from "./tuning";
const { TUNING } = useTuning();

const { scaleNames, scalesFor } = useScales();
const { distanceBetweenNotes, noteNames, divisionsPerOctave } =
  useTemperament();

const DEFAULT_STRING_QUANTITY = 6;
// const TUNING = ["B1", "E2", "A2", "D3", "F#3", "B3"];

const stringQuantity = ref(DEFAULT_STRING_QUANTITY);
const stringNumbers = Array.from({ length: stringQuantity.value }).map(
  (_, index, { length }) => length - index
);
const tuning = ref(
  Object.fromEntries(
    stringNumbers.map((stringNumber, index) => [
      `string${stringNumber}`,
      TUNING.value[index],
    ])
  )
);
const startingFromFret = ref(0);
const lowestNote = tuning.value[`string${stringNumbers[0]}`];
const scales = ref(scalesFor(lowestNote.replace(/\d/, "")));
const selectedScaleName = ref("Ionian");

const selectedScale = computed(() => {
  console.log(scales.value, selectedScaleName.value);
  return scales.value[selectedScaleName.value];
});

const defaultScalesPerTet = {
  16: "Rank 3 Minor [7] A",
  17: "Otonal 17",
  24: "Ionian",
};

watch(divisionsPerOctave, (perOctave) => {
  selectedScaleName.value = defaultScalesPerTet[perOctave];
  scales.value = scalesFor(lowestNote.replace(/\d/, ""));

  console.log(scales.value);
});

const notesPerString = ref(3);

export function useGuitar() {
  const initializedGuitarNotes = () =>
    Object.fromEntries(
      stringNumbers.map((stringNumber) => [`string${stringNumber}`, []])
    );

  const scaleForGuitar = (startingNoteNameIndex, endingNoteNameIndex) => {
    return selectedScale.value.notes
      .filter(
        (note) =>
          startingNoteNameIndex + noteNames.value.indexOf(lowestNote) <=
            note.absolutePitchNumber &&
          note.absolutePitchNumber <=
            endingNoteNameIndex + noteNames.value.indexOf(lowestNote)
      )
      .map((note) => ({
        note,
        fretNumber:
          note.absolutePitchNumber -
          noteNames.value.indexOf(lowestNote) -
          startingNoteNameIndex,
      }));
  };
  // const scaleForGuitar = (startingNoteNameIndex, endingNoteNameIndex) => {
  //   return selectedScale.value.notes
  //     .filter(
  //       (note) =>
  //         startingNoteNameIndex + noteNames.value.indexOf(lowestNote) <=
  //           note.absolutePitchNumber &&
  //         note.absolutePitchNumber <=
  //           endingNoteNameIndex + noteNames.value.indexOf(lowestNote)
  //     )
  //     .reduce((stringNotes, note) => {
  //       const fretNumber =
  //         note.absolutePitchNumber -
  //         noteNames.value.indexOf(lowestNote) -
  //         startingNoteNameIndex;
  //       stringNotes[fretNumber] = note;
  //       return stringNotes;
  //     }, {});
  // };

  const selectNotesPerString = (perString) => {
    notesPerString.value = perString === "All" ? null : Number(perString);
  };

  const selectScale = (scaleName) => {
    selectedScaleName.value = scaleName;
  };

  const fretboardScale = computed(() => {
    const guitar = initializedGuitarNotes();
    for (const stringName in guitar) {
      const startingNoteOnString = tuning.value[stringName];
      let offset = distanceBetweenNotes(lowestNote, startingNoteOnString);
      const previousStringName = stringName.replace(/\d/, (n) => +n + 1);

      let distanceBetweenStrings = guitar[previousStringName]
        ? distanceBetweenNotes(
            tuning.value[previousStringName],
            startingNoteOnString
          )
        : 0;
      const stringScale = scaleForGuitar(offset, offset + 48).map(
        ({ note, fretNumber }) => ({
          note,
          fretNumber: fretNumber + startingFromFret.value,
        })
      );
      guitar[stringName] = notesPerString.value
        ? stringScale
            .filter(({ fretNumber }) => {
              if (!guitar[previousStringName]) return true;
              if (notesPerString.value) {
                return (
                  guitar[previousStringName].at(-1).fretNumber <
                  fretNumber + distanceBetweenStrings
                );
              }
            })
            .slice(0, notesPerString.value)
        : stringScale;
    }
    return guitar;
  });

  const scaleNotesOnStrings = computed(() => fretboardScale.value);

  selectScale(selectedScaleName.value);

  return {
    stringQuantity,
    divisionsPerOctave,
    tuning,
    stringNumbers,
    scaleNotesOnStrings,
    scaleNames,
    selectScale,
    selectedScaleName,
    selectedScale,
    notesPerString,
    selectNotesPerString,
    startingFromFret,
  };
}
