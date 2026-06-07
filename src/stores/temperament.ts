import { defineStore } from "pinia";
import { computed, ref, computed as vueComputed } from "vue";
import {
  tet12schema,
  tet16schema,
  tet17schema,
  tet24schema,
  tet31schema,
} from "@/definitions/temperaments";
import { TET, noteInTET } from "@/definitions/TET";
import { setKeyIn } from "@/helpers";
import type { PitchName } from "@/definitions/types";

const schemas = [tet12schema, tet16schema, tet17schema, tet24schema, tet31schema];
const equalTemperaments = schemas.map((schema) => new TET(schema));
const temperaments = Object.fromEntries(
  equalTemperaments.map((temperament) => [temperament.name, temperament])
);

export const useTemperamentStore = defineStore("temperament", () => {
  const chosenTemperamentName = ref(
    Object.keys(temperaments)[3] // Default to 24 TET
  );

  const chosenTemperament = vueComputed(
    () => temperaments[chosenTemperamentName.value]
  );

  const Note = vueComputed(() => noteInTET(chosenTemperament.value));

  const noteNames = vueComputed(() => chosenTemperament.value.pitchNames);
  const pitchClassNames = vueComputed(() => chosenTemperament.value.pitchClassNames);

  const notes = vueComputed(() =>
    chosenTemperament.value.pitchNames.map(
      (pitchName) => new Note.value(pitchName)
    )
  );

  const notesDictionary = vueComputed(() =>
    notes.value.reduce(
      (dictionary, note) => setKeyIn(dictionary, note.pitch, note),
      {}
    )
  );

  const divisionsPerOctave = vueComputed(() =>
    ({
      "12 TET": 12,
      "16 TET": 16,
      "17 TET": 17,
      "24 TET": 24,
      "31 TET": 31,
    }[chosenTemperamentName.value])
  );

  const noteFromStepsAbove = (referenceNoteName: string, stepsAbove: number) =>
    chosenTemperament.value.noteFromStepsAbove(referenceNoteName, stepsAbove);

  const distanceBetweenNotes = (lowerNote: PitchName, higherNote: PitchName) =>
    chosenTemperament.value.distanceBetweenNotes(lowerNote, higherNote);

  const temperamentFor = (octavalDivisions: number) => {
    const name = schemas.find((schema) => schema.name.includes(`${octavalDivisions}`))?.name;
    if (!name) throw new Error(`Temperament not found for ${octavalDivisions} TET`);
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

  const notesInTemperament = vueComputed(() => notesFor(divisionsPerOctave.value));
  const notesInTemperamentByPitch = vueComputed(() => notesDictionaryFor(divisionsPerOctave.value));
  const notesDictionaryFor12Tet = notesDictionaryFor(12);

  const chooseTemperament = (temperamentName: string) => {
    chosenTemperamentName.value = temperamentName;
  };

  const temperamentNames = Object.keys(temperaments);

  return {
    noteNames,
    notes,
    notesDictionary,
    notesFor,
    notesDictionaryFor,
    notesInTemperament,
    notesInTemperamentByPitch,
    Note,
    noteFromStepsAbove,
    distanceBetweenNotes,
    pitchClassNames,
    chosenTemperamentName,
    chosenTemperament,
    divisionsPerOctave,
    chooseTemperament,
    temperamentNames,
    notesDictionaryFor12Tet,
  };
});
