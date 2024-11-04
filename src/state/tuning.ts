import { ref } from "vue";
import { PitchName } from "../definitions/types";

const TUNING = ref<PitchName[]>(["A1", "D2", "G2", "C3", "E3", "A3"]);
export function useTuning () {
  return { TUNING }
}