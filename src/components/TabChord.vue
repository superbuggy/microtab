<script setup lang="ts">
import { range } from "@/helpers";
import { reactive, ref, computed, watch, nextTick } from "vue";
import { useGuitar } from "@/state/guitar";
import { useTemperament } from "@/state/temperament";
import { useChords } from "@/state/chord";
import { remPixels, isEven } from "@/helpers";
import type { GuitarChord, StringNumber } from "@/definitions/types";

const { updateChord } = useChords();

const { stringQuantity, stringNumbers } = useGuitar();
const { divisionsPerOctave } = useTemperament();
const props = defineProps<{
  chord: GuitarChord;
}>();

const tabChord = reactive({ ...props.chord });
const startingFretInput = ref<null | HTMLInputElement>(null);
const VIEWBOX_X_MAX = 600;
const VIEWBOX_Y_MAX = 600;
const REACHABLE_FRETS_PERCENTAGE = 5 / 12;
const x = VIEWBOX_X_MAX / 4;
const y = VIEWBOX_Y_MAX / 16;
const width = VIEWBOX_X_MAX / 2;
const height = VIEWBOX_Y_MAX * 0.875;
const lowestChordNote = () => {
  const min = Math.min(
    ...Object.entries(tabChord)
      .filter(([k, v]) => k !== "id" && v !== null)
      .map(([, v]) => v as number)
  );
  return min === Infinity ? 0 : min;
};
const isInEditMode = ref(false);

watch(isInEditMode, async () => {
  await nextTick();
  if (isInEditMode.value) startingFretInput.value?.focus();
});

const startingFret = ref(lowestChordNote());
const fretSpan = Math.round(REACHABLE_FRETS_PERCENTAGE * divisionsPerOctave.value);
const endingFret = computed(() => startingFret.value + fretSpan);
const reachableFrets = computed(() => range(startingFret.value, endingFret.value));
const fretDots = computed(() =>
  [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
    .map((i) => i * 2 - 1)
    .filter((fret) => fret >= startingFret.value && fret <= endingFret.value)
);

const stringSpacing = width / (stringQuantity.value - 1);
const fretSpacing = height / fretSpan;
const fontSize = remPixels() * 2.5;
const textOffsetX = 0.75 * fontSize;
const textOffsetY = 0.33 * fontSize;

function toggleNote(string: StringNumber, fret: number) {
  tabChord[string] = tabChord[string] !== fret ? fret : null;
  updateChord(tabChord);
}
</script>

<template>
  <svg :viewBox="`0 0 ${VIEWBOX_X_MAX} ${VIEWBOX_Y_MAX}`">
    <text
      v-if="!isInEditMode"
      :x="x - textOffsetX"
      :y="y + textOffsetY"
      :font-size="fontSize"
      @click="isInEditMode = !isInEditMode"
    >
      {{ startingFret }}
    </text>
    <foreignObject
      v-else
      :x="x - 2 * textOffsetX"
      :y="y - 2 * textOffsetY"
      :height="fontSize * 2"
      :width="fontSize * 3"
    >
      <input
        ref="startingFretInput"
        v-model.number="startingFret"
        xmlns="http://www.w3.org/1999/xhtml"
        type="number"
        min="0"
        @keydown.enter="
          isInEditMode = !isInEditMode;
          startingFret = startingFret || 0;
        "
      >
    </foreignObject>
    <rect
      :x="x"
      :y="y"
      :width="width"
      :height="height"
      class="tab"
    />
    <g
      v-for="(fret, index) in reachableFrets.slice(0, -1)"
      :key="fret"
    >
      <rect
        v-if="isEven(fret)"
        :key="fret"
        :x="x"
        :y="index * fretSpacing + y"
        :width="width"
        :height="fretSpacing"
        fill="#eee"
      />
      <line
        :x1="x"
        :y1="index * fretSpacing + y"
        :x2="x + width"
        :y2="index * fretSpacing + y"
      />
    </g>
    <g
      v-for="(fret, index) in reachableFrets"
      :key="fret"
    >
      <circle
        v-if="fretDots.includes(fret)"
        class="fret-dot"
        :cy="index * fretSpacing + y"
        :cx="width"
        :r="stringSpacing / 2.5"
        fill="#999"
      >
        <title>
          {{ fret }}
        </title>
      </circle>
    </g>
    <line
      v-for="string in stringQuantity - 2"
      :key="string"
      :x1="string * stringSpacing + x"
      :y1="y"
      :x2="string * stringSpacing + x"
      :y2="y + height"
    />
    <g
      v-for="(fret, fretIndex) in reachableFrets"
      :key="fret"
    >
      <circle
        v-for="(string, index) in stringNumbers"
        :key="string"
        class="fret"
        :cy="fretIndex * fretSpacing + y"
        :cx="index * stringSpacing + x"
        :r="stringSpacing / 5"
        :class="{
          active: tabChord[`string${string}`] === startingFret + fret,
        }"
        @click="toggleNote(`string${string}`, startingFret + fret)"
      >
        <title>{{ fret }}</title>
      </circle>
    </g>
    <text
      :x="x - textOffsetX"
      :y="y + height + textOffsetY"
      :font-size="fontSize"
    >
      {{ endingFret }}
    </text>
  </svg>
</template>

<style lang="scss" scoped>
svg {
  width: 200px;
}

svg text {
  font-family: "Fondamento", cursive;
  text-anchor: end;
}

line {
  stroke: #000;
}

rect.tab {
  stroke: #000;
  fill: #fff;
}

circle.fret {
  &.active {
    fill: #000;
  }
  fill: transparent;
}

circle:not(.fret-dot):hover {
  stroke: rgb(113, 0, 188);
  stroke-width: 0.5rem;
}

foreignObject input {
  font-family: "Fondamento", cursive;

  height: 100%;
  width: 100%;
  font-size: 2.5rem;
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
  &:focus {
    background-color: #000;
    color: #fff;
  }
}
</style>
