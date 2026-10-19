<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { hsl } from "@/helpers";
import { useChordBuilder } from "@/state/useChordBuilder";
import { useTimbreAnalysis } from "@/state/useTimbreAnalysis";
import { DB_FLOOR } from "@/state/timbre-dsp";

const {
  chordTones,
  latticeLimit,
  subgroup,
  harmonicChord,
  gestalt,
  fusion,
} = useChordBuilder();
const { harmonics, rootFrequency } = useTimbreAnalysis();

const WIDTH = 940;
const LABEL_COLUMN = 170;
const MARGIN = { top: 10, right: 20, bottom: 34 };
const ROOT_LANE_HEIGHT = 64;
const TONE_LANE_HEIGHT = 34;
const LANE_GAP = 8;
const MAX_TONES = 8;

// Marks read stronger when the current sound actually contains the partial.
const PRESENT_THRESHOLD_DB = DB_FLOOR + 6;

const canvas = ref<HTMLCanvasElement | null>(null);

const displayedTones = computed(() => chordTones.value.slice(0, MAX_TONES));
const truncated = computed(() => chordTones.value.length > MAX_TONES);
const measuredRange = computed(() =>
  rootFrequency.value === null ? 0 : harmonics.value.length,
);

const signed = (cents: number) => (cents > 0 ? `+${cents}` : `${cents}`);

const canvasHeight = () =>
  MARGIN.top +
  ROOT_LANE_HEIGHT +
  LANE_GAP +
  displayedTones.value.length * (TONE_LANE_HEIGHT + LANE_GAP) +
  MARGIN.bottom;

function draw() {
  const element = canvas.value;
  if (!element) return;
  const context = element.getContext("2d");
  if (!context) return;

  const HEIGHT = canvasHeight();
  const ratio = window.devicePixelRatio || 1;
  if (element.width !== WIDTH * ratio || element.height !== HEIGHT * ratio) {
    element.width = WIDTH * ratio;
    element.height = HEIGHT * ratio;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, WIDTH, HEIGHT);

  const limit = latticeLimit.value;
  const axisX = LABEL_COLUMN;
  const axisWidth = WIDTH - axisX - MARGIN.right;
  const slot = axisWidth / limit;
  const harmonicX = (harmonic: number) => axisX + (harmonic - 0.5) * slot;

  const rootTop = MARGIN.top;
  const toneTop = rootTop + ROOT_LANE_HEIGHT + LANE_GAP;
  const plotBottom =
    toneTop + displayedTones.value.length * (TONE_LANE_HEIGHT + LANE_GAP);

  // Harmonic gridlines (thin out when the axis is dense)
  const gridStep = slot < 7 ? 4 : slot < 12 ? 2 : 1;
  context.strokeStyle = "#eee";
  context.lineWidth = 1;
  for (let harmonic = 1; harmonic <= limit; harmonic += gridStep) {
    const x = harmonicX(harmonic);
    context.beginPath();
    context.moveTo(x, rootTop);
    context.lineTo(x, plotBottom);
    context.stroke();
  }

  // Fusion bands: shared partials between constituent tones
  const fusionSet = new Set(fusion.value.map((column) => column.harmonic));
  context.fillStyle = "hsla(45, 100%, 55%, 0.10)";
  for (const harmonic of fusionSet) {
    context.fillRect(
      harmonicX(harmonic) - slot / 2,
      toneTop,
      slot,
      plotBottom - toneTop,
    );
  }

  // Root lane: the current sound's measured partials
  context.textAlign = "left";
  context.fillStyle = "#333";
  context.font = "600 12px sans-serif";
  context.fillText(
    rootFrequency.value === null
      ? "Root · not detected"
      : `Root · ${rootFrequency.value} Hz`,
    8,
    rootTop + ROOT_LANE_HEIGHT / 2 + 4,
  );
  const barWidth = Math.max(2, slot * 0.6);
  for (const harmonic of harmonics.value.slice(0, limit)) {
    const x = harmonicX(harmonic.n);
    const normalized = Math.max(DB_FLOOR, Math.min(0, harmonic.amplitudeDb));
    const barFraction = (normalized - DB_FLOOR) / -DB_FLOOR;
    const barHeight = barFraction * ROOT_LANE_HEIGHT;
    context.fillStyle = hsl(205, 360, 55);
    context.fillRect(
      x - barWidth / 2,
      rootTop + ROOT_LANE_HEIGHT - barHeight,
      barWidth,
      barHeight,
    );
  }

  // Tone lanes
  displayedTones.value.forEach((tone, laneIndex) => {
    const laneY = toneTop + laneIndex * (TONE_LANE_HEIGHT + LANE_GAP);

    context.strokeStyle = "#ddd";
    context.beginPath();
    context.moveTo(axisX, laneY + TONE_LANE_HEIGHT);
    context.lineTo(axisX + axisWidth, laneY + TONE_LANE_HEIGHT);
    context.stroke();

    context.textAlign = "left";
    context.fillStyle = "#333";
    context.font = "600 12px sans-serif";
    context.fillText(
      `${tone.ratioText} · ${Math.round(tone.cents)}¢`,
      8,
      laneY + 14,
    );
    context.font = "10px sans-serif";
    context.fillStyle = "#666";
    if (tone.noteName) {
      const cents = tone.centsFromEqualTemperament ?? 0;
      context.fillText(
        `${tone.noteName}${cents ? ` ${signed(cents)}¢` : ""}`,
        8,
        laneY + 27,
      );
    }

    for (const harmonic of tone.sharedPartials) {
      if (harmonic > limit) break;
      const x = harmonicX(harmonic);
      const y = laneY + TONE_LANE_HEIGHT / 2;
      const radius = Math.min(7, Math.max(3.5, slot * 0.28));
      const measured = harmonics.value[harmonic - 1]?.amplitudeDb;
      const withinRange = harmonic <= measuredRange.value;

      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      if (
        withinRange &&
        measured !== undefined &&
        measured > PRESENT_THRESHOLD_DB
      ) {
        // Present in the current sound: depth follows the live amplitude.
        const loudness = (measured - DB_FLOOR) / -DB_FLOOR;
        context.fillStyle = `hsl(190, 100%, ${70 - 40 * loudness}%)`;
        context.fill();
      } else if (withinRange) {
        // Measured but quiet/absent.
        context.strokeStyle = "#b9c4cc";
        context.lineWidth = 1.5;
        context.stroke();
      } else {
        // Beyond the analyzed range — presence unknown.
        context.fillStyle = "rgba(120, 130, 140, 0.25)";
        context.fill();
      }
    }
  });

  // Harmonic axis numbers
  context.textAlign = "center";
  context.fillStyle = "#888";
  context.font = "10px sans-serif";
  const labelStep = slot < 7 ? 4 : slot < 12 ? 2 : 1;
  for (let harmonic = 1; harmonic <= limit; harmonic += labelStep) {
    context.fillText(`${harmonic}`, harmonicX(harmonic), plotBottom + 14);
  }

  if (!chordTones.value.length) {
    context.fillStyle = "#999";
    context.font = "13px sans-serif";
    context.textAlign = "center";
    context.fillText(
      "Add ratios above to map their harmonic-series relationships",
      axisX + axisWidth / 2,
      rootTop + ROOT_LANE_HEIGHT / 2,
    );
  }
}

onMounted(draw);

// The composables replace their arrays each analysis frame.
watch(
  [harmonics, chordTones, latticeLimit, fusion, rootFrequency],
  () => draw(),
  { flush: "post" },
);
</script>

<template>
  <div class="harmonic-relations">
    <div class="relations-readouts">
      <span>Subgroup <strong>{{ subgroup.label || "—" }}</strong></span>
      <span v-if="chordTones.length">
        Series
        <strong>{{ harmonicChord.label }}</strong>
        over /{{ harmonicChord.denominator }}
      </span>
      <span v-if="gestalt">
        Gestalt /{{ gestalt.dominantDenominator }} —
        {{ gestalt.blended }} blended · {{ gestalt.broken }} broken
      </span>
    </div>
    <canvas
      ref="canvas"
      class="relations-canvas"
      role="img"
      aria-label="Harmonic series relationships between constituent tones"
    />
    <p class="relations-legend">
      <span class="legend-present">●</span> in current sound
      <span class="legend-absent">◌</span> absent
      <span class="legend-unknown">·</span> beyond analyzed range
      <span class="legend-fusion">▮</span> shared between tones
    </p>
    <p
      v-if="truncated"
      class="relations-truncated"
    >
      Showing the first {{ MAX_TONES }} tones.
    </p>
  </div>
</template>

<style scoped>
.harmonic-relations {
  max-width: 940px;
}

.relations-readouts {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #555;
}

.relations-canvas {
  display: block;
  width: 100%;
  max-width: 940px;
}

.relations-legend {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: #777;
}

.legend-present {
  color: hsl(190, 100%, 40%);
}

.legend-absent {
  color: #b9c4cc;
}

.legend-unknown {
  color: rgba(120, 130, 140, 0.6);
}

.legend-fusion {
  color: hsl(45, 100%, 55%);
}

.relations-truncated {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: #997722;
}
</style>
