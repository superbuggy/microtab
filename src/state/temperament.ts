import { computed, ref } from "vue";
import {
  tet12schema,
  tet16schema,
  tet17schema,
  tet24schema,
} from "../definitions/temperaments";

import { TET, noteInTET } from "../definitions/TET";
import { setKeyIn } from "../helpers";
import type { PitchName, SupportedEDOs, TetSchema } from "../definitions/types";

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
const chooseTemperament = (temperamentName: string) => {
  chosenTemperamentName.value = temperamentName;
};

const Note = computed(() => noteInTET(chosenTemperament.value));

const noteFromStepsAbove = (referenceNoteName: string, stepsAbove: number) =>
  chosenTemperament.value.noteFromStepsAbove(referenceNoteName, stepsAbove);

const distanceBetweenNotes = (lowerNote: PitchName, higherNote: PitchName) =>
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
    (dictionary, note) => setKeyIn(dictionary, note.pitch, note),
    {}
  )
);

const temperamentFor = (octavalDivisions: number) => {
  const name = schemas.find((schema: TetSchema) => schema.name.includes(`${octavalDivisions}`))?.name;
  if (!name) throw new Error(`Temperament not found for ${octavalDivisions} TET  `);
  console.log(name, temperaments[name]);  
  return temperaments[name];
};

const notesFor = (octavalDivisions: number) => {
  const temperament = temperaments[`${octavalDivisions} TET`];
  const TETNote = noteInTET(temperament);
  return temperamentFor(octavalDivisions).pitchNames.map(
    (pitchName) => new TETNote(pitchName)
  );
};
const notesDictionaryFor = (octavalDivisions: number): Record<string, any> => {
  return notesFor(octavalDivisions).reduce(
    (dictionary, note) => setKeyIn(dictionary, note.pitch, note),
    {}
  );
};

// For debugging purposes
// @ts-expect-error - no property on window
window.chosenTemperament = chosenTemperament.value;
// @ts-expect-error - no property on window
window.Note = Note.value;

const divisionsPerOctave = computed(
  () =>
    ({
      // "12 TET": 12,
      "16 TET": 16,
      "17 TET": 17,
      "24 TET": 24,
    }[chosenTemperamentName.value]) as SupportedEDOs
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
