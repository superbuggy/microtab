<script setup lang="ts">
import StaffDisplay from "@/components/Staff/StaffDisplay.vue";
import FretBoard from "@/components/FretBoard/FretBoard.vue";
import FretlessBoard from "@/components/FretBoard/FretlessBoard.vue";
import PitchDetector from "@/components/PitchDetector.vue";

import { useFretBoardControls } from "@/state/fretboard-controls";

const { boardMode } = useFretBoardControls();
</script>

<template>
  <div class="board-mode-toggle">
    <label>
      <input
        v-model="boardMode"
        type="radio"
        value="fretted"
      >
      Fretted
    </label>
    <label>
      <input
        v-model="boardMode"
        type="radio"
        value="fretless"
      >
      Fretless
    </label>
  </div>
  <StaffDisplay />
  <Suspense>
    <FretBoard v-if="boardMode === 'fretted'" />
    <FretlessBoard v-else />
  </Suspense>
  <Suspense>
    <PitchDetector />
  </Suspense>
</template>

<style scoped>
.board-mode-toggle {
  display: flex;
  gap: 1rem;
}
</style>
