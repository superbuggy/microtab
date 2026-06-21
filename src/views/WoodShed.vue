<script setup lang="ts">
import StaffDisplay from "@/components/Staff/StaffDisplay.vue";
import FretBoard from "@/components/FretBoard/FretBoard.vue";
import PitchDetector from "@/components/PitchDetector.vue";
</script>

<template>
  <StaffDisplay />
  <Suspense>
    <FretBoard />
  </Suspense>
  <Suspense>
    <PitchDetector />
  </Suspense>
</template>
