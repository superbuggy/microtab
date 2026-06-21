<script setup lang="ts">
import FretBoardControls from "./FretBoardControls.vue";
import PopOver from "@/components/PopOver.vue";

import { isOdd, hsl } from "@/helpers";

import { useGuitar } from "@/state/guitar";
import { useTemperament } from "@/state/temperament";
import { usePitchDetection } from "@/state/usePitchDetection";
import { useFretBoardControls } from "@/state/fretboard-controls";

import { useFretboardGeometry } from "@/composables/useFretboardGeometry";
import { useFretboardNotes } from "@/composables/useFretboardNotes";

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
  tuningByStringNumber12Tet,
} = useGuitar();

// Extract geometry logic - destructure for auto-unwrapping in template
const {
  VIEWBOX_X_MAX,
  VIEWBOX_Y_MAX,
  xBoardStart,
  yBoardStart,
  width,
  fretboardLengthPx,
  endingFret,
  reachableFrets,
  fretDistances,
  fretSpacingPx,
  fretHeightsPx,
  dottedFrets,
  stringSpacing,
  fontSize,
  textOffsetX,
  textOffsetY,
  startingFret,
} = useFretboardGeometry(
  divisionsPerOctave,
  stringQuantity,
  shouldShow12TETFrets,
  tuningByStringNumber,
  notesInTemperamentByPitch,
  notesFor
);

// Extract notes and interaction logic - destructure for auto-unwrapping in template
const {
  noteNames,
  stringNotes,
  detectedPitchStringsCoords,
  popUpX,
  popUpY,
  popUpNote,
  handleHover,
  resetPopUp,
  playNote,
} = useFretboardNotes(
  tuningByStringNumber,
  tuningByStringNumber12Tet,
  scaleNotesOnStrings,
  notesInTemperamentByPitch,
  notesDictionaryFor12Tet,
  shouldShow12TETFrets,
  selectedScale,
  pitchClassNames,
  startingFromFret,
  inputPitch
);

function hslForNote (note: { pitchClassNumber: number }, l = 50) {
  const degree = selectedScale.value.pitchClassNumbers
    .map((pitchClassNumber: number) => pitchClassNumber % selectedScale.value.period)
    .indexOf(note.pitchClassNumber);

  return hsl(degree, selectedScale.value.degrees, l);
};
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
      :style="`color: ${hsl(index as number, (noteNames.length as number) - 1)}; background-color:${hsl(
        index as number,
        noteNames.length as number,
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
              fretDot % (shouldShow12TETFrets ? 12 : (divisionsPerOctave as number)) === 0
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
            v-if="fretDot % (shouldShow12TETFrets ? 12 : (divisionsPerOctave as number)) === 0"
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
          v-for="(string, index) of Object.keys(stringNotes)"
          :key="string"
        >
          <circle
            v-for="{ note, fretNumber, noteY, string: stringN } in (stringNotes as any)[string]"
            :id="`note-${stringN}-${note.frequency}-hz`"
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
