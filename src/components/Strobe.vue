<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { usePitchDistance } from '../state/usePitchDistance';

const { nearestNote, centsToNearest } = usePitchDistance();

const canvas = ref<HTMLCanvasElement>();

const size = 4;
const maxCellHeight = 100;
const height = size * maxCellHeight;
const cellHeight = (cells: number) => height / cells;
const direction = computed(() => centsToNearest.value ? (centsToNearest.value / Math.abs(centsToNearest.value)) : 0);
const speed = computed(() => !centsToNearest.value 
  ? 0
  : Math.abs(centsToNearest.value)
);

const centsDifference = computed(() =>
  centsToNearest.value === null
    ? false
    :centsToNearest.value > 0
      ? `+${centsToNearest.value}`
      : `${centsToNearest.value}`
);

let animationId: number;
let startTime: number;
let patternCanvas: HTMLCanvasElement;
let patternCtx: CanvasRenderingContext2D;

const createPatternCanvas = () => {
  patternCanvas = document.createElement('canvas');
  patternCanvas.width = height;
  patternCanvas.height = height * 2; // Double height for seamless wrapping
  patternCtx = patternCanvas.getContext('2d')!;

  // Draw pattern twice vertically for seamless wrapping
  for (let repeat = 0; repeat < 2; repeat++) {
    const offsetY = repeat * height;

    for (let col = 0; col < size; col++) {
      const cells = 2 ** (col + 2);
      const currentCellHeight = cellHeight(cells);

      for (let cell = 0; cell < cells; cell++) {
        const x = col * maxCellHeight;
        const y = cell * currentCellHeight + offsetY;

        patternCtx.fillStyle = cell % 2 ? '#DDD' : '#000';
        patternCtx.fillRect(x, y, maxCellHeight, currentCellHeight);
      }
    }
  }
};

const animate = (timestamp: number) => {
  if (!startTime) startTime = timestamp;

  const elapsed = timestamp - startTime;
  const duration = 15000 / speed.value;
  const progress = (elapsed % duration) / duration;

  // Calculate offset for seamless wrapping
  const offset = (progress * direction.value * height) % height;
  const sourceY = offset >= 0 ? offset : height + offset;

  if (canvas.value && patternCanvas) {
    const ctx = canvas.value.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, height, height);

      // Draw the wrapped portion
      ctx.drawImage(
        patternCanvas,
        0, sourceY, height, height,  // source
        0, 0, height, height         // destination
      );
    }
  }

  animationId = requestAnimationFrame(animate);
};

const startAnimation = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  startTime = 0;
  animationId = requestAnimationFrame(animate);
};

onMounted(() => {
  if (canvas.value) {
    createPatternCanvas();
    startAnimation();
  }
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});

watch([speed, direction], () => {
  startAnimation();
});

</script>
<template>
  <div class="wrap-container">
    <canvas
      ref="canvas"
      :width="height"
      :height="height"
    />
  </div>
  <p v-if="nearestNote">
    {{ nearestNote?.name }} <span v-if="centsDifference"> {{ centsDifference }}cents</span>
  </p>
</template>

<style scoped>
.wrap-container {
  overflow: hidden;
  width: 400px;
  height: 400px;
  padding: 0;
  margin: 0;
  line-height: 0;
}

canvas {
  padding: 0;
  margin: 0;
  display: block;
}
</style>