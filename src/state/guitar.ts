// Backward-compatible wrapper: re-exports from the Pinia store
import { useGuitarStore } from "@/stores/guitar";

export function useGuitar() {
  const store = useGuitarStore();
  return {
    stringQuantity: store.stringQuantity,
    divisionsPerOctave: store.divisionsPerOctave,
    tuningByStringNumber: store.tuningByStringNumber,
    tuningByStringNumber12Tet: store.tuningByStringNumber12Tet,
    stringNumbers: store.stringNumbers,
    scaleNotesOnStrings: store.scaleNotesOnStrings,
    scaleNames: store.allScaleNames,
    selectScale: store.selectScale,
    addPatternScale: store.addPatternScale,
    patternError: store.patternError,
    generatedPlaybackSequence: store.generatedPlaybackSequence,
    selectedScaleName: store.selectedScaleName,
    selectedScale: store.selectedScale,
    notesPerString: store.notesPerString,
    selectNotesPerString: store.selectNotesPerString,
    startingFromFret: store.startingFromFret,
  };
}

export { useGuitarStore };
