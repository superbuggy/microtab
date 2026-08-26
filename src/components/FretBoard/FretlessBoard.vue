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
import { TEMPERAMENT_PRESETS } from "@/definitions/rtt";
import {
  primeFamilyScaleText,
  nejiQuantize,
  isPrime,
  adjectiveForPrime,
} from "@/definitions/primodality";

const { playNote } = useTone();
const { shouldShow12TETFrets } = useFretBoardControls();
const {
  scaleText,
  periods,
  parseError,
  tiled,
  temperedTiled,
  temperamentName,
  tuningScheme,
  generatorCents,
  stringRootFrequencies,
  setStringRootFrequency,
  resetTuning,
} = useFretlessScale();

const TEMPERAMENT_NAMES = ["none", ...TEMPERAMENT_PRESETS.map((preset) => preset.name)];

const stringNumbers = computed(() =>
  Object.keys(stringRootFrequencies.value).sort().reverse()
);
const stringCount = computed(() => stringNumbers.value.length);
const stringSpacing = computed(() => (stringCount.value > 1 ? width / (stringCount.value - 1) : width));

type PositionedGuide = FretlessGuide & { string: string; y: number };

const temperamentActive = computed(
  () => Boolean(temperedTiled.value && generatorCents.value)
);

// Guides per string with SVG y coordinates derived from Mersenne's law. When a
// temperament is active the tempered positions drive the main guides and the
// untempered just positions become ghost markers.
const guidesFor = (source: typeof tiled.value): Record<string, PositionedGuide[]> => {
  if (!source) return {};
  const laidOut = layoutFretlessOnStrings(source, stringRootFrequencies.value);
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
};

const guidesByString = computed(() => guidesFor(temperamentActive.value ? temperedTiled.value : tiled.value));
const justGuidesByString = computed(() =>
  temperamentActive.value ? guidesFor(tiled.value) : {}
);

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

// How far the tempered position sits from its untempered just source.
const deviationFromJust = (guide: PositionedGuide): number | null => {
  const just = justGuidesByString.value[guide.string]?.find(
    (candidate) => candidate.degreeIndex === guide.degreeIndex
  );
  return just ? guide.centsAboveRoot - just.centsAboveRoot : null;
};

function commitTuning(stringNumber: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  setStringRootFrequency(stringNumber, value);
}

// ── Primodal generator ───────────────────────────────────────────────────

const primodalPrime = ref(13);
const primodalMode = ref(1);
const primodalNeji = ref(false);
const primodalError = ref("");

const PRIMODAL_PRIMES = [7, 11, 13, 17, 19, 23, 29, 31];

const PRIMODAL_ADJECTIVES: Record<number, string> = Object.fromEntries(
  PRIMODAL_PRIMES.map((prime) => [prime, adjectiveForPrime(prime)])
);

function generatePrimodalScale() {
  primodalError.value = "";
  try {
    if (primodalNeji.value) {
      const { ratios } = nejiQuantize(primodalPrime.value, { mode: primodalMode.value });
      const lines = ratios.map(({ n, d }) =>
        d === 1n ? `${n}` : `${n}/${d}`
      );
      scaleText.value = lines.join("\n");
    } else {
      scaleText.value = primeFamilyScaleText(primodalPrime.value, {
        mode: primodalMode.value,
      });
    }
  } catch (error) {
    primodalError.value = (error as Error).message;
  }
}

const primodalDescription = computed(() => {
  const prime = primodalPrime.value;
  if (!isPrime(prime)) return `${prime} is not a prime`;
  const octave = primodalMode.value === 1 ? "first" : primodalMode.value === 2 ? "second" : `${primodalMode.value}th`;
  return `${octave} octave of /${prime} (${PRIMODAL_ADJECTIVES[prime] ?? adjectiveForPrime(prime)})`;
});
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
        Temperament
        <select v-model="temperamentName">
          <option
            v-for="name in TEMPERAMENT_NAMES"
            :key="name"
            :value="name"
          >
            {{ name }}
          </option>
        </select>
      </label>
      <label v-if="temperamentActive">
        Tuning
        <select v-model="tuningScheme">
          <option value="pote">
            POTE
          </option>
          <option value="cte">
            CTE
          </option>
        </select>
      </label>
      <span
        v-if="temperamentActive && generatorCents"
        class="gen-cents"
      >
        gen: {{ generatorCents.slice(1).map((c) => c.toFixed(2)).join(" ") }} c
      </span>
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
    <div class="primodal-generator">
      <label>
        Prime family
        <select v-model.number="primodalPrime">
          <option
            v-for="prime in PRIMODAL_PRIMES"
            :key="prime"
            :value="prime"
          >
            /{{ prime }} ({{ PRIMODAL_ADJECTIVES[prime] }})
          </option>
        </select>
      </label>
      <label>
        Octave
        <select v-model.number="primodalMode">
          <option :value="1">
            Mode p
          </option>
          <option :value="2">
            Mode 2p
          </option>
          <option :value="3">
            Mode 3p
          </option>
        </select>
      </label>
      <label>
        neji
        <input
          v-model="primodalNeji"
          type="checkbox"
        >
      </label>
      <button @click="generatePrimodalScale">
        Generate primodal scale
      </button>
      <span
        v-if="primodalError"
        role="alert"
        class="parse-error"
      >
        {{ primodalError }}
      </span>
      <span
        v-else
        class="primodal-description"
      >
        {{ primodalDescription }}
      </span>
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
          <!-- Untempered just positions as ghosts when tempering -->
          <g
            v-for="guide in (justGuidesByString[stringNumber] || [])"
            :key="`ji-${stringNumber}-${guide.degreeIndex}`"
          >
            <circle
              class="just-ghost"
              :cx="(stringNumbers.indexOf(stringNumber)) * stringSpacing + xBoardStart"
              :cy="guide.y"
              :r="Math.min(stringSpacing / 9)"
              fill="transparent"
              :stroke="hueForGuide(guide)"
              stroke-width="2"
            >
              <title>just: {{ guide.ratioText ?? `${guide.centsAboveRoot.toFixed(1)}c` }}</title>
            </circle>
          </g>
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
          <template v-if="temperamentActive && deviationFromJust(popUpGuide) !== null">
            · {{ deviationFromJust(popUpGuide)! >= 0 ? '+' : '' }}{{
              deviationFromJust(popUpGuide)!.toFixed(1)
            }}c vs JI
          </template>
          <template v-else-if="popUpGuide.ratioText">
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
  .fretless-string-tunings,
  .primodal-generator {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .primodal-description {
    font-style: italic;
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

    circle.just-ghost {
      pointer-events: all;
      cursor: help;
    }

    span.gen-cents {
      font-family: monospace;
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
