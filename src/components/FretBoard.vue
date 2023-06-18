<script setup>
import FretBoardControls from "./FretBoardControls.vue";

import { computed } from "vue";
import { remPixels, isOdd, range, mapValueToRange } from "../helpers";

import { useGuitar } from "../state/guitar";
import { useTemperament } from "../state/temperament";
import { useFretBoardControls } from "../state/fretboard-controls";
import { useTone } from "../effects/tone";

const { playNote } = useTone();
const { pitchClassNames, divisionsPerOctave } = useTemperament();
const { shouldShow12TETFrets, areFretColorsInverted } = useFretBoardControls();
const {
  stringQuantity,
  stringNumbers,
  scaleNotesOnStrings,
  selectedScale,
  startingFromFret,
} = useGuitar();

const noteNames = computed(() =>
  selectedScale.value.pitchClassNumbers.map(
    (pitchNumber) =>
      pitchClassNames.value[
        (pitchNumber + startingFromFret.value) % selectedScale.value.period
      ]
  )
);

const VIEWBOX_X_MAX = 600;
const VIEWBOX_Y_MAX = 4000;
// const REACHABLE_FRETS_PERCENTAGE = 24 / 12;
const x = VIEWBOX_X_MAX / 4;
const y = VIEWBOX_Y_MAX / 8;
const width = VIEWBOX_X_MAX / 2;
const fretboardHeight = VIEWBOX_Y_MAX / 2;

// const
// const frettedNotes =Object.entries(scaleNotesOnStrings.value)

const fretDistancesFromNut = (
  fretsQuantity,
  scaleLength,
  divisions = divisionsPerOctave.value
) => {
  // Note: 35.124 or 17.562 * 2 (for 24) is closer for 24 EDO
  // 17.817 Is the number which makes it line up
  const exponent = mapValueToRange(divisions, 16, 24, -3, -1.5);

  const FRET_DISTANCE_DIVISOR =
    (17.817 - Math.log(divisions / 12) * (divisions / 12) ** exponent) * (divisions / 12);
  // const FRET_DISTANCE_DIVISOR = 17.817 * (divisions / 12);
  // const FRET_DISTANCE_DIVISOR = mapValueToRange(divisions,12, 24, 17.817, 17.817*2)
  // const multiplier = Math.log(divisions, 12);
  // const FRET_DISTANCE_DIVISOR =
  //   mapValueToRange(
  //     divisions,
  //     12,
  //     24,
  //     // 23.59417883424587,
  //     17.817,
  //     17.817 * 2
  //   ) -
  //   multiplier / 10;
  // console.log(FRET_DISTANCE_DIVISOR);

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
// const scaleLength = (divisions = divisionsPerOctave.value) =>
//   (height * 4) / 3 //+ Math.log(divisions / 12) * (height / 300);
const scaleLength = () => VIEWBOX_Y_MAX * 0.67129 * 0.98568783;

const startingFret = 0;
const endingFret = computed(() => 2 * divisionsPerOctave.value);
const fretDistances = computed(() =>
  fretDistancesFromNut(endingFret.value, scaleLength())
);
const fretSpacing = computed(() => fretDistances.value.slice(1));
const fretHeights = computed(() =>
  fretSpacing.value.reduce((distances, length, index) => {
    distances.push(length - fretDistances.value[index]);
    return distances;
  }, [])
);

const reachableFrets = computed(() => range(startingFret, endingFret.value));
const tet12 = {
  reachableFrets: range(0, 24),
  fretDistances: fretDistancesFromNut(24, scaleLength(12), 12),
  fretSpacing: fretDistancesFromNut(24, scaleLength(12), 12).slice(1),
};

const fretDots = computed(
  () =>
    ({
      16: [3, 5, 7, 9, 11, 13, 16, 19, 21, 23, 25, 27, 29, 32],
      17: [4, 7, 10, 13, 17, 21, 24, 27, 30, 34],
      24: [5, 9, 13, 17, 23, 29, 33, 37, 41, 47],
    }[divisionsPerOctave.value])
);

// Offset fors fret dot placements in between frets or on frets, depending on temperament
const fretDotModifier = computed(
  () =>
    ({
      16: 0,
      17: 0,
      24: 1,
    }[divisionsPerOctave.value])
);
// .filter((fret) => fret > startingFret && fret < endingFret);

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
  <FretBoardControls />
  <div>
    <span> Intervals {{ selectedScale.intervals.join(" ") }}</span>
  </div>
  <div>
    Notes
    <span
      v-for="(noteName, index) in noteNames.slice(0, noteNames.length - 1)"
      :key="index"
      class="note-badge"
      :style="`color: ${hsl(index, noteNames.length - 1)}; background-color:${hsl(
        index,
        noteNames.length,
        12
      )};`"
    >
      {{ noteName }}&nbsp;</span
    >
  </div>
  <div class="svg-container">
    <svg
      :viewBox="`0 0 ${VIEWBOX_X_MAX} ${VIEWBOX_Y_MAX}`"
      :class="{ 'inverted-fret-colors': areFretColorsInverted }"
    >
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
        :y="y + fretboardHeight + 1.5 * textOffsetY"
        :font-size="fontSize"
        :transform="`rotate(90 ${x - textOffsetX} ${
          y + fretboardHeight + textOffsetY + 2
        })`"
        transform-origin=""
      >
        {{ endingFret }}
      </text>
      <rect :x="x" :y="y" :width="width" :height="fretboardHeight" class="tab" />

      <g v-for="fret in reachableFrets" :key="fret">
        <rect
          v-if="divisionsPerOctave === 24 && isOdd(fret + 1)"
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
        :y2="y + fretboardHeight"
      />
      <g v-for="fretDot in fretDots" :key="fretDot">
        <circle
          :cx="
            (fretDot + fretDotModifier) % divisionsPerOctave === 0 ? width * 0.8 : width
          "
          :cy="fretSpacing[fretDot - 1] + y"
          :r="
            Math.min(
              stringSpacing / 3,
              (fretHeights[fretDot] || fretHeights[fretDot - 1]) * 0.666
            )
          "
          class="fret-dot"
        />
        <circle
          v-if="(fretDot + fretDotModifier) % divisionsPerOctave === 0"
          :cx="width * 1.2"
          :cy="fretSpacing[fretDot - 1] + y"
          :r="
            Math.min(
              stringSpacing / 3,
              (fretHeights[fretDot] || fretHeights[fretDot - 1]) * 0.666
            )
          "
          class="fret-dot octave-dots"
        />
      </g>
      <g v-for="fret in reachableFrets" :key="fret">
        <g v-for="(string, index) in stringNumbers" :key="string">
          <circle
            v-if="
              scaleNotesOnStrings[`string${string}`].find(
                (note) => note.fretNumber === fret
              )
            "
            class="fret"
            :cy="fretDistances[fret] + y"
            :cx="index * stringSpacing + x"
            :r="Math.min(stringSpacing / 5, fretHeights[fret] * 0.333)"
            :fill="
              hslForNote(
                scaleNotesOnStrings[`string${string}`].find(
                  (note) => note.fretNumber === fret
                )
              ) // TODO: improve performance by not using find in a v-for
            "
            @click="
              playNote(
                scaleNotesOnStrings[`string${string}`].find(
                  (note) => note.fretNumber === fret
                ).note.frequency
              )
            "
            stroke-width="4"
            :class="{
              active: scaleNotesOnStrings[`string${string}`].find(
                (note) => note.fretNumber === fret
              ),
            }"
          >
            <title>{{ fret }}</title>
          </circle>
        </g>
      </g>
      <g v-if="shouldShow12TETFrets">
        <line
          v-for="fret in tet12.reachableFrets"
          class="tet-12-overlay"
          :key="fret"
          :x1="x - width * 0.25"
          :y1="tet12.fretSpacing[fret] + y"
          :x2="x"
          :y2="tet12.fretSpacing[fret] + y"
          stroke-width="2"
        />
        <line
          v-for="fret in tet12.reachableFrets"
          class="tet-12-overlay"
          :key="fret"
          :x1="x - width * 0.25"
          :y1="tet12.fretSpacing[fret] + y"
          :x2="x + width"
          :y2="tet12.fretSpacing[fret] + y"
          stroke-width="2"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped lang="scss">
svg {
  /* width: 800px; */
  width: 400px;
  /* height: 200px; */
  transform: rotate(270deg) translate(1125px, 825px);
}

div.svg-container {
  max-height: 350px;
  svg {
    text {
      font-family: "Fondamento", cursive;
      text-anchor: end;
    }

    line:not(.tet-12-overlay) {
      stroke: #000;
    }
    line.tet-12-overlay {
      stroke: #ff00003d;
    }
    &.inverted-fret-colors {
      line:not(.tet-12-overlay) {
        stroke: #ff00007d;
      }
      line.tet-12-overlay {
        stroke: #000;
      }
    }

    rect.tab {
      stroke: #000;
      fill: #fff;
    }

    circle.fret:not(.active) {
      fill: transparent;
    }

    circle.fret {
      cursor: pointer;
    }
    circle.active.fret:hover {
      stroke: rgba(255, 255, 255, 0.5);
      stroke-width: 10px;
    }

    circle.fret-dot {
      fill: #ccc;
    }

    circle.active.fret {
      /* fill: #333; */
      transition: stroke-width 0.5s ease;
      stroke: rgba(0, 0, 0, 0.4);
    }
  }
}

label[for="tempo"] span {
  display: inline-block;
  min-width: 1.5rem;
  text-align: right;
}

.note-badge {
  display: inline-block;
  border-radius: 0.375rem;
  margin: 0.5rem;
  padding: 0.125rem 0.25rem;
  min-width: 2rem;
  text-align: center;
}
</style>
