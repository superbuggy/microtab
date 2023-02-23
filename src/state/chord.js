import { ref } from "vue";
import { addKey } from "../helpers.js";
import { useGuitar } from "./guitar.js";
import { v4 as uuidv4 } from "uuid";
import { useTemperament } from "./temperament.js";
import * as Tone from "tone";

const { stringQuantity, tuning } = useGuitar();
const { pitchesFromNotes, noteFromStepsAbove } = useTemperament();

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

  function playChord(chord) {
    // const chord = findChord(id);
    const notes = Object.entries(chord)
      .filter(([key, fret]) => key !== "id" && fret !== null)
      .map(([stringName, fret]) =>
        noteFromStepsAbove(tuning.value[stringName], fret)
      );

    console.log(notes);

    const synth = new Tone.PolySynth().toDestination();
    // set the attributes across all the voices using 'set'
    // synth.set({ detune: -1200 });
    // play a chord
    synth.triggerAttackRelease(pitchesFromNotes(notes), 1);

    // console.log(tet24, chord, chords, id);
  }
  function playChords() {
    chords.value.forEach(playChord);
  }

  return { chords, updateChord, removeChord, addChord, playChord, playChords };
}
