import { computed, ref } from "vue";
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
const tet16schema = {
  name: "16 TET",
  description: "Standard 16-tone equal temperament.",
  source: "https://en.xen.wiki/w/16edo",
  referenceName: "A",
  referencePitch: 440,
  referenceOctave: 4,
  octaveBaseName: "C",
  notes: {
    D: ["D", 0],
    "D#": ["D", 75],
    Eb: ["D", 75],
    E: ["D", 150],
    "E#": ["D#", 225],
    Fb: ["D", 300],
    F: ["D", 375],
    "F#": ["D", 450],
    Gb: ["D", 450],
    G: ["D", 525],
    "G#": ["D", 600],
    Ab: ["D", 600],
    A: ["D", 675],
    "A#": ["D", 750],
    Bb: ["D", 750],
    B: ["D", 825],
    "B#": ["D#", 900],
    Cb: ["D", 975],
    C: ["D", 1050],
    "C#": ["D", 1125],
    Db: ["D", 1125],
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

const tet24 = new TET(tet24schema);
const tet16 = new TET(tet16schema);

const temperaments = [tet16, tet24];
const temperamentNames = temperaments.map(({ name }) => name);
const chosenTemperamentName = ref(temperamentNames[1]);
const chosenTemperament = computed(() =>
  temperaments.find(({ name }) => name === chosenTemperamentName.value)
);

export function useTemperament() {
  const Note = noteInTET(chosenTemperament.value);

  const chooseTemperament = (temperamentName) => {
    chosenTemperamentName.value = temperamentName;
  };

  const noteFromStepsAbove = (referenceNoteName, stepsAbove) =>
    chosenTemperament.value.noteFromStepsAbove(referenceNoteName, stepsAbove);

  const distanceBetweenNotes = (lowerNote, higherNote) =>
    chosenTemperament.value.distanceBetweenNotes(lowerNote, higherNote);

  const noteNames = chosenTemperament.value.pitchNames;
  const pitchClassNames = chosenTemperament.value.pitchClassNames;

  const notes = chosenTemperament.value.pitchNames.map(
    (pitchName) => new Note(pitchName)
  );

  // For debugging purposes
  window.chosenTemperament = chosenTemperament.value;
  window.Note = Note;

  const divisionsPerOctave = computed(
    () =>
      ({
        "16 TET": 16,
        "24 TET": 24,
      }[chosenTemperamentName.value])
  );

  return {
    noteNames,
    notes,
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
