import { ref } from "vue";
import { addKey } from "../helpers.js";
import { useGuitar } from "./guitar.js";
import { v4 as uuidv4 } from "uuid";

const { stringQuantity } = useGuitar();
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
  const findChord = (id) =>
    chords.value.findIndex((idToMatch) => id === idToMatch);

  function updateChord(id, chord) {
    const matchedChordIndex = findChord(id);
    chords.value = Object.assign(chords, { [matchedChordIndex]: chord });
  }

  function addChord() {
    chords.value.push(initializedChord());
  }

  function removeChord(id) {
    const matchedChordIndex = findChord(id);
    chords.value.splice(matchedChordIndex, 1);
  }

  return { chords, updateChord, removeChord, addChord };
}
