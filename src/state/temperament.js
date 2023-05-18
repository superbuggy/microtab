import { computed, ref } from "vue";
import {
  tet16schema,
  tet17schema,
  tet24schema,
} from "../definitions/temperaments";

import { TET, noteInTET } from "../definitions/TET";

const schemas = [tet16schema, tet17schema, tet24schema];
const equalTemperaments = schemas.map((schema) => new TET(schema));
const temperaments = Object.fromEntries(
  equalTemperaments.map((temperament) => [temperament.name, temperament])
);

const temperamentNames = Object.keys(temperaments);
const chosenTemperamentName = ref(temperamentNames[2]);
const chosenTemperament = computed(
  () => temperaments[chosenTemperamentName.value]
);
const chooseTemperament = (temperamentName) => {
  chosenTemperamentName.value = temperamentName;
};

const Note = computed(() => noteInTET(chosenTemperament.value));

const noteFromStepsAbove = (referenceNoteName, stepsAbove) =>
  chosenTemperament.value.noteFromStepsAbove(referenceNoteName, stepsAbove);

const distanceBetweenNotes = (lowerNote, higherNote) =>
  chosenTemperament.value.distanceBetweenNotes(lowerNote, higherNote);

const noteNames = computed(() => chosenTemperament.value.pitchNames);
const pitchClassNames = computed(() => chosenTemperament.value.pitchClassNames);

const notes = computed(() =>
  chosenTemperament.value.pitchNames.map(
    (pitchName) => new Note.value(pitchName)
  )
);

// For debugging purposes
window.chosenTemperament = chosenTemperament.value;
window.Note = Note;

const divisionsPerOctave = computed(
  () =>
    ({
      "16 TET": 16,
      "17 TET": 17,
      "24 TET": 24,
    }[chosenTemperamentName.value])
);
export function useTemperament() {
  return {
    noteNames,
    notes,
    Note,
    noteFromStepsAbove,
    distanceBetweenNotes,
    pitchClassNames,
    chosenTemperamentName,
    chosenTemperament,
    divisionsPerOctave,
    chooseTemperament,
    temperamentNames,
  };
}
