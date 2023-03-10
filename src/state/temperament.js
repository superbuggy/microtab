import { Temperament } from "temperament";

const tet24schema = {
  name: "24 TET",
  description: "Standard 24-tone equal temperament.",
  source: "https://en.wikipedia.org/wiki/Quarter_tone#Quarter-tone_scale",
  referenceName: "A",
  referencePitch: 440,
  referenceOctave: 4,
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

class TET extends Temperament {
  constructor(temperamentData) {
    super(temperamentData);
  }

  get pitchClassNames() {
    return super.noteNames;
  }

  get pitchNames() {
    return Array.from({ length: 8 })
      .map((_, octaveNumber) => octaveNumber)
      .flatMap((octaveNumber) =>
        this.pitchClassNames.map(
          (pitchClassName) => pitchClassName + octaveNumber
        )
      );
  }

  frequencyFor(pitchName) {
    const [, pitchClass, octave] = pitchName.match(/([^0-9]+)(\d)/);
    return super.getPitch(pitchClass, octave);
  }

  noteFromStepsAbove(referenceNoteName, stepsAbove) {
    const referenceNoteNameIndex = this.pitchNames.findIndex(
      (matchedNoteName) => matchedNoteName === referenceNoteName
    );
    if (referenceNoteName === -1)
      throw new Error(
        "Note not found" + stepsAbove + " steps above " + referenceNoteName
      );

    const foundNote = this.pitchNames[referenceNoteNameIndex + stepsAbove];
    if (!foundNote)
      throw new Error(
        "Note out of bounds" + stepsAbove + " steps above " + referenceNoteName
      );

    return foundNote;
  }
  distanceBetweenNotes(lowerNote, higherNote) {
    return (
      this.pitchNames.indexOf(higherNote) - this.pitchNames.indexOf(lowerNote)
    );
  }
}

function noteInTET(temperament) {
  return class Note {
    constructor(pitchName) {
      const [, pitchClass, octave] = pitchName.match(/([^0-9]+)(\d)/);

      if (temperament.noteNames.indexOf(pitchClass) === -1) {
        throw new Error(
          `🚫🎵 Note ${pitchClass} not contained within Temperament ${temperament.name}.`
        );
      }
      this.octave = octave;
      this.pitchClass = pitchClass;
      this.pitch = pitchName;
    }

    get frequency() {
      return temperament.frequencyFor(this.pitch);
    }

    get temperament() {
      return temperament;
    }

    get absolutePitchNumber() {
      return temperament.pitchNames.findIndex(
        (pitchName) => pitchName === this.pitch
      );
    }

    get pitchClassNumber() {
      return temperament.noteNames.indexOf(this.pitchClass);
    }
  };
}

export function useTemperament() {
  const tet24 = new TET(tet24schema);
  const Note = noteInTET(tet24);

  const noteFromStepsAbove = (referenceNoteName, stepsAbove) =>
    tet24.noteFromStepsAbove(referenceNoteName, stepsAbove);
  const distanceBetweenNotes = (lowerNote, higherNote) =>
    tet24.distanceBetweenNotes(lowerNote, higherNote);
  const noteNames = tet24.pitchNames;
  const pitchClassNames = tet24.pitchClassNames;
  const notes = tet24.pitchNames.map((pitchName) => new Note(pitchName));
  window.tet24 = tet24;
  window.Note = Note;

  return {
    tet24,
    noteNames,
    notes,
    Note,
    noteFromStepsAbove,
    distanceBetweenNotes,
    pitchClassNames
  };
}
