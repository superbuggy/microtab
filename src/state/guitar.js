import { ref } from "vue";


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
    // updateStringQuantity,
    // updatedivisonsPerOctave,
  };
}
