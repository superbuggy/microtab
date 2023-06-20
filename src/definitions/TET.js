import { Temperament } from "temperament";

export class TET extends Temperament {
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

  get stepSize() {
    console.log(this)
    return null;
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

export function noteInTET(temperament) {
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