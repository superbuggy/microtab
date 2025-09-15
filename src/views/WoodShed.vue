<script setup lang="ts">
import FretBoard from "@/components/FretBoard/FretBoard.vue";
import PitchDetector from "@/components/PitchDetector.vue";
</script>

<template>
  <Suspense>
    <FretBoard />
  </Suspense>
  <Suspense>
    <PitchDetector />
  </Suspense>
</template>
