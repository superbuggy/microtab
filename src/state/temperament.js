import { computed, ref } from "vue";
import {
  tet12schema,
  tet16schema,
  tet17schema,
  tet24schema,
} from "../definitions/temperaments";

import { TET, noteInTET } from "../definitions/TET";
import { addKey } from "../helpers";

const schemas = [tet12schema, tet16schema, tet17schema, tet24schema];
const equalTemperaments = schemas.map((schema) => new TET(schema));
const temperaments = Object.fromEntries(
  equalTemperaments.map((temperament) => [temperament.name, temperament])
);

const temperamentNames = Object.keys(temperaments);
const chosenTemperamentName = ref(temperamentNames[3]);
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
const notesDictionary = computed(() =>
  notes.value.reduce(
    (dictionary, note) => addKey(dictionary, note.pitch, note),
    {}
  )
);

const temperamentFor = (octavalDivisions) => {
  const name = schemas.find((schema) =>
    schema.name.includes(octavalDivisions)
  ).name;
  console.log(name, temperaments[name]);
  return temperaments[name];
};

const notesFor = (octavalDivisions) => {
  const temperament = temperaments[`${octavalDivisions} TET`];
  const TETNote = noteInTET(temperament);
  return temperamentFor(octavalDivisions).pitchNames.map(
    (pitchName) => new TETNote(pitchName)
  );
};
const notesDictionaryFor = (octavalDivisions) => {
  return notesFor(octavalDivisions).reduce(
    (dictionary, note) => addKey(dictionary, note.pitch, note),
    {}
  );
};

// For debugging purposes
window.chosenTemperament = chosenTemperament.value;
window.Note = Note.value;

const divisionsPerOctave = computed(
  () =>
    ({
      // "12 TET": 12,
      "16 TET": 16,
      "17 TET": 17,
      "24 TET": 24,
    }[chosenTemperamentName.value])
);
export function useTemperament() {
  return {
    noteNames,
    notes,
    notesDictionary,
    notesFor,
    notesDictionaryFor,
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
