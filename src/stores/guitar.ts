import { defineStore, storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import type {
  GuitarTuning,
  PitchName,
  StringNumber,
  Note,
  Dict,
  PitchClass,
  ScaleDefinition,
  PatternScaleDefinition,
} from "@/definitions/types";
import { buildPatternScale } from "@/definitions/pattern-scale";
import { layoutScaleOnStrings } from "@/definitions/fretboard-layout";
import { buildPlaybackSequence } from "@/definitions/playback-sequence";
import { useTemperamentStore } from "./temperament";
import { useTuning } from "@/state/tuning";
import { useScales } from "@/definitions/scales";

const DEFAULT_STRING_QUANTITY = 6;

const defaultScalesPerTet: Record<number, string> = {
  12: "Ionian [7]",
  16: "Rank 3 Minor [7] A",
  17: "Otonal 17",
  24: "Ionian",
  31: "Ionian [7]",
};

export const useGuitarStore = defineStore("guitar", () => {
  const temperamentStore = useTemperamentStore();
  const { distanceBetweenNotes, notesDictionaryFor12Tet } = temperamentStore;
  const {
    noteNames,
    divisionsPerOctave,
    notesInTemperament,
    notesInTemperamentByPitch,
  } = storeToRefs(temperamentStore);

  const { TUNING } = useTuning();
  const { scaleNames, scalesFor } = useScales();

  const stringQuantity = ref(DEFAULT_STRING_QUANTITY);
  const stringNumbers = Array.from({ length: stringQuantity.value }).map(
    (_, index, { length }) => length - index
  );

  const nearestPitchInTemperament = (targetFrequency: number): PitchName =>
    notesInTemperament.value.reduce((nearest: Note, note: Note) =>
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
    ) as GuitarTuning
  );

  const tuningByStringNumber12Tet = computed<GuitarTuning>(() =>
    Object.fromEntries(
      stringNumbers.map((stringNumber, index) => [
        `string${stringNumber}`,
        TUNING.value[index],
      ])
    ) as GuitarTuning
  );

  const startingFromFret = ref(0);

  const lowestNote = computed<PitchName>(
    () => tuningByStringNumber.value[`string${stringNumbers[0]}`]
  );

  const builtInScales = ref<Record<string, ScaleDefinition>>({});
  const patternScales = ref<Record<string, PatternScaleDefinition>>({});
  const selectedScaleName = ref("Ionian");
  const patternError = ref("");

  const allScales = computed(() => ({
    ...builtInScales.value,
    ...patternScales.value,
  }));

  const selectedScale = computed(
    () => allScales.value[selectedScaleName.value]
  );

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
    ...Object.keys(patternScales.value),
  ]);

  const refreshBuiltInScales = () => {
    const root = lowestNote.value.replace(/\d/, "") as PitchClass;
    builtInScales.value = scalesFor(root);
  };

  watch(
    [divisionsPerOctave, lowestNote],
    ([perOctave]) => {
      selectedScaleName.value = defaultScalesPerTet[perOctave];
      patternScales.value = {};
      patternError.value = "";
      refreshBuiltInScales();
    },
    { immediate: true }
  );

  const notesPerString = ref<number | null>(3);

  const FRETTED_OCTAVES = 2;
  const frettableFretSpan = computed(
    () => FRETTED_OCTAVES * divisionsPerOctave.value
  );

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
      const built = buildPatternScale(
        name,
        lowestNote.value,
        divisionsPerOctave.value,
        noteNames.value,
        notesInTemperament.value,
        fretboardSpanSteps()
      );
      patternScales.value = { ...patternScales.value, [name]: built };
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

  const generatedPlaybackSequence = computed(() => {
    const current = selectedScale.value as PatternScaleDefinition | undefined;
    return buildPlaybackSequence({
      offsets: current?.walk,
      lowestNote: lowestNote.value,
      noteNames: noteNames.value,
      notesInTemperamentByPitch: notesInTemperamentByPitch.value,
      scaleNotesOnStrings: fretboardScale.value,
    });
  });

  return {
    stringQuantity,
    stringNumbers,
    startingFromFret,
    builtInScales,
    patternScales,
    allScales,
    selectedScaleName,
    patternError,
    notesPerString,
    tuningByStringNumber,
    tuningByStringNumber12Tet,
    lowestNote,
    divisionsPerOctave,
    selectedScale,
    allScaleNames,
    fretboardSpanSteps,
    frettableFretSpan,
    fretboardScale,
    scaleNotesOnStrings,
    generatedPlaybackSequence,
    selectNotesPerString,
    selectScale,
    addPatternScale,
  };
});
