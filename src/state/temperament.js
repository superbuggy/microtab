import { Temperament } from "temperament";

const tet24schema = {
  name: "24 TET",
  description: "Standard 24-tone equal temperament.",
  source: "https://en.wikipedia.org/wiki/Quarter_tone#Quarter-tone_scale",
  referenceName: "A",
  referencePitch: 440,
  referenceOctave: 2,
  octaveBaseName: "C",
  notes: {
    C: ["C", 0],
    "C‡": ["C", 50],
    "C#": ["C‡", 50],
    "C#‡": ["C#", 50],
    D: ["C#‡", 50],
    "D‡": ["D", 50],
    "D#": ["D‡", 50],
    "D#‡": ["D#", 50],
    E: ["D#‡", 50],
    "E‡": ["E", 50],
    F: ["E‡", 50],
    "F‡": ["F", 50],
    "F#": ["F‡", 50],
    "F#‡": ["F#", 50],
    G: ["F#‡", 50],
    "G‡": ["G", 50],
    "G#": ["G‡", 50],
    "G#‡": ["G#", 50],
    A: ["G#‡", 50],
    "A‡": ["A", 50],
    "A#": ["A‡", 50],
    "A#‡": ["A#", 50],
    B: ["A#‡", 50],
    "B‡": ["B", 50],
  },
};
export function useTemperament() {
  const tet24 = new Temperament(tet24schema);
  const pitchFromNote = (pitch) => {
    const [, pitchClass, octave] = pitch.match(/([^0-9]+)(\d)/);
    return tet24.getPitch(pitchClass, octave);
  };
  const pitchesFromNotes = (pitches) => pitches.map(pitchFromNote);
  const noteNames = tet24
    .getOctaveRange(4)
    .flatMap((octaveNumber) =>
      tet24.noteNames.map((noteName) => noteName + octaveNumber)
    );
  const noteFromStepsAbove = (referenceNoteName, stepsAbove) => {
    const referenceNoteNameIndex = noteNames.findIndex(
      (matchedNoteName) => matchedNoteName === referenceNoteName
    );
    if (referenceNoteName === -1)
      throw new Error(
        "Note not found" + stepsAbove + " steps above " + referenceNoteName
      );

    const foundNote = noteNames[referenceNoteNameIndex + stepsAbove];
    if (!foundNote)
      throw new Error(
        "Note out of bounds" + stepsAbove + " steps above " + referenceNoteName
      );

    return foundNote;
  };

  const distanceBetweenNotes = (lowerNote, higherNote) =>
    noteNames.indexOf(higherNote) - noteNames.indexOf(lowerNote);

  window.tet24 = tet24;
  window.distanceBetweenNotes = distanceBetweenNotes;

  return {
    tet24,
    pitchFromNote,
    pitchesFromNotes,
    noteFromStepsAbove,
    distanceBetweenNotes,
  };
}
