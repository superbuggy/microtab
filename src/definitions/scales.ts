import { computed } from "vue";
import { useTemperament } from "../state/temperament";
import { scalarIntervallicDistances12EDO } from "./12-tet-scalar-intervals";
import { scalarIntervallicDistances16EDO } from "./16-tet-scalar-intervals";
import { scalarIntervallicDistances17EDO } from "./17-tet-scalar-intervals";
import { scalarIntervallicDistances24EDO } from "./24-tet-scalar-intervals";
import { scalarIntervallicDistances31EDO } from "./31-tet-scalar-intervals";
import type { PitchClass, PatternScaleDefinition, ScaleDefinition } from "./types";
import { parsePattern, stepDeltasToScale } from "./interval-pattern";
import { buildScalesForTemperament, generateScale, pitchClassNumbersFromIntervals } from "./scale-builder";

// ── Pure interval data (no Vue) ──────────────────────────────────────

const intervallicDistancesForTemperaments: Record<string, Record<string, number[]>> = {
  "12 TET": scalarIntervallicDistances12EDO,
  "16 TET": scalarIntervallicDistances16EDO,
  "17 TET": scalarIntervallicDistances17EDO,
  "24 TET": scalarIntervallicDistances24EDO,
  "31 TET": scalarIntervallicDistances31EDO,
};

/** Get the interval map for a given temperament name (pure). */
export function getIntervallicDistancesForTemperament(temperamentName: string): Record<string, number[]> {
  return intervallicDistancesForTemperaments[temperamentName] ?? {};
}

// ── Vue composable (thin glue layer) ─────────────────────────────────

/** Build built-in scales for the active temperament at a given root. */
const scalesFor = (rootNoteName: PitchClass): Record<string, ScaleDefinition> => {
  const { chosenTemperamentName, notes, pitchClassNames } = useTemperament();
  const intervallicDistances = getIntervallicDistancesForTemperament(chosenTemperamentName.value);
  return buildScalesForTemperament(
    intervallicDistances,
    rootNoteName,
    pitchClassNames.value,
    notes.value
  );
};

/** Build a scale from an interval pattern string (e.g. "+m3 +m3 +M2"). */
const scaleFromPattern = (input: string, rootNoteName: PitchClass): PatternScaleDefinition => {
  const { pitchClassNames, notes } = useTemperament();
  const edo = pitchClassNames.value.length;
  const deltas = parsePattern(input, edo);
  const { intervals, period } = stepDeltasToScale(deltas, edo);

  return {
    notes: Array.from(generateScale(intervals, rootNoteName, pitchClassNames.value, notes.value)),
    period,
    intervals,
    degrees: intervals.length,
    rootNoteName,
    deltas,
    walk: [], // will be populated by patternWalk in guitar.ts addPatternScale
    pitchClassNumbers: pitchClassNumbersFromIntervals(intervals, rootNoteName, pitchClassNames.value),
  };
};

export function useScales() {
  const { chosenTemperamentName } = useTemperament();
  
  const intervallicDistancesForChosenTemperament = computed(
    () => getIntervallicDistancesForTemperament(chosenTemperamentName.value)
  );

  const scaleNames = computed(() =>
    Object.keys(intervallicDistancesForChosenTemperament.value)
  );

  return {
    scaleNames,
    scalesFor,
    scaleFromPattern,
  };
}
