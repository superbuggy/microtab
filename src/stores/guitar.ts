import { defineStore } from "pinia";
import { computed, ref, watch, computed as vueComputed } from "vue";
import type { GuitarTuning, PitchName, StringNumber, Note, Dict, PitchClass } from "@/definitions/types";
import { useScales } from "@/definitions/scales";
import { buildPatternScale } from "@/definitions/pattern-scale";
import { layoutScaleOnStrings } from "@/definitions/fretboard-layout";
import { buildPlaybackSequence } from "@/definitions/playback-sequence";
import { useTemperamentStore } from "./temperament";
import { useTuning } from "@/state/tuning";

const { TUNING } = useTuning();
const { scaleNames, scalesFor } = useScales();
const temperament = useTemperamentStore();

const {
  distanceBetweenNotes,
  noteNames,
  divisionsPerOctave,
  notesInTemperament,
  notesInTemperamentByPitch,
  notesDictionaryFor12Tet,
} = temperament;

const DEFAULT_STRING_QUANTITY = 6;

const stringQuantity = ref(DEFAULT_STRING_QUANTITY);
const stringNumbers = Array.from({ length: stringQuantity.value }).map(
  (_, index, { length }) => length - index
);

const nearestPitchInTemperament = (targetFrequency: number): PitchName =>
  notesInTemperament.value.reduce((nearest, note) =>
    Math.abs(note.frequency - targetFrequency) <
    Math.abs(nearest.frequency - targetFrequency)
      ? note
      : nearest
  ).pitch;

const resolveTuningPitch = (pitchName: PitchName): PitchName => {
  if (notesInTemperamentByPitch.value[pitchName]) return pitchName;
  const target = notesDictionaryFor12Tet[pitchName]?.frequency;
  return target == null ? pitchName : nearestPitchInTemperament(target);
};

const tuningByStringNumber = computed<GuitarTuning>(() =>
  Object.fromEntries(
    stringNumbers.map((stringNumber, index) => [
      `string${stringNumber}`,
      resolveTuningPitch(TUNING.value[index]),
    ])
  )
);

const tuningByStringNumber12Tet = computed<GuitarTuning>(() =>
  Object.fromEntries(
    stringNumbers.map((stringNumber, index) => [
      `string${stringNumber}`,
      TUNING.value[index],
    ])
  )
);

const startingFromFret = ref(0);

const lowestNote = computed<PitchName>(
  () => tuningByStringNumber.value[`string${stringNumbers[0]}`]
);

const scales = ref<Record<string, any>>({});
const selectedScaleName = ref("Ionian");

const customScales = ref<Record<string, any>>({});
const patternError = ref("");

const selectedScale = computed(() => scales.value[selectedScaleName.value]);

const fretboardSpanSteps = (): number => {
  const rootIndex = noteNames.value.indexOf(lowestNote.value);
  const highestStringRoot =
    tuningByStringNumber.value[`string${stringNumbers.at(-1)}` as StringNumber];
  const highestIndex =
    noteNames.value.indexOf(highestStringRoot) + frettableFretSpan.value;
  return Math.max(highestIndex - rootIndex, divisionsPerOctave.value);
};

const allScaleNames = computed(() => [
  ...scaleNames.value,
  ...Object.keys(customScales.value),
]);

const defaultScalesPerTet: Record<number, string> = {
  12: "Ionian [7]",
  16: "Rank 3 Minor [7] A",
  17: "Otonal 17",
  24: "Ionian",
  31: "Ionian [7]",
};

watch([divisionsPerOctave, lowestNote], ([perOctave, currentLowestNote]) => {
  selectedScaleName.value = defaultScalesPerTet[perOctave];
  customScales.value = {};
  patternError.value = "";
  scales.value = scalesFor(currentLowestNote.replace(/\d/, "") as PitchClass);
});

const notesPerString = ref<number | null>(3);

const FRETTED_OCTAVES = 2;
const frettableFretSpan = computed(() => FRETTED_OCTAVES * divisionsPerOctave.value);

export const useGuitarStore = defineStore("guitar", () => {
  const selectNotesPerString = (perString: string) => {
    notesPerString.value = perString === "All" ? null : Number(perString);
  };

  const selectScale = (scaleName: string) => {
    selectedScaleName.value = scaleName;
  };

  const addPatternScale = (input: string) => {
    patternError.value = "";
    const name = input.trim();
    if (!name) {
      patternError.value = "Pattern is empty.";
      return;
    }
    try {
      const rootNoteName = lowestNote.value.replace(/\d/, "") as PitchClass;
      const built = buildPatternScale(
        name,
        rootNoteName,
        divisionsPerOctave.value,
        noteNames.value,
        notesInTemperament.value,
        fretboardSpanSteps()
      );
      customScales.value = { ...customScales.value, [name]: built };
      scales.value = { ...scales.value, [name]: built } as typeof scales.value;
      selectScale(name);
    } catch (error) {
      patternError.value = (error as Error).message;
    }
  };

  const fretboardScale = computed(() =>
    layoutScaleOnStrings({
      scaleNotes: selectedScale.value.notes as Note[],
      tuning: tuningByStringNumber.value,
      stringNumbers,
      noteNames: noteNames.value,
      lowestNote: lowestNote.value,
      frettableFretSpan: frettableFretSpan.value,
      startingFromFret: startingFromFret.value,
      notesPerString: notesPerString.value,
      distanceBetweenNotes,
    })
  );

  const scaleNotesOnStrings = computed<Dict>(() => fretboardScale.value);

  type PlaybackEvent = { note: number[]; id?: string };
  const generatedPlaybackSequence = computed<PlaybackEvent[] | null>(() => {
    const current = selectedScale.value as
      | { sequence?: number[] }
      | undefined;
    return buildPlaybackSequence({
      offsets: current?.sequence,
      lowestNote: lowestNote.value,
      noteNames: noteNames.value,
      notesInTemperamentByPitch: notesInTemperamentByPitch.value,
      scaleNotesOnStrings: fretboardScale.value,
    });
  });

  // Initialize default scale selection
  selectScale(selectedScaleName.value);

  return {
    // State
    stringQuantity,
    stringNumbers,
    startingFromFret,
    scales,
    selectedScaleName,
    customScales,
    patternError,
    notesPerString,
    // Computed
    tuningByStringNumber,
    tuningByStringNumber12Tet,
    lowestNote,
    divisionsPerOctave,
    selectedScale,
    allScaleNames: allScaleNames,
    fretboardSpanSteps,
    frettableFretSpan,
    fretboardScale,
    scaleNotesOnStrings,
    generatedPlaybackSequence,
    // Actions
    selectNotesPerString,
    selectScale,
    addPatternScale,
  };
});
