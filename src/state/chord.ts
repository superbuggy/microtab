import { ref, type Ref } from "vue";
import { setKeyIn } from "@/helpers";
import { v4 as uuidv4 } from "uuid";
import * as Tone from "tone";
import type { GuitarChord, StringNumber, PitchName } from "../definitions/types";
import { useGuitar } from "./guitar";
import { useTemperament } from "./temperament";
import { useTuning } from "./tuning";

function createChordMold(stringQuantity: number): GuitarChord {
  return Array.from({ length: stringQuantity }).reduce(
    (chordShape: GuitarChord, _, index: number) =>
      setKeyIn(chordShape, `string${index + 1}`) as GuitarChord,
    { id: uuidv4() }
  );
}

export function useChords() {
  const { TUNING } = useTuning();
  const { stringQuantity } = useGuitar();
  const { notes, noteFromStepsAbove } = useTemperament();

  const chords: Ref<GuitarChord[]> = ref([createChordMold(stringQuantity.value)]);

  const findChord = (id: string) =>
    chords.value.findIndex(({ id: idToMatch }) => id === idToMatch);

  function updateChord(chord: GuitarChord) {
    const matchedChordIndex = findChord(chord.id);
    chords.value = [...chords.value];
    chords.value[matchedChordIndex] = chord;
  }

  function addChord() {
    chords.value.push(createChordMold(stringQuantity.value));
  }

  function removeChord(id: string) {
    const matchedChordIndex = findChord(id);
    chords.value = chords.value.filter((_, i) => i !== matchedChordIndex);
  }

  function chordNotes(chord: GuitarChord) {
    return Object.entries(chord)
      .filter(([key, fret]) => key !== "id" && fret !== null)
      .map(([stringName, fret]) =>
        noteFromStepsAbove(
          (TUNING.value as unknown as Record<StringNumber, PitchName>)[
            stringName as StringNumber
          ],
          Number(fret)
        )
      );
  }

  function chordPitches(chord: GuitarChord) {
    return chordNotes(chord).map(
      (note) => notes.value.find((noteToMatch) => note === noteToMatch.pitch)?.frequency
    );
  }

  function playChords() {
    const chordsAsPitches = chords.value.map(chordPitches);
    const synth = new Tone.PolySynth().toDestination();
    const part = new Tone.Part(
      (
        time: number,
        { pitches }: { pitches: (number | undefined)[] | undefined }
      ) => {
        if (pitches) {
          synth.triggerAttackRelease(
            pitches.filter((pitch): pitch is number => pitch !== undefined),
            1,
            time
          );
        }
      },
      chordsAsPitches.map((pitches, i) => ({ pitches, time: i }))
    );
    part.start();
    Tone.Transport.start();
  }

  return { chords, updateChord, removeChord, addChord, playChords };
}
