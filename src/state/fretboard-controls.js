import { ref } from "vue";

const shouldShow12TETFrets = ref(false);
const areFretColorsInverted = ref(false);
export function useFretBoardControls() {
  return { shouldShow12TETFrets, areFretColorsInverted };
}
