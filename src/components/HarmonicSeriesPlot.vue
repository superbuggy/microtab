<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { isPrime } from "@/definitions/primodality";
import { hsl } from "@/helpers";
import { DB_FLOOR, type HarmonicMeasurement } from "@/state/timbre-dsp";

const props = withDefaults(
  defineProps<{
    harmonics: HarmonicMeasurement[];
    dbFloor?: number;
  }>(),
  { dbFloor: DB_FLOOR },
);

const WIDTH = 940;
const HEIGHT = 470;
const MARGIN = { top: 36, right: 20, bottom: 64, left: 48 };
const GRID_STEP_DB = 12;

const canvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;

const isPowerOfTwo = (n: number) => n >= 1 && (n & (n - 1)) === 0;

// Root, octaves of the root, primes (the primodal colors), then composites.
const HARMONIC_CLASSES = [
  { label: "Root", color: hsl(205, 360, 55), matches: (n: number) => n === 1 },
  {
    label: "Octave",
    color: hsl(270, 360, 64),
    matches: (n: number) => isPowerOfTwo(n) && n > 1,
  },
  {
    label: "Prime",
    color: hsl(45, 360, 55),
    matches: (n: number) => n > 2 && isPrime(n),
  },
  { label: "Composite", color: hsl(210, 360, 80), matches: () => true },
];

const classFor = (n: number) =>
  HARMONIC_CLASSES.find((harmonicClass) => harmonicClass.matches(n))!;

const signed = (cents: number) => (cents > 0 ? `+${cents}` : `${cents}`);

function draw() {
  if (!ctx) return;
  const context = ctx;

  const floor = props.dbFloor;
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const dbToY = (db: number) =>
    MARGIN.top + (Math.max(floor, Math.min(0, db)) / floor) * plotHeight;

  context.clearRect(0, 0, WIDTH, HEIGHT);

  // dB gridlines
  context.strokeStyle = "#e2e2e2";
  context.lineWidth = 1;
  context.fillStyle = "#888";
  context.font = "11px sans-serif";
  context.textAlign = "right";
  for (let db = 0; db >= floor; db -= GRID_STEP_DB) {
    const y = dbToY(db);
    context.beginPath();
    context.moveTo(MARGIN.left, y);
    context.lineTo(MARGIN.left + plotWidth, y);
    context.stroke();
    context.fillText(`${db}`, MARGIN.left - 8, y + 4);
  }
  // Baseline
  context.strokeStyle = "#bbb";
  context.beginPath();
  context.moveTo(MARGIN.left, MARGIN.top + plotHeight);
  context.lineTo(MARGIN.left + plotWidth, MARGIN.top + plotHeight);
  context.stroke();

  // Legend
  context.textAlign = "left";
  HARMONIC_CLASSES.forEach((harmonicClass, index) => {
    const x = MARGIN.left + index * 108;
    context.fillStyle = harmonicClass.color;
    context.fillRect(x, 12, 12, 12);
    context.fillStyle = "#555";
    context.fillText(harmonicClass.label, x + 18, 22);
  });

  const { harmonics } = props;
  if (!harmonics.length) {
    context.fillStyle = "#999";
    context.font = "14px sans-serif";
    context.textAlign = "center";
    context.fillText(
      "Waiting for sound — play a note to see it along the harmonic series",
      WIDTH / 2,
      MARGIN.top + plotHeight / 2,
    );
    return;
  }

  const slot = plotWidth / harmonics.length;
  const barWidth = slot * 0.68;
  const detailed = harmonics.length <= 16;

  harmonics.forEach((harmonic, index) => {
    const x = MARGIN.left + index * slot + (slot - barWidth) / 2;
    const y = dbToY(harmonic.amplitudeDb);
    context.fillStyle = classFor(harmonic.n).color;
    context.fillRect(x, y, barWidth, MARGIN.top + plotHeight - y);

    const centerX = x + barWidth / 2;
    context.textAlign = "center";
    context.fillStyle = "#333";
    context.font = "600 12px sans-serif";
    context.fillText(`${harmonic.n}`, centerX, MARGIN.top + plotHeight + 18);

    if (!detailed) return;
    context.font = "10px sans-serif";
    context.fillStyle = "#666";
    context.fillText(harmonic.noteName, centerX, MARGIN.top + plotHeight + 32);
    context.fillText(
      `${signed(harmonic.centsFromEqualTemperament)}¢`,
      centerX,
      MARGIN.top + plotHeight + 45,
    );
    if (harmonic.amplitudeDb > floor + 2) {
      context.fillStyle = "#888";
      context.fillText(
        `${Math.round(harmonic.amplitudeDb)} dB`,
        centerX,
        y - 6,
      );
    }
  });
}

onMounted(() => {
  const element = canvas.value;
  if (!element) return;
  const ratio = window.devicePixelRatio || 1;
  element.width = WIDTH * ratio;
  element.height = HEIGHT * ratio;
  ctx = element.getContext("2d");
  if (ctx) ctx.scale(ratio, ratio);
  draw();
});

// The composable replaces the harmonics array each analysis frame.
watch(() => props.harmonics, () => draw(), { flush: "post" });
</script>

<template>
  <canvas
    ref="canvas"
    class="harmonic-series-plot"
    role="img"
    aria-label="Harmonic series plot of the analyzed sound"
  />
</template>

<style scoped>
.harmonic-series-plot {
  display: block;
  width: 100%;
  max-width: 940px;
}
</style>
