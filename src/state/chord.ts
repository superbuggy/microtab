import { ref } from "vue";
import { addKey } from "../helpers";
import { useGuitar } from "./guitar";
import { v4 as uuidv4 } from "uuid";
import { useTemperament } from "./temperament";
import * as Tone from "tone";

const { stringQuantity, tuning } = useGuitar();
const { notes, noteFromStepsAbove } = useTemperament();

function initializedChord() {
  return Array.from({ length: stringQuantity.value }).reduce(
    (chordShape, _, index) => addKey(chordShape, `string${index + 1}`),
    {
      id: uuidv4(),
    }
  );
}

const chordMold = initializedChord();
const chords = ref([chordMold]);

export function useChords() {
  const findChord = (id) => {
    return chords.value.findIndex(({ id: idToMatch }) => id === idToMatch);
  };

  function updateChord(chord) {
    const matchedChordIndex = findChord(chord.id);
    chords.value = Object.assign(chords.value, { [matchedChordIndex]: chord });
  }

  function addChord() {
    chords.value.push(initializedChord());
  }

  function removeChord(id) {
    const matchedChordIndex = findChord(id);
    chords.value.splice(matchedChordIndex, 1);
  }

  function chordNotes(chord) {
    return Object.entries(chord)
      .filter(([key, fret]) => key !== "id" && fret !== null)
      .map(([stringName, fret]) =>
        noteFromStepsAbove(tuning.value[stringName], fret)
      );
  }

  function chordPitches(chord) {
    const notesInChord = chordNotes(chord);
    console.log(notesInChord);
    return notesInChord.map(
      (note) =>
        notes.value.find((noteToMatch) => note === noteToMatch.pitch).frequency
    );
  }

  function playChords() {
    const chordsAsPitches = chords.value.map(chordPitches);
    const synth = new Tone.PolySynth().toDestination();
    const part = new Tone.Part(
      (time, { pitches }) => {
        synth.triggerAttackRelease(pitches, 1, time);
      },
      chordsAsPitches.map((pitches, time) => ({ pitches, time }))
    );
    part.start();
    Tone.Transport.start();
  }

  return { chords, updateChord, removeChord, addChord, playChords };
}
