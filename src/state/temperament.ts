// Backward-compatible wrapper: re-exports from the Pinia store
import { storeToRefs } from "pinia";
import { useTemperamentStore } from "@/stores/temperament";

export function useTemperament() {
  const store = useTemperamentStore();
  const {
    noteNames,
    notes,
    notesDictionary,
    notesInTemperament,
    notesInTemperamentByPitch,
    Note,
    pitchClassNames,
    chosenTemperamentName,
    chosenTemperament,
    divisionsPerOctave,
  } = storeToRefs(store);

  return {
    noteNames,
    notes,
    notesDictionary,
    notesFor: store.notesFor,
    notesDictionaryFor: store.notesDictionaryFor,
    notesInTemperament,
    notesInTemperamentByPitch,
    Note,
    noteFromStepsAbove: store.noteFromStepsAbove,
    distanceBetweenNotes: store.distanceBetweenNotes,
    pitchClassNames,
    chosenTemperamentName,
    chosenTemperament,
    divisionsPerOctave,
    chooseTemperament: store.chooseTemperament,
    temperamentNames: store.temperamentNames,
    notesDictionaryFor12Tet: store.notesDictionaryFor12Tet,
  };
}

export { useTemperamentStore };
