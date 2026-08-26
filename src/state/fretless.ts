import { computed, ref, watch } from "vue";
import { scaleFromText, type ParsedScale } from "@/definitions/scale-input";
import { tileParsedScale, type TiledScale } from "@/definitions/ratio-scale";
import {
  TEMPERAMENT_PRESETS,
  poteGenerators,
  cteGenerators,
  temperTiledScale,
  type Mapping,
} from "@/definitions/rtt";
import {
  getFretlessState,
  setFretlessState,
} from "@/effects/localStorage";
import {
  shareHashFor,
  fretlessPayloadFromHash,
  type FretlessPayload,
} from "@/definitions/share-codec";

// Scale Workshop–format scale data driving the fretless guides. Restored
// from localStorage when a previous session saved any.
const persisted = (getFretlessState() ?? {}) as Partial<FretlessPayload>;

const scaleText = ref(persisted.scaleText ?? "9/8\n5/4\n4/3\n3/2\n5/3\n15/8\n2");
const periods = ref(persisted.periods ?? 2);
const parseError = ref("");

// Standard guitar tuning in Hz, string6 (low E) through string1 (high E).
// Fretless mode owns its tuning as raw frequencies so strings can be retuned
// to arbitrary just pitches.
const DEFAULT_TUNING_HZ: Record<string, number> = {
  string6: 82.4069,
  string5: 110.0,
  string4: 146.8324,
  string3: 195.9977,
  string2: 246.9417,
  string1: 329.6276,
};
const validTuning = (tuning: unknown): tuning is Record<string, number> => {
  if (!tuning || typeof tuning !== "object") return false;
  const values = Object.values(tuning as Record<string, unknown>);
  return values.length > 0 && values.every((v) => typeof v === "number" && v > 0);
};
const stringRootFrequencies = ref<Record<string, number>>(
  validTuning(persisted.stringRootFrequencies)
    ? persisted.stringRootFrequencies
    : { ...DEFAULT_TUNING_HZ }
);

const parsed = computed<ParsedScale | null>(() => {
  try {
    const result = scaleFromText(scaleText.value);
    parseError.value = "";
    return result;
  } catch (error) {
    parseError.value = (error as Error).message;
    return null;
  }
});

const tiled = computed<TiledScale | null>(() =>
  parsed.value ? tileParsedScale(parsed.value, periods.value) : null
);

// ── Temperament (optional) ───────────────────────────────────────────────

const temperamentName = ref(persisted.temperamentName ?? "none");
const tuningScheme = ref<"pote" | "cte">(persisted.tuningScheme ?? "pote");

const activeTemperament = computed<Mapping | null>(
  () => TEMPERAMENT_PRESETS.find((preset) => preset.name === temperamentName.value) ?? null
);

const generatorCents = computed<number[] | null>(() => {
  if (!activeTemperament.value) return null;
  const input = { mapping: activeTemperament.value.mapping, commas: activeTemperament.value.commas };
  return tuningScheme.value === "cte" ? cteGenerators(input) : poteGenerators(input);
});

// When a temperament is active: tempered positions drive the main guides and
// the untempered just positions remain available as a ghost overlay.
const temperedTiled = computed<TiledScale | null>(() => {
  if (!tiled.value || !activeTemperament.value || !generatorCents.value) return null;
  return temperTiledScale(tiled.value, activeTemperament.value.mapping, generatorCents.value);
});

const setStringRootFrequency = (stringNumber: string, frequency: number) => {
  if (!Number.isFinite(frequency) || frequency <= 0) return;
  stringRootFrequencies.value = {
    ...stringRootFrequencies.value,
    [stringNumber]: frequency,
  };
};

const resetTuning = () => {
  stringRootFrequencies.value = { ...DEFAULT_TUNING_HZ };
};

// ── Persistence & sharing ────────────────────────────────────────────────

watch(
  [scaleText, periods, temperamentName, tuningScheme, stringRootFrequencies],
  () => {
    setFretlessState({
      scaleText: scaleText.value,
      periods: periods.value,
      temperamentName: temperamentName.value,
      tuningScheme: tuningScheme.value,
      stringRootFrequencies: stringRootFrequencies.value,
    });
  },
  { deep: true }
);

const sharePayload = (): FretlessPayload => ({
  scaleText: scaleText.value,
  periods: periods.value,
  temperamentName: temperamentName.value,
  tuningScheme: tuningScheme.value,
  stringRootFrequencies: stringRootFrequencies.value,
});

export const fretlessShareUrl = (): string => {
  const [path] = window.location.href.split("#");
  return `${path}${shareHashFor(sharePayload())}`;
};

// Apply a share-link payload (from the URL hash). Returns false for invalid
// payloads.
export const applyFretlessPayload = (payload: FretlessPayload): boolean => {
  if (typeof payload.scaleText !== "string" || !payload.scaleText.trim()) return false;
  scaleText.value = payload.scaleText;
  if (Number.isFinite(payload.periods) && payload.periods >= 1) {
    periods.value = Math.min(4, Math.floor(payload.periods));
  }
  if (typeof payload.temperamentName === "string") {
    temperamentName.value = payload.temperamentName;
  }
  if (payload.tuningScheme === "pote" || payload.tuningScheme === "cte") {
    tuningScheme.value = payload.tuningScheme;
  }
  if (validTuning(payload.stringRootFrequencies)) {
    stringRootFrequencies.value = payload.stringRootFrequencies;
  }
  return true;
};

export const applyFretlessShareHash = (hash: string): boolean => {
  const payload = fretlessPayloadFromHash(hash);
  return payload ? applyFretlessPayload(payload) : false;
};

export function useFretlessScale() {
  return {
    scaleText,
    periods,
    parseError,
    parsed,
    tiled,
    temperedTiled,
    temperamentName,
    tuningScheme,
    generatorCents,
    activeTemperament,
    stringRootFrequencies,
    setStringRootFrequency,
    resetTuning,
  };
}
