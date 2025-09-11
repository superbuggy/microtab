import { ref } from "vue";
import { PitchName } from "../definitions/types";

// const TUNING = ref<PitchName[]>(["A1", "D2", "G2", "C3", "E3", "A3"]);
const TUNING = ref<PitchName[]>(["G#1", "C#2", "F#2", "B2", "D#3", "G#3"]);

export function useTuning () {
  return { TUNING }
}