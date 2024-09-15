import { ref } from "vue";

const TUNING = ref(["A1", "D2", "G2", "C3", "E3", "A3"]);
export function useTuning () {
  return { TUNING }
}