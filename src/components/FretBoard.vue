<script setup>
// import { reactive } from "vue";
import { useGuitar } from "../state/guitar";
import { remPixels, isOdd, range } from "../helpers";

const {
  stringQuantity,
  divisonsPerOctave,
  stringNumbers,
  frettedNotes,
  scaleNames,
  selectScale,
  selectedScale,
  notesPerString,
  selectNotesPerString,
} = useGuitar();

const VIEWBOX_X_MAX = 600;
const VIEWBOX_Y_MAX = 4000;
const REACHABLE_FRETS_PERCENTAGE = 24 / 12;
const x = VIEWBOX_X_MAX / 4;
const y = VIEWBOX_Y_MAX / 8;
const width = VIEWBOX_X_MAX / 2;
const height = VIEWBOX_Y_MAX / 2;

const fretDistancesFromNut = (fretsQuantity, scaleLength) => {
  // Note: 35.124 or 17.562 * 2 (for 24) is closer for 24 EDO
  const FRET_DISTANCE_DIVISOR = 17.817 * (divisonsPerOctave.value / 12);
  return Array.from({ length: fretsQuantity }).reduce(
    (lengths, _, index) => {
      lengths.push(
        (scaleLength - lengths[index]) / FRET_DISTANCE_DIVISOR + lengths[index]
      );
      return lengths;
    },
    [0]
  );
};

const startingFret = 0;
const endingFret = Math.round(REACHABLE_FRETS_PERCENTAGE * divisonsPerOctave.value);
const fretDistances = fretDistancesFromNut(endingFret, VIEWBOX_Y_MAX * 0.67129);
const fretSpacing = fretDistances.slice(1);
const fretHeights = fretSpacing.reduce((distances, length, index) => {
  distances.push(length - fretDistances[index]);
  return distances;
}, []);
console.log(fretHeights);
const reachableFrets = range(startingFret, endingFret);
// const darkFrets = reachableFrets.map((_, i) => i + startingFret + 1).filter(isOdd);
const fretDots = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
  .map((i) => i * 2 - 1)
  .filter((fret) => fret > startingFret && fret < endingFret);

const stringSpacing = width / (stringQuantity.value - 1);
const fontSize = remPixels() * 2.5;
const textOffsetX = 0.5 * fontSize;
const textOffsetY = fontSize;
</script>

<template>
  <select name="" id="" @change="selectScale($event.target.value)">
    <option
      v-for="scaleName in scaleNames"
      :key="scaleName"
      :value="scaleName"
      :selected="scaleName === selectedScale"
    >
      {{ scaleName }}
    </option>
  </select>
  <select @change="selectNotesPerString($event.target.value)">
    <option
      v-for="notesPerStringSelection in ['All', 3, 4, 5]"
      :key="notesPerStringSelection"
      :value="notesPerStringSelection"
      :selected="notesPerString === notesPerStringSelection"
    >
      {{
        `${
          notesPerStringSelection === -1 ? "All" : notesPerStringSelection
        } notes per string`
      }}
    </option>
  </select>
  <div class="svg-container">
    <svg :viewBox="`0 0 ${VIEWBOX_X_MAX} ${VIEWBOX_Y_MAX}`">
      <text
        :x="x + 0.5 * textOffsetX"
        :y="y + textOffsetY"
        :font-size="fontSize"
        :transform="`rotate(90 ${x} ${y})`"
      >
        {{ startingFret }}
      </text>
      <text
        :x="x - 2 * textOffsetX"
        :y="y + height + 1.5 * textOffsetY"
        :font-size="fontSize"
        :transform="`rotate(90 ${x - textOffsetX} ${y + height + textOffsetY + 2})`"
        transform-origin=""
      >
        {{ endingFret }}
      </text>
      <rect :x="x" :y="y" :width="width" :height="height" class="tab" />
      <!-- <rect
        v-for="fret in darkFrets"
        :key="fret"
        :x="x"
        :y="fretSpacing[fret] + y"
        :width="width"
        :height="fretHeights[fret]"
        fill="#eee"
      /> -->

      <g v-for="fret in reachableFrets" :key="fret">
        <text>{{ fret }}</text>
        <rect
          v-if="isOdd(fret + 1)"
          :key="fret"
          :x="x"
          :y="fretDistances[fret] + y"
          :width="width"
          :height="fretHeights[fret]"
          fill="#eee"
        />
        <line
          :key="fret"
          :x1="x"
          :y1="fretSpacing[fret] + y"
          :x2="x + width"
          :y2="fretSpacing[fret] + y"
        />

        <circle
          v-for="(string, index) in stringNumbers"
          class="fret"
          :key="string"
          :cy="fretDistances[fret] + y"
          :cx="index * stringSpacing + x"
          :r="stringSpacing / 5"
          :class="{
            active: frettedNotes[`string${string}`].indexOf(fret) !== -1,
          }"
        >
          <title>{{ fret }}</title>
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
      <g v-for="fretDot in fretDots" :key="fretDot">
        <circle
          :cx="(fretDot + 1) % 12 === 0 ? width * 0.8 : width"
          :cy="fretSpacing[fretDot - 1] + y"
          :r="Math.min(stringSpacing / 3, fretHeights[fretDot] * 0.666)"
          class="fret-dot"
        />
        <circle
          v-if="(fretDot + 1) % 12 === 0"
          :cx="width * 1.2"
          :cy="fretSpacing[fretDot - 1] + y"
          :r="Math.min(stringSpacing / 3, fretHeights[fretDot] * 0.666)"
          class="fret-dot"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
svg {
  /* width: 800px; */
  width: 200px;
  /* height: 200px; */
  transform: rotate(270deg) translate(575px, 425px);
}

div.svg-container {
  max-height: 200px;
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
circle.fret-dot {
  fill: #ccc;
}

circle.active.fret {
  fill: #333;
}
</style>
