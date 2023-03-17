<script setup>
import { useGuitar } from "../state/guitar";
import { useTemperament } from "../state/temperament";
import { remPixels, isOdd, range } from "../helpers";
import { computed } from "vue";

const { pitchClassNames } = useTemperament();

const {
  stringQuantity,
  divisonsPerOctave,
  stringNumbers,
  frettedNotes,
  scaleNames,
  selectScale,
  selectedScaleName,
  selectedScale,
  notesPerString,
  selectNotesPerString,
  startingFromFret,
} = useGuitar();

const noteNames = computed(() =>
  selectedScale.value.pitchClassNumbers.map(
    (pitchNumber) =>
      pitchClassNames[
        (pitchNumber + startingFromFret.value) % selectedScale.value.period
      ]
  )
);

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
const endingFret = Math.round(
  REACHABLE_FRETS_PERCENTAGE * divisonsPerOctave.value
);
const fretDistances = fretDistancesFromNut(endingFret, VIEWBOX_Y_MAX * 0.67129);
const fretSpacing = fretDistances.slice(1);
const fretHeights = fretSpacing.reduce((distances, length, index) => {
  distances.push(length - fretDistances[index]);
  return distances;
}, []);
const reachableFrets = range(startingFret, endingFret);
const fretDots = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
  .map((i) => i * 2 - 1)
  .filter((fret) => fret > startingFret && fret < endingFret);

const hue = (degree, upperBound) => (360 * degree) / upperBound;
const hsl = (degree, upperBound, l = 75) =>
  `hsl(${hue(degree, upperBound)}, 100%, ${l}%)`;

const hslForNote = (note, l = 50) => {
  if (!note) return;
  const degree = selectedScale.value.pitchClassNumbers
    .map((pitchClassNumber) => pitchClassNumber % selectedScale.value.period)
    .indexOf(note.note.pitchClassNumber);
  return hsl(degree, selectedScale.value.degrees, l);
};

const stringSpacing = width / (stringQuantity.value - 1);
const fontSize = remPixels() * 2.5;
const textOffsetX = 0.5 * fontSize;
const textOffsetY = fontSize;
</script>

<template>
  <div>
    <select name="" id="" @change="selectScale($event.target.value)">
      <option
        v-for="scaleName in scaleNames"
        :key="scaleName"
        :value="scaleName"
        :selected="scaleName === selectedScaleName"
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
    <input type="number" name="" id="" v-model="startingFromFret" />
  </div>
  <div>
    <span> Intervals {{ selectedScale.intervals.join(" ") }}</span>
  </div>
  <div>
    Notes
    <span
      v-for="(noteName, index) in noteNames.slice(0, noteNames.length - 1)"
      :key="index"
      class="note-badge"
      :style="`color: ${hsl(
        index,
        noteNames.length - 1
      )}; background-color:${hsl(index, noteNames.length, 12)};`"
    >
      {{ noteName }}&nbsp;</span
    >
  </div>
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
        :transform="`rotate(90 ${x - textOffsetX} ${
          y + height + textOffsetY + 2
        })`"
        transform-origin=""
      >
        {{ endingFret }}
      </text>
      <rect :x="x" :y="y" :width="width" :height="height" class="tab" />

      <g v-for="fret in reachableFrets" :key="fret">
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
          v-if="fretSpacing[fret]"
          :key="fret"
          :x1="x"
          :y1="fretSpacing[fret] + y"
          :x2="x + width"
          :y2="fretSpacing[fret] + y"
        />
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
      <g v-for="fret in reachableFrets" :key="fret">
        <circle
          v-for="(string, index) in stringNumbers"
          class="fret"
          :key="string"
          :cy="fretDistances[fret] + y"
          :cx="index * stringSpacing + x"
          :r="Math.min(stringSpacing / 5, fretHeights[fret] * 0.333)"
          :fill="
            hslForNote(
              frettedNotes[`string${string}`].find(
                (note) => note.fretNumber === fret
              )
            )
          "
          stroke-width="4"
          :class="{
            active: frettedNotes[`string${string}`].find(
              (note) => note.fretNumber === fret
            ),
          }"
        >
          <title>{{ fret }}</title>
        </circle>
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

.note-badge {
  display: inline-block;
  border-radius: 0.375rem;
  margin: 0.5rem;
  padding: 0.125rem 0.25rem;
  min-width: 2rem;
  text-align: center;
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

circle.fret:not(.active) {
  fill: transparent;
}

circle.fret-dot {
  fill: #ccc;
}

circle.active.fret {
  /* fill: #333; */
  stroke: rgba(0, 0, 0, 0.4);
}
</style>
