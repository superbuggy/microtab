import { computed, ref } from "vue";
import { objectMap } from "@/helpers";
import { useTone } from "@/effects/tone";
import { noteYCoord } from "./useFretboardGeometry";
import type { Ref, ComputedRef } from "vue";
import type { Note, PitchName } from "@/definitions/types";

type MaybeRefOrComputed<T> = Ref<T> | ComputedRef<T>;
type PitchDictionary = Record<string, { frequency: number }>;

type StringNotesMap = Record<string, Array<{ note: Note; fretNumber: number; string: string; noteY: number }>>;

function unwrap<T>(value: T | Ref<T> | ComputedRef<T>): T {
  return value && typeof value === "object" && "value" in value
    ? (value as Ref<T>).value
    : (value as T);
}

export function useFretboardNotes(
  tuningByStringNumber: MaybeRefOrComputed<Record<string, PitchName>>,
  tuningByStringNumber12Tet: MaybeRefOrComputed<Record<string, PitchName>>,
  scaleNotesOnStrings: MaybeRefOrComputed<Record<string, Array<{ note: Note; fretNumber: number }>>>,
  notesInTemperamentByPitch: MaybeRefOrComputed<PitchDictionary>,
  notesDictionaryFor12Tet: MaybeRefOrComputed<PitchDictionary> | PitchDictionary,
  shouldShow12TETFrets: Ref<boolean>,
  selectedScale: MaybeRefOrComputed<{ pitchClassNumbers: number[]; period: number; degrees: number }>,
  pitchClassNames: MaybeRefOrComputed<string[]>,
  startingFromFret: MaybeRefOrComputed<number>,
  inputPitch: Ref<number | null>
) {
  const { playNote } = useTone();

  const popUpX = ref<number | null>(null);
  const popUpY = ref<number | null>(null);
  const popUpNote = ref<{ pitch: string } | null>(null);

  const noteNames = computed(() =>
    selectedScale.value.pitchClassNumbers.map(
      (pitchNumber: number) =>
        pitchClassNames.value[
          (pitchNumber + startingFromFret.value) % selectedScale.value.period
        ]
    )
  );

  const rootFrequenciesByStringNumber = computed((): Record<string, number> =>
    objectMap(tuningByStringNumber.value, (_key, pitchName) =>
      notesInTemperamentByPitch.value[pitchName as PitchName].frequency
    )
  );

  const stringNotes = computed((): StringNotesMap => {
    const reference = shouldShow12TETFrets.value
      ? unwrap(notesDictionaryFor12Tet)
      : notesInTemperamentByPitch.value;
    const tuning = shouldShow12TETFrets.value
      ? tuningByStringNumber12Tet.value
      : tuningByStringNumber.value;
    const stringRootFrequencies = objectMap(tuning, (_key, pitchName) =>
      reference[pitchName as PitchName].frequency
    );

    return objectMap(stringRootFrequencies, (string, rootFrequency) =>
      scaleNotesOnStrings.value[string].map(({ note, fretNumber }) => ({
        note,
        fretNumber,
        string,
        noteY: noteYCoord(rootFrequency as number, note.frequency),
      }))
    ) as StringNotesMap;
  });

  const detectedPitchStringsCoords = computed((): Record<string, number> | null => {
    if (inputPitch.value === null) return null;
    return objectMap(rootFrequenciesByStringNumber.value, (_key, rootFrequency) =>
      noteYCoord(rootFrequency as number, inputPitch.value as number)
    );
  });

  function handleHover(event: Event, note: { pitch: string }) {
    const target = event.target as SVGElement;
    popUpX.value = Number(target.getAttribute("cx"));
    popUpY.value = Number(target.getAttribute("cy"));
    popUpNote.value = note;
  }

  function resetPopUp() {
    popUpNote.value = null;
    popUpX.value = NaN;
    popUpY.value = NaN;
  }

  return {
    popUpX,
    popUpY,
    popUpNote,
    noteNames,
    stringNotes,
    detectedPitchStringsCoords,
    rootFrequenciesByStringNumber,
    handleHover,
    resetPopUp,
    playNote,
  };
}
