// Backward-compatible wrapper: re-exports from the Pinia store
import { storeToRefs } from "pinia";
import { useGuitarStore } from "@/stores/guitar";

export function useGuitar() {
  const store = useGuitarStore();
  const {
    stringQuantity,
    divisionsPerOctave,
    tuningByStringNumber,
    tuningByStringNumber12Tet,
    scaleNotesOnStrings,
    allScaleNames,
    patternError,
    generatedPlaybackSequence,
    selectedScaleName,
    selectedScale,
    notesPerString,
    startingFromFret,
  } = storeToRefs(store);

  return {
    stringQuantity,
    divisionsPerOctave,
    tuningByStringNumber,
    tuningByStringNumber12Tet,
    stringNumbers: store.stringNumbers,
    scaleNotesOnStrings,
    scaleNames: allScaleNames,
    selectScale: store.selectScale,
    addPatternScale: store.addPatternScale,
    patternError,
    generatedPlaybackSequence,
    selectedScaleName,
    selectedScale,
    notesPerString,
    selectNotesPerString: store.selectNotesPerString,
    startingFromFret,
  };
}

export { useGuitarStore };
