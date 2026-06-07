// Backward-compatible wrapper: re-exports from the Pinia store
import { useTemperamentStore } from "@/stores/temperament";

export function useTemperament() {
  const store = useTemperamentStore();
  return {
    noteNames: store.noteNames,
    notes: store.notes,
    notesDictionary: store.notesDictionary,
    notesFor: store.notesFor,
    notesDictionaryFor: store.notesDictionaryFor,
    notesInTemperament: store.notesInTemperament,
    notesInTemperamentByPitch: store.notesInTemperamentByPitch,
    Note: store.Note,
    noteFromStepsAbove: store.noteFromStepsAbove,
    distanceBetweenNotes: store.distanceBetweenNotes,
    pitchClassNames: store.pitchClassNames,
    chosenTemperamentName: store.chosenTemperamentName,
    chosenTemperament: store.chosenTemperament,
    divisionsPerOctave: store.divisionsPerOctave,
    chooseTemperament: store.chooseTemperament,
    temperamentNames: store.temperamentNames,
    notesDictionaryFor12Tet: store.notesDictionaryFor12Tet,
  };
}

export { useTemperamentStore };
