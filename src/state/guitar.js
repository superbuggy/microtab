import { ref } from "vue";
import { scaleNames, scaleGenerator } from "../definitions/scales";
import { useTemperament } from "./temperament";

const { distanceBetweenNotes, noteNames } = useTemperament();

const DEFAULT_STRING_QUANTITY = 6;
const DEFAULT_OCTAVE_DIVISONS = 24;
const TUNING = ["B1", "E2", "A2", "D3", "F#3", "B3"];

export function useGuitar() {
  const stringQuantity = ref(DEFAULT_STRING_QUANTITY);
  const selectedScale = ref("Ionian");
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

  const initializedGuitarNotes = () =>
    Object.fromEntries(
      stringNumbers.map((stringNumber) => [`string${stringNumber}`, []])
    );

  const frettedNotes = ref(initializedGuitarNotes());

  const lowestNote = tuning.value[`string${stringNumbers[0]}`];
  const highestNote =
    noteNames[
      noteNames.findIndex(
        (noteName) => noteName === tuning.value[`string${stringNumbers.at(-1)}`]
      ) + 48
    ];
  const scaleForGuitar = (
    scaleName,
    startingNoteNameIndex,
    endingNoteNameIndex
  ) => {
    return Array.from(
      scaleGenerator(
        scaleName,
        noteNames,
        noteNames.indexOf(lowestNote),
        noteNames.indexOf(highestNote)
      )
    )
      .filter((pitchNumber) => {
        // console.log(
        //   startingNoteNameIndex, pitchNumber, noteNames.indexOf(lowestNote),pitchNumber - noteNames.indexOf(lowestNote)
        // );

        return (
          startingNoteNameIndex + noteNames.indexOf(lowestNote) <=
            pitchNumber &&
          pitchNumber <= endingNoteNameIndex + noteNames.indexOf(lowestNote)
        );
      })
      .map(
        (absolutePitchNumber) =>
          absolutePitchNumber -
          noteNames.indexOf(lowestNote) -
          startingNoteNameIndex
      );
  };

  const notesPerString = ref(3);

  const selectNotesPerString = (perString) => {
    notesPerString.value = perString === "All" ? null : Number(perString);
    console.log(notesPerString.value)
    computeNotes();
  };

  const selectScale = (scaleName) => {
    selectedScale.value = scaleName;
    computeNotes();
  };
  const computeNotes = () => {
    const fretboardScales = Object.fromEntries(
      scaleNames.map((scaleName) => {
        const guitar = initializedGuitarNotes();
        for (const stringName in guitar) {
          const stringRootNote = tuning.value[stringName];
          let offset = distanceBetweenNotes(lowestNote, stringRootNote);
          const previousStringName = stringName.replace(/\d/, (n) => +n + 1);

          let distanceBetweenStrings = guitar[previousStringName]
            ? distanceBetweenNotes(
                tuning.value[previousStringName],
                stringRootNote
              )
            : 0;
          const stringScale = scaleForGuitar(scaleName, offset, offset + 48);

          guitar[stringName] = notesPerString.value
            ? stringScale
                .filter((fretNumber) => {
                  if (!guitar[previousStringName]) return true;
                  if (notesPerString.value) {
                    return (
                      guitar[previousStringName].at(-1) <
                      fretNumber + distanceBetweenStrings
                    );
                  }
                })
                .slice(0, notesPerString.value)
            : stringScale;
        }
        return [scaleName, guitar];
      })
    );
    frettedNotes.value = fretboardScales[selectedScale.value];
    console.log(selectedScale.value, frettedNotes.value);
  };

  selectScale(selectedScale.value);

  // function updateStringQuantity(quantity) {
  //   stringQuantity.value = quantity;
  // }
  // function updatedivisonsPerOctave(quantity) {
  //   divisonsPerOctave.value = quantity;
  // }

  return {
    stringQuantity,
    divisonsPerOctave,
    tuning,
    stringNumbers,
    frettedNotes,
    scaleNames,
    selectScale,
    selectedScale,
    notesPerString,
    selectNotesPerString,
    // updateStringQuantity,
    // updatedivisonsPerOctave,
  };
}
