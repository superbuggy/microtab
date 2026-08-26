import { computed, ref } from "vue";
import { scaleFromText, type ParsedScale } from "@/definitions/scale-input";
import { tileParsedScale, type TiledScale } from "@/definitions/ratio-scale";

// Scale Workshop–format scale data driving the fretless guides.
const scaleText = ref("9/8\n5/4\n4/3\n3/2\n5/3\n15/8\n2");
const periods = ref(2);
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
const stringRootFrequencies = ref<Record<string, number>>({
  ...DEFAULT_TUNING_HZ,
});

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

export function useFretlessScale() {
  return {
    scaleText,
    periods,
    parseError,
    parsed,
    tiled,
    stringRootFrequencies,
    setStringRootFrequency,
    resetTuning,
  };
}
