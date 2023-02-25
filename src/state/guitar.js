import { ref } from "vue";
import { scales } from "../definitions/scales";
import { useTemperament } from "./temperament";

const { distanceBetweenNotes } = useTemperament();

const DEFAULT_STRING_QUANTITY = 6;
const DEFAULT_OCTAVE_DIVISONS = 24;
const TUNING = ["B1", "E2", "A2", "D3", "F#3", "B3"];

export function useGuitar() {
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

  const initializedGuitarNotes = () =>
    Object.fromEntries(
      stringNumbers.map((stringNumber) => [`string${stringNumber}`, []])
    );

  const frettedNotes = ref(initializedGuitarNotes());

  const scaleNames = Object.keys(scales);

  const adaptedScales = Object.fromEntries(
    Object.entries(scales).map(([scaleName, scale]) => {
      const rootNote = "B1";
      const guitar = initializedGuitarNotes();
      for (const stringName in guitar) {
        const note = tuning.value[stringName];
        const distance = distanceBetweenNotes(rootNote, note);
        const transposedScale = scale.map((step) => step + distance);
        guitar[stringName] = transposedScale;
      }
      return [scaleName, guitar];
    })
  );

  function selectScale(scaleName) {
    frettedNotes.value = adaptedScales[scaleName];
    console.log(scaleName, frettedNotes.value)
  }
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
    // updateStringQuantity,
    // updatedivisonsPerOctave,
  };
}
