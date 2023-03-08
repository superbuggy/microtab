<script setup>
import { reactive } from "vue";
import { useGuitar } from "../state/guitar";
import { remPixels, isEven } from "../helpers";
import { useChords } from "../state/chord";

const { updateChord } = useChords();

const { stringQuantity, divisonsPerOctave, stringNumbers } = useGuitar();

const VIEWBOX_X_MAX = 600;
const VIEWBOX_Y_MAX = 1000;
const REACHABLE_FRETS_PERCENTAGE = 5 / 12;
const x = VIEWBOX_X_MAX / 4;
const y = VIEWBOX_Y_MAX / 4;
const width = VIEWBOX_X_MAX / 2;
const height = VIEWBOX_Y_MAX / 2;

const startingFret = 0;
const reachableFrets = Math.round(REACHABLE_FRETS_PERCENTAGE * divisonsPerOctave.value);
const endingFret = reachableFrets;
const darkFrets = Array.from({ length: reachableFrets })
  .map((_, i) => i + startingFret)
  .filter(isEven);
const fretDots = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
  .map((i) => i * 2 - 1)
  .filter((fret) => fret > startingFret && fret < endingFret);

const stringSpacing = width / (stringQuantity.value - 1);
const fretSpacing = height / reachableFrets;
const fontSize = remPixels() * 2.5;
const textOffsetX = 0.75 * fontSize;
const textOffsetY = 0.33 * fontSize;

const props = defineProps({
  // id: String,
  chord: Object,
});

const tabChord = reactive({ ...props.chord });

function toggleNote(string, fret) {
  tabChord[string] = tabChord[string] !== fret ? fret : null;
  updateChord(tabChord);
}
</script>

<template>
  <svg :viewBox="`0 0 ${VIEWBOX_X_MAX} ${VIEWBOX_Y_MAX}`">
    <text :x="x - textOffsetX" :y="y + textOffsetY" :font-size="fontSize">
      {{ startingFret }}
    </text>
    <rect :x="x" :y="y" :width="width" :height="height" class="tab" />
    <rect
      v-for="fret in darkFrets"
      :key="fret"
      :x="x"
      :y="fret * fretSpacing + y"
      :width="width"
      :height="fretSpacing"
      fill="#eee"
    />
    <circle
      v-for="fretDot in fretDots"
      :key="fretDot"
      :cy="fretDot * fretSpacing + y"
      :cx="width"
      :r="stringSpacing / 2.5"
      fill="#999"
    />
    <line
      v-for="fret in reachableFrets"
      :key="fret"
      :x1="x"
      :y1="fret * fretSpacing + y"
      :x2="x + width"
      :y2="fret * fretSpacing + y"
    />

    <line
      v-for="string in stringQuantity - 2"
      :key="string"
      :x1="string * stringSpacing + x"
      :y1="y"
      :x2="string * stringSpacing + x"
      :y2="y + height"
    />
    <g v-for="fret in reachableFrets + 1" :key="fret">
      <circle
        v-for="(string, index) in stringNumbers"
        class="fret"
        :key="string"
        :cy="(fret - 1) * fretSpacing + y"
        :cx="index * stringSpacing + x"
        :r="stringSpacing / 3"
        @click="toggleNote(`string${string}`, startingFret + fret - 1)"
        :class="{
          active: tabChord[`string${string}`] === startingFret + fret - 1,
        }"
      />
    </g>
    <text :x="x - textOffsetX" :y="y + height + textOffsetY" :font-size="fontSize">
      {{ endingFret }}
    </text>
  </svg>
</template>

<style scoped>
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

rect {
  /* stroke: #000; */
}
rect.tab {
  stroke: #000;
  fill: #fff;
}

circle.fret {
  fill: transparent;
}

circle.active.fret {
  fill: #000;
}

circle:hover {
  stroke: rgb(113, 0, 188);
  stroke-width: 0.5rem;
}
</style>
