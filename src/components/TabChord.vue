<script setup>
import { reactive } from "vue";
import { useGuitar } from "../state/guitar";
import { remPixels } from "../helpers";
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

const reachableFrets = Math.round(REACHABLE_FRETS_PERCENTAGE * divisonsPerOctave.value);
const stringSpacing = width / (stringQuantity.value - 1);
const fretSpacing = height / reachableFrets;
const fontSize = remPixels() * 2.5;
const textOffsetX = 0.75 * fontSize;
const textOffsetY = 0.33 * fontSize;

const startingFret = 0;
const endingFret = reachableFrets;

const props = defineProps({
  // id: String,
  chord: Object,
});

const tabChord = reactive({ ...props.chord });

function toggleNote(string, fret) {
  tabChord[string] = tabChord[string] !== fret ? fret : null;
  updateChord(tabChord);
  console.log(string, fret, stringNumbers);
}
</script>

<template>
  <svg :viewBox="`0 0 ${VIEWBOX_X_MAX} ${VIEWBOX_Y_MAX}`">
    <text :x="x - textOffsetX" :y="y + textOffsetY" :font-size="fontSize">
      {{ startingFret }}
    </text>
    <rect :x="x" :y="y" :width="width" :height="height" />
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
  stroke: #000;
  fill: #fff;
}

circle {
  fill: transparent;
}

circle.active {
  fill: #000;
}

circle:hover {
  stroke: rgb(113, 0, 188);
  stroke-width: 0.5rem;
}
</style>
