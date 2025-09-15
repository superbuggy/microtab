<script setup lang="ts">
import FretBoardControls from "./FretBoardControls.vue";
import PopOver from "@/components/PopOver.vue";

import { computed, ref } from "vue";
import { remPixels, isOdd, range, mapValueToRange, objectMap } from "@/helpers";

import { useGuitar } from "@/state/guitar";
import { useTemperament } from "@/state/temperament";
import { usePitchDetection } from "@/state/usePitchDetection";
import { useFretBoardControls } from "@/state/fretboard-controls";
import { useTone } from "@/effects/tone";

const { playNote } = useTone();
const { inputPitch } = usePitchDetection();

const {
  pitchClassNames,
  divisionsPerOctave,
  notesFor,
  notesInTemperamentByPitch,
  notesDictionaryFor12Tet,
} = useTemperament();
const { shouldShow12TETFrets } = useFretBoardControls();
const {
  stringQuantity,
  scaleNotesOnStrings,
  selectedScale,
  startingFromFret,
  tuningByStringNumber,
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
const xBoardStart = VIEWBOX_X_MAX / 4;
const yBoardStart = VIEWBOX_Y_MAX / 8;
const width = VIEWBOX_X_MAX / 2;
const fretboardLengthPx = VIEWBOX_Y_MAX / 2;

const popUpX = ref<number|null>(null);
const popUpY = ref<number|null>(null);
const popUpNote = ref<{pitch: string, } | null>(null);

const SCALE_LENGTH = 25.5;

function stringEnergy (stringRootFrequency: number) {
  // Mersenne's Law
  // L = 1/2 * sqrt(T/m) * 1/f
  // T/m = (2Lf)^2

  return 2 * SCALE_LENGTH * stringRootFrequency;
} 
// Frequency = 1 / 2L * stringEnergy //sqrt(T/m)
// From a note frequency for a string, find the position on the string for that note frequency
function distanceForFrequency (stringRootFrequency: number, noteFrequency: number) {
  // Mersenne's Law
  // L = 1/2 * sqrt(T/m) * 1/f
  // T/m = (2Lf)^2

  return stringEnergy(stringRootFrequency) / (noteFrequency * 2);
}

function noteYCoord (stringRootFrequency: number, noteFrequency: number) {
  return 1.775 * // not sure why this number is magic 71/40
  (fretboardLengthPx -
    mapValueToRange(
      distanceForFrequency(stringRootFrequency, noteFrequency),
      0,
      SCALE_LENGTH,
      yBoardStart,
      fretboardLengthPx
    )
  ) + yBoardStart;
}

const detectedPitchStringsCoords = computed((): Record<string, number> | null => {
  if (inputPitch.value === null) return null;
  return objectMap(rootFrequenciesByStringNumber.value, (_, rootFrequency) => {
    return noteYCoord(rootFrequency, inputPitch.value as number);
  });
});

const rootFrequenciesByStringNumber = computed((): Record<string, number> => {
  return objectMap(
    tuningByStringNumber.value,
    (_, pitchName) => notesInTemperamentByPitch.value[pitchName].frequency
  );
});

const stringNotes = computed((): Record<string, Record<string, any>> => {
  const reference = shouldShow12TETFrets.value ? notesDictionaryFor12Tet : notesInTemperamentByPitch.value
  const stringRootFrequencies = objectMap(
    tuningByStringNumber.value,
    (_, pitchName) => reference[pitchName].frequency
  );

  const notesWithDistances = objectMap(stringRootFrequencies, (string, rootFrequency) =>
    scaleNotesOnStrings.value[string].map(({ note, fretNumber }: { note: any, fretNumber: number}) => ({
      note,
      fretNumber,
      string, 
      noteY: noteYCoord(rootFrequency, note.frequency),
    }))
  );

  return notesWithDistances;
});

  const  lowestStringRootFrequency = computed(() => notesInTemperamentByPitch.value[tuningByStringNumber.value.string6]
    .frequency);

// Assumes an equal step temperament
function fretDistancesFromNut (divisions = divisionsPerOctave.value) {
  // TODO: Add True Temperament Mode
  const lowestStringRootIndex = notesFor(divisions).findIndex(
    (note) => note.pitch === tuningByStringNumber.value.string6
  );

  const twoOctaves = notesFor(divisions)
    .slice(lowestStringRootIndex, lowestStringRootIndex + 2 * divisions)
    .map((note) => noteYCoord(lowestStringRootFrequency.value, note.frequency));

  return twoOctaves;
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
const fretSpacingPx = computed(() => fretDistances.value.slice(1));
const fretHeightsPx = computed(() =>
  fretSpacingPx.value.reduce((distances: number[], length: number, index: number) => {
    distances.push(length - fretDistances.value[index]);
    return distances;
  }, [])
);

function handleHover (event: Event, note: {pitch: string}) {
  const target = event.target as SVGElement;
  popUpX.value = Number(target.getAttribute('cx'));
  popUpY.value = Number(target.getAttribute('cy'));
  popUpNote.value = note;
}

function resetPopUp () {
  popUpNote.value = null;
  popUpX.value = NaN;
  popUpY.value = NaN;
}

const dottedFrets = computed(() => shouldShow12TETFrets.value
  ? [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
  : {
      12: [3, 5, 7, 9, 12, 15, 17, 19, 21, 24],
      16: [3, 5, 7, 9, 11, 13, 16, 19, 21, 23, 25, 27, 29, 32],
      17: [4, 7, 10, 13, 17, 21, 24, 27, 30, 34],
      24: [6, 10, 14, 18, 24, 30, 34, 38, 42, 48],
    }[divisionsPerOctave.value]
);

function hue (degree: number, upperBound: number) {
  return (360 * degree) / upperBound;
}

function hsl (degree: number, upperBound: number, l = 75) {
  return `hsl(${hue(degree, upperBound)}, 100%, ${l}%)`;
}

function hslForNote (note: { pitchClassNumber: number }, l = 50) {
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
        :x="xBoardStart + 0.5 * textOffsetX"
        :y="yBoardStart + textOffsetY"
        :font-size="fontSize"
        :transform="`rotate(90 ${xBoardStart} ${yBoardStart})`"
      >
        {{ startingFret }}
      </text>
      <text
        :x="xBoardStart - 2 * textOffsetX"
        :y="yBoardStart + fretboardLengthPx + 1.5 * textOffsetY"
        :font-size="fontSize"
        :transform="`rotate(90 ${xBoardStart - textOffsetX} ${
          yBoardStart + fretboardLengthPx + textOffsetY + 2
        })`"
        transform-origin=""
      >
        {{ endingFret }}
      </text>
      <rect
        :x="xBoardStart"
        :y="yBoardStart"
        :width="width"
        :height="fretboardLengthPx"
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
            :x="xBoardStart"
            :y="fretDistances[fret]"
            :width="width"
            :height="fretHeightsPx[fret]"
            fill="#eee"
          />
          <line
            v-if="fretSpacingPx[fret]"
            :key="fret"
            class="fret"
            :x1="xBoardStart"
            :y1="fretSpacingPx[fret]"
            :x2="xBoardStart + width"
            :y2="fretSpacingPx[fret]"
          />
        </g>
        <g v-if="shouldShow12TETFrets">
          <line
            v-for="fret in reachableFrets"
            :key="fret"
            class="tet-12-overlay fret"
            :x1="xBoardStart"
            :y1="fretSpacingPx[fret]"
            :x2="xBoardStart + width"
            :y2="fretSpacingPx[fret]"
            stroke-width="2"
          />
        </g>
      </g>
      <g class="string-group">
        <line
          v-for="string in stringQuantity - 2"
          :key="string"
          :x1="string * stringSpacing + xBoardStart"
          :y1="yBoardStart"
          :x2="string * stringSpacing + xBoardStart"
          :y2="yBoardStart + fretboardLengthPx"
        />
      </g>
      <g class="fret-dots-group">
        <g
          v-for="fretDot in dottedFrets"
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
                ? (fretSpacingPx[fretDot - 1] + fretSpacingPx[fretDot - 2]) / 2
                : fretSpacingPx[fretDot - 1]
            "
            :r="Math.min(stringSpacing / 3, fretHeightsPx[fretDot] * 0.4)"
            class="fret-dot"
          >
            <title>{{ fretHeightsPx[fretDot] * 0.666 }}, {{ stringSpacing / 3 }}</title>
          </circle>
          <circle
            v-if="fretDot % (shouldShow12TETFrets ? 12 : divisionsPerOctave) === 0"
            :cx="width * 1.2"
            :cy="
              divisionsPerOctave !== 24
                ? (fretSpacingPx[fretDot - 1] + fretSpacingPx[fretDot - 2]) / 2 
                : fretSpacingPx[fretDot - 1] 
            "
            :r="Math.min(stringSpacing / 3, fretHeightsPx[fretDot] * 0.4)"
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
            v-for="(string, index) of Object.keys(stringNotes)"
            :key="string"
          >
            <circle
              v-for="{ note, fretNumber, noteY, string: stringN } in stringNotes[string]"
              :id="`note-${note.frequency}-hz`"
              :key="`${string}-${fretNumber}`"
              class="fretted-note active"
              :cx="index * stringSpacing + xBoardStart"
              :cy="noteY"
              :r="Math.min(stringSpacing / 5)"
              :fill="hslForNote(note)"
              stroke-width="4"
              @mouseover="handleHover($event, note)"
              @mouseout="resetPopUp"
              @click="playNote(note.frequency)"
            >
              <title>{{ fretNumber }} {{ note }} {{ stringN }}</title>
            </circle>
            <circle
              v-if="detectedPitchStringsCoords"
              :cx="index * stringSpacing + xBoardStart"
              :cy="detectedPitchStringsCoords[string]"
              :r="Math.min(stringSpacing / 10)"
              fill="transparent"
              stroke="#F00"
              stroke-width="4" 
            />
          </g>
        </g>
      </g>
      <PopOver
        v-if="popUpX !== null && popUpY !== null && popUpNote"
        :x="popUpX"
        :y="popUpY"
      >
        <p>Frequency: {{ popUpNote.pitch }}</p>
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
