import { ref, watch } from "vue";

import { getBoardMode, setBoardMode } from "@/effects/localStorage";

export type BoardMode = "fretted" | "fretless";

const initialMode: BoardMode =
  getBoardMode() === "fretless" ? "fretless" : "fretted";

const boardMode = ref<BoardMode>(initialMode);
const shouldShow12TETFrets = ref(false);

watch(boardMode, (mode) => setBoardMode(mode));

export function useFretBoardControls() {
  return { boardMode, shouldShow12TETFrets };
}
