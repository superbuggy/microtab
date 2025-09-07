<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePitchDistance } from '../state/usePitchDistance';

const { nearestNote, centsToNearest } = usePitchDistance();

const size = 4;
const maxCellHeight = 100;
const height = size * maxCellHeight;
const cellHeight = (cells: number) => height / cells
const direction = computed(()=>centsToNearest.value ? (centsToNearest.value > 0 ? -1 : 1) : 0);
const speed = computed(()=>centsToNearest.value ? Math.min(5, Math.max(0.5, Math.abs(centsToNearest.value) / 10)) : 2);
const seconds = computed(()=>`${speed.value}s`);
const centsDifference = computed(() => 
  centsToNearest.value === null 
    ? false 
    :centsToNearest.value > 0 
      ? `+${centsToNearest.value}` 
      : `${centsToNearest.value}`
); 



</script>
<template>
  <div class="wrap-container">
    <svg
      v-for="(_, i) in Array.from({ length: 2 })"
      :key="i"
      :viewBox="`0 0 ${height} ${height}`"
      :width="height"
      :class="`strobe-${0}`"
      :height="height"
    >
      <g
        v-for="(_, col) in Array.from({ length: size })"
        :key="col"
      >
        <rect
          v-for="(_, cell) in Array.from({ length: 2 ** (col + 2) })"
          :key="cell"
          :x="col * maxCellHeight"
          :y="cell * cellHeight(2 ** (col + 2))"
          :width="maxCellHeight"
          :fill="cell % 2 ? '#DDD' : '#000'"
          :height="cellHeight(2 ** (col + 2))"
        />

      </g>
    </svg>
  </div>
  <p v-if="nearestNote">{{ nearestNote?.name }} <span v-if="centsDifference"> {{ centsDifference }}cents</span></p>
</template>

<style scoped>
.wrap-container {
  overflow: hidden;
  /* Hide overflow during animation */
  width: 400px;
  height: 400px;
  padding: 0;
  margin: 0;
  line-height: 0;
}

svg {
  padding: 0;
  margin: 0;
  animation: slide-wrap-0 v-bind('seconds') linear infinite;
  /* animation: slide-wrap-0 2s linear infinite; */
}
svg.strobe-1 {
  animation: slide-wrap-0 3s linear infinite;
}

@keyframes slide-wrap-0 {
  0% {
    transform: translateY(0px);
  }

  100% {
    transform: translateY(calc(v-bind('direction') * 400px));
  }
}
@keyframes slide-wrap-1 {
  0% {
    transform: translateY(0px);
  }

  100% {
    transform: translateY(-400px);
  }
}
</style>