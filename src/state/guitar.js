import { ref } from "vue";

const DEFAULT_STRING_QUANTITY = 6;
const DEFAULT_OCTAVE_DIVISONS = 24;

export function useGuitar() {
  const stringQuantity = ref(DEFAULT_STRING_QUANTITY);
  const divisonsPerOctave = ref(DEFAULT_OCTAVE_DIVISONS);

  // function updateStringQuantity(quantity) {
  //   stringQuantity.value = quantity;
  // }
  // function updatedivisonsPerOctave(quantity) {
  //   divisonsPerOctave.value = quantity;
  // }

  return {
    stringQuantity,
    divisonsPerOctave,
    // updateStringQuantity,
    // updatedivisonsPerOctave,
  };
}
