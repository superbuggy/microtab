import { ref } from "vue";

export type BoardMode = "fretted" | "fretless";

const boardMode = ref<BoardMode>("fretted");
const shouldShow12TETFrets = ref(false);

export function useFretBoardControls() {
  return { boardMode, shouldShow12TETFrets };
}
