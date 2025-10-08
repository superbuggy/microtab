import { ref } from "vue";
import { setKeyIn } from "@/helpers";
import { useGuitar } from "./guitar";
import { v4 as uuidv4 } from "uuid";
import { useTemperament } from "./temperament";
import * as Tone from "tone";

import type { GuitarChord, StringNumber } from "../definitions/types";

import { useTuning } from './tuning'

const { TUNING } = useTuning();
const { stringQuantity } = useGuitar();
const { notes, noteFromStepsAbove } = useTemperament();



function initializedChord(): GuitarChord {
  return Array.from({ length: stringQuantity.value }).reduce(
    (chordShape: GuitarChord, _: any, index: number) => setKeyIn(chordShape, `string${index + 1}`) as GuitarChord,
    {
      id: uuidv4(),
    }
  );
}

const chordMold = initializedChord();
const chords = ref([chordMold]);

export function useChords() {
  const findChord = (id: string) => {
    return chords.value.findIndex(({ id: idToMatch }) => id === idToMatch);
  };

  function updateChord(chord: GuitarChord) {
    const matchedChordIndex = findChord(chord.id);
    chords.value = Object.assign(chords.value, { [matchedChordIndex]: chord });
  }

  function addChord() {
    chords.value.push(initializedChord());
  }

  function removeChord(id: string) {
    const matchedChordIndex = findChord(id);
    chords.value.splice(matchedChordIndex, 1);
  }

  function chordNotes(chord: GuitarChord) {
    return Object.entries(chord)
      .filter(([key, fret]) => key !== "id" && fret !== null)
      .map(([stringName, fret]: [string, string | number | null]) =>
        noteFromStepsAbove((TUNING.value as any)[
          stringName as StringNumber], Number(fret))
      );
  }

  function chordPitches(chord: GuitarChord) {
    const notesInChord = chordNotes(chord);
    return notesInChord.map(
      (note) =>
        notes.value.find((noteToMatch) => note === noteToMatch.pitch)?.frequency
    );
  }

  function playChords() {
    const chordsAsPitches = chords.value.map(chordPitches);
    const synth = new Tone.PolySynth().toDestination();
    const part = new Tone.Part(
      (time, { pitches }) => {
        synth.triggerAttackRelease(pitches.filter((pitch): pitch is number => pitch !== undefined), 1, time);
      },
      chordsAsPitches.map((pitches, time) => ({ pitches, time }))
    );
    part.start();
    Tone.Transport.start();
  }

  return { chords, updateChord, removeChord, addChord, playChords };
}
