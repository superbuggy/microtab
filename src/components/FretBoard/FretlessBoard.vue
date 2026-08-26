<script setup lang="ts">
import { computed, ref } from "vue";
import PopOver from "@/components/PopOver.vue";

import { hsl } from "@/helpers";
import { useTone } from "@/effects/tone";

import { useFretlessScale } from "@/state/fretless";
import { useFretBoardControls } from "@/state/fretboard-controls";

import {
  VIEWBOX_X_MAX,
  VIEWBOX_Y_MAX,
  xBoardStart,
  yBoardStart,
  width,
  fretboardLengthPx,
  noteYCoord,
} from "@/composables/useFretboardGeometry";
import { layoutFretlessOnStrings, deviationFrom12TET, type FretlessGuide } from "@/definitions/fretless-layout";

const { playNote } = useTone();
const { shouldShow12TETFrets } = useFretBoardControls();
const {
  scaleText,
  periods,
  parseError,
  tiled,
  stringRootFrequencies,
  setStringRootFrequency,
  resetTuning,
} = useFretlessScale();

const stringNumbers = computed(() =>
  Object.keys(stringRootFrequencies.value).sort().reverse()
);
const stringCount = computed(() => stringNumbers.value.length);
const stringSpacing = computed(() => (stringCount.value > 1 ? width / (stringCount.value - 1) : width));

type PositionedGuide = FretlessGuide & { string: string; y: number };

// Guides per string with SVG y coordinates derived from Mersenne's law.
const guidesByString = computed((): Record<string, PositionedGuide[]> => {
  if (!tiled.value) return {};
  const laidOut = layoutFretlessOnStrings(tiled.value, stringRootFrequencies.value);
  return Object.fromEntries(
    Object.entries(laidOut).map(([stringNumber, guides]) => [
      stringNumber,
      guides.map((guide) => ({
        ...guide,
        string: stringNumber,
        y: noteYCoord(stringRootFrequencies.value[stringNumber], guide.frequency),
      })),
    ])
  );
});

// Ghost 12-TET fret lines for reference, computed from the lowest string.
const tet12Lines = computed(() => {
  const root = stringRootFrequencies.value["string6"];
  return Array.from({ length: 25 }, (_, semitone) => ({
    semitone,
    y: noteYCoord(root, root * 2 ** (semitone / 12)),
  }));
});

const hueForGuide = (guide: FretlessGuide) => {
  const total = (tiled.value?.degrees.length ?? 2) - 1;
  return hsl(guide.degreeIndex % Math.max(total, 1), total || 1);
};

const popUpX = ref<number | null>(null);
const popUpY = ref<number | null>(null);
const popUpGuide = ref<PositionedGuide | null>(null);

function handleHover(event: Event, guide: PositionedGuide) {
  const target = event.target as SVGElement;
  popUpX.value = Number(target.getAttribute("cx"));
  popUpY.value = Number(target.getAttribute("cy"));
  popUpGuide.value = guide;
}

function resetPopUp() {
  popUpGuide.value = null;
  popUpX.value = null;
  popUpY.value = null;
}

function commitTuning(stringNumber: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  setStringRootFrequency(stringNumber, value);
}
</script>

<template>
  <section class="fretless-editor">
    <label class="scale-data-label">
      Scale data (ratios, cents, n\m, monzos, FJS — last line is the equave)
      <textarea
        v-model="scaleText"
        rows="8"
        spellcheck="false"
      />
    </label>
    <span
      v-if="parseError"
      role="alert"
      class="parse-error"
    >
      {{ parseError }}
    </span>
    <div class="fretless-tuning">
      <label>
        Periods
        <input
          v-model.number="periods"
          type="number"
          min="1"
          max="4"
        >
      </label>
      <label>
        12TET guides
        <input
          v-model="shouldShow12TETFrets"
          type="checkbox"
        >
      </label>
      <button @click="resetTuning">
        Reset tuning
      </button>
    </div>
    <div class="fretless-string-tunings">
      <label
        v-for="stringNumber in stringNumbers"
        :key="stringNumber"
      >
        {{ stringNumber }} Hz
        <input
          type="number"
          step="0.01"
          :value="stringRootFrequencies[stringNumber]"
          @change="commitTuning(stringNumber, $event)"
        >
      </label>
    </div>
  </section>

  <div class="svg-container">
    <svg :viewBox="`0 0 ${VIEWBOX_X_MAX} ${VIEWBOX_Y_MAX}`">
      <rect
        :x="xBoardStart"
        :y="yBoardStart"
        :width="width"
        :height="fretboardLengthPx"
        class="tab"
      />

      <g class="tet12-group">
        <line
          v-for="{ semitone, y } in tet12Lines.slice(1)"
          :key="`tet-${semitone}`"
          class="tet-12-overlay fret"
          :class="{ 'visible': shouldShow12TETFrets }"
          :x1="xBoardStart"
          :y1="y"
          :x2="xBoardStart + width"
          :y2="y"
        />
      </g>

      <g class="string-group">
        <line
          v-for="(stringNumber, index) in stringNumbers"
          :key="stringNumber"
          :x1="index * stringSpacing + xBoardStart"
          :y1="yBoardStart"
          :x2="index * stringSpacing + xBoardStart"
          :y2="yBoardStart + fretboardLengthPx"
        />
      </g>

      <g class="guides-group">
        <g
          v-for="(guides, stringNumber) in guidesByString"
          :key="stringNumber"
        >
          <g
            v-for="guide in (guides as PositionedGuide[])"
            :key="`${stringNumber}-${guide.degreeIndex}`"
          >
            <line
              class="guide-tick"
              :x1="xBoardStart + (stringNumbers.indexOf(stringNumber)) * stringSpacing - 10"
              :y1="guide.y"
              :x2="xBoardStart + (stringNumbers.indexOf(stringNumber)) * stringSpacing + 10"
              :y2="guide.y"
              :stroke="hueForGuide(guide)"
            />
            <circle
              :id="`note-${stringNumber}-${guide.frequency.toFixed(2)}-hz`"
              class="fretted-note active"
              :cx="(stringNumbers.indexOf(stringNumber)) * stringSpacing + xBoardStart"
              :cy="guide.y"
              :r="Math.min(stringSpacing / 5)"
              :fill="hueForGuide(guide)"
              stroke-width="4"
              @mouseover="handleHover($event, guide)"
              @mouseout="resetPopUp"
              @click="playNote(guide.frequency)"
            >
              <title>{{ guide.ratioText ?? `${guide.centsAboveRoot.toFixed(1)}c` }}</title>
            </circle>
          </g>
        </g>
      </g>

      <PopOver
        v-if="popUpX !== null && popUpY !== null && popUpGuide"
        :x="popUpX"
        :y="popUpY"
      >
        <p>
          {{ popUpGuide.ratioText ?? `${popUpGuide.centsAboveRoot.toFixed(2)} cents` }}
          · {{ popUpGuide.frequency.toFixed(2) }} Hz
          <template v-if="popUpGuide.ratioText">
            · {{ deviationFrom12TET(popUpGuide.centsAboveRoot) >= 0 ? '+' : '' }}{{
              deviationFrom12TET(popUpGuide.centsAboveRoot).toFixed(1)
            }}c vs 12TET
          </template>
        </p>
      </PopOver>
    </svg>
  </div>
</template>

<style scoped lang="scss">
.fretless-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  textarea {
    font-family: monospace;
    width: 28rem;
  }

  .parse-error {
    color: #b00020;
  }

  .fretless-tuning,
  .fretless-string-tunings {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
}

.svg-container {
  max-height: 350px;

  svg {
    width: 400px;
    transform: rotate(270deg) translate(1125px, 825px);

    text {
      font-family: "Fondamento", cursive;
      text-anchor: end;
    }

    line {
      stroke: #000;
    }

    line.tet-12-overlay {
      stroke: transparent;
      &.visible {
        stroke: #999;
        stroke-dasharray: 6 6;
      }
    }

    rect.tab {
      stroke: #000;
      fill: #fff;
    }

    line.guide-tick {
      stroke-width: 3;
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
      transition: none;
      stroke: rgba(0, 0, 0, 1);
      stroke-width: 10px;
    }
  }
}
</style>
