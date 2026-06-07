import { computed, ref, toRefs } from "vue";
import { objectMap } from "@/helpers";
import { useTone } from "@/effects/tone";
import { noteYCoord } from "./useFretboardGeometry";

// ── Composable for fretboard notes and interactions ─────────────────────

export function useFretboardNotes(
  tuningByStringNumber: any,
  tuningByStringNumber12Tet: any,
  scaleNotesOnStrings: any,
  notesInTemperamentByPitch: any,
  notesDictionaryFor12Tet: any,
  shouldShow12TETFrets: any,
  selectedScale: any,
  pitchClassNames: any,
  startingFromFret: any,
  inputPitch: any,
  stringNotes: any
) {
  const { playNote } = useTone();

  // Popover state
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

  const stringNotesComputed = computed(() => {
    const reference = shouldShow12TETFrets.value ? notesDictionaryFor12Tet.value : notesInTemperamentByPitch.value;
    const tuning = shouldShow12TETFrets.value ? tuningByStringNumber12Tet.value : tuningByStringNumber.value;
    const stringRootFrequencies = objectMap(
      tuning,
      (_, pitchName: string) => reference[pitchName].frequency
    );

    const notesWithDistances = objectMap(stringRootFrequencies, (string: string, rootFrequency: number) =>
      scaleNotesOnStrings.value[string].map(({ note, fretNumber }: { note: any; fretNumber: number }) => ({
        note,
        fretNumber,
        string,
        noteY: noteYCoord(rootFrequency, note.frequency),
      }))
    );

    return notesWithDistances;
  });

  const detectedPitchStringsCoords = computed((): Record<string, number> | null => {
    if (inputPitch.value === null) return null;
    return objectMap(rootFrequenciesByStringNumber.value, (_, rootFrequency: number) => {
      return noteYCoord(rootFrequency, inputPitch.value as number);
    });
  });

  const rootFrequenciesByStringNumber = computed((): Record<string, number> => {
    return objectMap(
      tuningByStringNumber.value,
      (_, pitchName: string) => notesInTemperamentByPitch.value[pitchName].frequency
    );
  });

  function handleHover(event: Event, note: { pitch: string }) {
    const target = event.target as SVGElement;
    popUpX.value = Number(target.getAttribute('cx'));
    popUpY.value = Number(target.getAttribute('cy'));
    popUpNote.value = note;
  }

  function resetPopUp() {
    popUpNote.value = null;
    popUpX.value = NaN;
    popUpY.value = NaN;
  }

  return {
    // State
    popUpX,
    popUpY,
    popUpNote,
    // Computed
    noteNames,
    stringNotes: stringNotesComputed,
    detectedPitchStringsCoords,
    rootFrequenciesByStringNumber,
    // Functions
    handleHover,
    resetPopUp,
    playNote,
  };
}

// Import the pure function from geometry composable
import { noteYCoord } from "./useFretboardGeometry";
