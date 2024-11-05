<script setup lang="ts">
import FretBoardControls from "./FretBoardControls.vue";
import PopOver from "./PopOver.vue";

import { computed, ref } from "vue";
import { remPixels, isOdd, range, mapValueToRange } from "../helpers";
import { objectMap } from "../helpers";

import { useGuitar } from "../state/guitar";
import { useTemperament } from "../state/temperament";
import { useFretBoardControls } from "../state/fretboard-controls";
import { useTone } from "../effects/tone";

const { playNote } = useTone();
const {
  pitchClassNames,
  divisionsPerOctave,
  notesFor,
  notesDictionaryFor,
} = useTemperament();
const { shouldShow12TETFrets } = useFretBoardControls();
const {
  stringQuantity,
  scaleNotesOnStrings,
  selectedScale,
  startingFromFret,
  tuning,
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

const popUpX = ref<number>(NaN);
const popUpY = ref<number>(NaN);
const popUpNote = ref<{pitch: string, } | null>(null);

const SCALE_LENGTH = 25.5;

const stringEnergy = (stringRootFrequency: number) => 2 * SCALE_LENGTH * stringRootFrequency;
// Frequency = 1 / 2L * stringEnergy //sqrt(T/m)
// From a note frequency for a string, find the position on the string for that note frequency
const distanceForFrequency = (stringRootFrequency: number, noteFrequency: number) =>
  stringEnergy(stringRootFrequency) / (noteFrequency * 2);

const stringY = (stringRootFrequency: number, noteFrequency: number) =>
  // whyyyyy
  1.775 *
  (fretboardHeight -
    mapValueToRange(
      distanceForFrequency(stringRootFrequency, noteFrequency),
      0,
      SCALE_LENGTH,
      y,
      fretboardHeight
    ));

const stringNotes = computed((): Record<string, Record<string, any>> => {
  const guideLineDivisions = shouldShow12TETFrets.value ? 12 : divisionsPerOctave.value;
  const dict = notesDictionaryFor(guideLineDivisions);
  const stringRootFrequencies = objectMap(
    tuning.value,
    (_, pitchName) => dict[pitchName].frequency
  );
  console.log(stringRootFrequencies);
  const notesWithDistances = objectMap(stringRootFrequencies, (string, rootFrequency) =>
    scaleNotesOnStrings.value[string].map(({ note, fretNumber }) => ({
      note,
      fretNumber,
      noteY: stringY(rootFrequency, note.frequency),
    }))
  );
  // console.log(notes);
  // objectMap(tuning.values, ([, pitchName]) => notes.find((note) => note));
  console.log(notesWithDistances);
  return notesWithDistances;
});

// Assumes an equal step temperament
const fretDistancesFromNut = (divisions = divisionsPerOctave.value) => {
  // TODO: Add True Temperament Mode
  const lowestStringRootIndex = notesFor(divisions).findIndex(
    (note) => note.pitch === tuning.value.string6
  );
  const lowestStringRootFrequency = notesDictionaryFor(divisions)[tuning.value.string6]
    .frequency;
  const twoOctaves = notesFor(divisions)
    .slice(lowestStringRootIndex, lowestStringRootIndex + 2 * divisions)
    .map((note) => stringY(lowestStringRootFrequency, note.frequency));

  return twoOctaves;
  //
};

const startingFret = 0;
const endingFret = computed(() => 2 * divisionsPerOctave.value);
const reachableFrets = computed(() =>
  shouldShow12TETFrets.value ? range(0, 24) : range(startingFret, endingFret.value)
);
const fretDistances = computed(() =>
// TODO: Fix this
   //@ts-expect-error - Argument of type '12 | SupportedEDOs' is not assignable to parameter of type 'SupportedEDOs | undefined'.
  fretDistancesFromNut(shouldShow12TETFrets.value ? 12 : divisionsPerOctave.value)
);
const fretSpacing = computed(() => fretDistances.value.slice(1));
const fretHeights = computed(() =>
  fretSpacing.value.reduce((distances, length, index) => {
    distances.push(length - fretDistances.value[index]);
    return distances;
  }, [] as number[])
);

function handleHover(event: Event, note: {pitch: string}) {
  const target = event.target as SVGElement;
  popUpX.value = Number(target.getAttribute('cx'));
  popUpY.value = Number(target.getAttribute('cy'));
  popUpNote.value = note;
}

function resetPopUp() {
  popUpNote.value = null;
  popUpX.value = NaN;
  popUpY.value = NaN;
}

const fretDots = computed(() =>
  shouldShow12TETFrets.value
    ? [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
    : {
        12: [3, 5, 7, 9, 12, 15, 17, 19, 21, 24],
        16: [3, 5, 7, 9, 11, 13, 16, 19, 21, 23, 25, 27, 29, 32],
        17: [4, 7, 10, 13, 17, 21, 24, 27, 30, 34],
        24: [6, 10, 14, 18, 24, 30, 34, 38, 42, 48],
      }[divisionsPerOctave.value]
);
// const fretDotSpacing = shouldShow12TETFrets.value ?
// shouldShow12TETFrets
//               ? (fretSpacing[fretDot - 1] + fretSpacing[fretDot - 2]) / 2 + y
//               : fretSpacing[fretDot - 1] + y

const hue = (degree: number, upperBound: number) => (360 * degree) / upperBound;
const hsl = (degree: number, upperBound: number, l = 75) =>
  `hsl(${hue(degree, upperBound)}, 100%, ${l}%)`;

const hslForNote = (note: { pitchClassNumber: number }, l = 50) => {
  // if (!note) return;
  const degree = selectedScale.value.pitchClassNumbers
    .map((pitchClassNumber) => pitchClassNumber % selectedScale.value.period)
    .indexOf(note.pitchClassNumber);

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
      {{ noteName }}&nbsp;</span>
  </div>
  <div class="svg-container">
    <svg
      :viewBox="`0 0 ${VIEWBOX_X_MAX} ${VIEWBOX_Y_MAX}`"
      :class="{ 'showing-12-tet': shouldShow12TETFrets }"
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
      <rect
        :x="x"
        :y="y"
        :width="width"
        :height="fretboardHeight"
        class="tab"
      />

      <g class="frets-group">
        <g
          v-for="fret in reachableFrets"
          :key="fret"
        >
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
            class="fret"
            :x1="x"
            :y1="fretSpacing[fret] + y"
            :x2="x + width"
            :y2="fretSpacing[fret] + y"
          />
        </g>
        <g v-if="shouldShow12TETFrets">
          <line
            v-for="fret in reachableFrets"
            :key="fret"
            class="tet-12-overlay fret"
            :x1="x"
            :y1="fretSpacing[fret] + y"
            :x2="x + width"
            :y2="fretSpacing[fret] + y"
            stroke-width="2"
          />
        </g>
      </g>
      <g class="string-group">
        <line
          v-for="string in stringQuantity - 2"
          :key="string"
          :x1="string * stringSpacing + x"
          :y1="y"
          :x2="string * stringSpacing + x"
          :y2="y + fretboardHeight"
        />
      </g>
      <g class="fret-dots-group">
        <g
          v-for="fretDot in fretDots"
          :key="fretDot"
        >
          <circle
            :cx="
              fretDot % (shouldShow12TETFrets ? 12 : divisionsPerOctave) === 0
                ? width * 0.8
                : width
            "
            :cy="
              divisionsPerOctave !== 24
                ? (fretSpacing[fretDot - 1] + fretSpacing[fretDot - 2]) / 2 + y
                : fretSpacing[fretDot - 1] + y
            "
            :r="Math.min(stringSpacing / 3, fretHeights[fretDot] * 0.4)"
            class="fret-dot"
          >
            <title>{{ fretHeights[fretDot] * 0.666 }}, {{ stringSpacing / 3 }}</title>
          </circle>
          <circle
            v-if="fretDot % (shouldShow12TETFrets ? 12 : divisionsPerOctave) === 0"
            :cx="width * 1.2"
            :cy="
              divisionsPerOctave !== 24
                ? (fretSpacing[fretDot - 1] + fretSpacing[fretDot - 2]) / 2 + y
                : fretSpacing[fretDot - 1] + y
            "
            :r="Math.min(stringSpacing / 3, fretHeights[fretDot] * 0.4)"
            class="fret-dot octave-dots"
          />
        </g>
      </g>
      <g class="fretted-notes-group">
        <g
          v-for="fret in reachableFrets"
          :key="fret"
        >
          <g
            v-for="(string, index) in Object.keys(stringNotes)"
            :key="string"
          >
            <circle
              v-for="{ note, fretNumber, noteY } in stringNotes[string]"
              :id="`note-${note.frequency}-hz`"
              :key="`${string}-${fretNumber}`"
              class="fretted-note active"
              :cx="index * stringSpacing + x"
              :cy="noteY + y"
              :r="Math.min(stringSpacing / 5)"
              :fill="hslForNote(note)"
              stroke-width="4"
              @mouseover="handleHover($event, note)"
              @mouseout="resetPopUp"
              @click="playNote(note.frequency)"
            >
              <title>{{ fretNumber }}</title>
            </circle>
          </g>
        </g>
      </g>
      <PopOver
        :x="popUpX"
        :y="popUpY"
      >
        <p v-if="popUpNote">Frequency: {{ popUpNote.pitch }}</p>
      </PopOver>
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

    line {
      stroke: #000;
    }

    &.showing-12-tet {
      line.fret:not(.tet-12-overlay) {
        stroke: transparent;
      }
      line.tet-12-overlay {
        stroke: #000;
      }
    }
    rect.tab {
      stroke: #000;
      fill: #fff;
    }

    circle.fretted-note {
      cursor: pointer;
      transition: stroke-width 0.5s ease;
      stroke: rgba(0, 0, 0, 0.4);
      &:hover {
        stroke: rgba(255, 255, 255, 0.5);
        stroke-width: 10px;
      }
    }
    circle.is-playing {
      // stroke: rgba(255, 255, 255, 0.5);
      transition: none;
      stroke: rgba(0, 0, 0, 1);
      stroke-width: 10px;
    }

    circle.fret-dot {
      fill: #ccc;
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
