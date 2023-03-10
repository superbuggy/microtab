import { ref, computed } from "vue";
import { scaleNames, scalesFor } from "../definitions/scales";
import { useTemperament } from "./temperament";

const { distanceBetweenNotes, noteNames } = useTemperament();

const DEFAULT_STRING_QUANTITY = 6;
const DEFAULT_OCTAVE_DIVISONS = 24;
const TUNING = ["B1", "E2", "A2", "D3", "F#3", "B3"];
const stringQuantity = ref(DEFAULT_STRING_QUANTITY);
const divisonsPerOctave = ref(DEFAULT_OCTAVE_DIVISONS);
const stringNumbers = Array.from({ length: stringQuantity.value }).map(
  (_, index, { length }) => length - index
);
const tuning = ref(
  Object.fromEntries(
    stringNumbers.map((stringNumber, index) => [
      `string${stringNumber}`,
      TUNING[index],
    ])
  )
);

const lowestNote = tuning.value[`string${stringNumbers[0]}`];
const scales = scalesFor(lowestNote.replace(/\d/, ""));
const selectedScaleName = ref("Ionian");
const selectedScale = computed(() => scales[selectedScaleName.value]);
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
          startingNoteNameIndex + noteNames.indexOf(lowestNote) <=
            note.absolutePitchNumber &&
          note.absolutePitchNumber <=
            endingNoteNameIndex + noteNames.indexOf(lowestNote)
      )
      .map((note) => ({
        note,
        fretNumber:
          note.absolutePitchNumber -
          noteNames.indexOf(lowestNote) -
          startingNoteNameIndex,
      }));
  };

  const selectNotesPerString = (perString) => {
    notesPerString.value = perString === "All" ? null : Number(perString);
  };

  const selectScale = (scaleName) => {
    selectedScaleName.value = scaleName;
  };

  const fretboardScale = computed(() => {
    const guitar = initializedGuitarNotes();
    for (const stringName in guitar) {
      const stringRootNote = tuning.value[stringName];
      let offset = distanceBetweenNotes(lowestNote, stringRootNote);
      const previousStringName = stringName.replace(/\d/, (n) => +n + 1);

      let distanceBetweenStrings = guitar[previousStringName]
        ? distanceBetweenNotes(tuning.value[previousStringName], stringRootNote)
        : 0;
      const stringScale = scaleForGuitar(offset, offset + 48);
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

  const frettedNotes = computed(() => fretboardScale.value);

  selectScale(selectedScaleName.value);

  return {
    stringQuantity,
    divisonsPerOctave,
    tuning,
    stringNumbers,
    frettedNotes,
    scaleNames,
    selectScale,
    selectedScaleName,
    selectedScale,
    notesPerString,
    selectNotesPerString,
    // updateStringQuantity,
    // updatedivisonsPerOctave,
  };
}
