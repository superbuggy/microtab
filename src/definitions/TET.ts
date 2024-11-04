import type { TetSchema } from './types';
import { Temperament } from "temperament";
import type { PitchClass, PitchName } from './types';

export class TET extends Temperament {
  constructor(temperamentData: TetSchema) {
    super(temperamentData);
  }

  get pitchClassNames(): PitchClass[] {
    // TODO: Is this typing correct?
    return super.noteNames as PitchClass[];
  }

  get pitchNames() {
    return Array.from({ length: 8 })
      .map((_, octaveNumber) => octaveNumber)
      .flatMap((octaveNumber) =>
        this.pitchClassNames.map(
          (pitchClassName: PitchClass) => `${pitchClassName}${octaveNumber}` as PitchName
        )
      ) as PitchName[];
  }

  get stepSize() {
    console.log(this)
    return null;
  }

  frequencyFor(pitchName: PitchName) {
    const match = pitchName.match(/([^0-9]+)(\d)/);
    if (!match) {
      throw new Error(`Malformed pitch name: ${pitchName}`);
    }
    const [, pitchClass, octave] = match;
    return super.getPitch(pitchClass, Number(octave));
  }

  noteFromStepsAbove(referenceNoteName: string, stepsAbove: number) {
    const referenceNoteNameIndex = this.pitchNames.findIndex(
      (matchedNoteName) => matchedNoteName === referenceNoteName
    );

    if (referenceNoteNameIndex === -1)
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
  distanceBetweenNotes(lowerNoteName: PitchName, higherNoteName: PitchName) {
    return (
      this.pitchNames.indexOf(higherNoteName) - this.pitchNames.indexOf(lowerNoteName)
    );
  }
}

function parsePitchName(pitchName: PitchName) {
  const match = pitchName.match(/([^0-9]+)(\d)/);
  if (!match) {
    throw new Error(`Malformed pitch name: ${pitchName}`);
  }
  const [, pitchClass, octave] = match as [string, PitchClass, string];
  return { pitchClass, octave: Number(octave) };
}

export function noteInTET(temperament: TET) {
  return class Note {
    pitch: PitchName;
    pitchClass: PitchClass;
    octave: number;
    constructor(pitchName: PitchName) {
      const { pitchClass, octave } = parsePitchName(pitchName);

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
      return (temperament.pitchNames).findIndex((pitchName: PitchName) => pitchName === this.pitch);
    }

    get pitchClassNumber() {
      return temperament.noteNames.indexOf(this.pitchClass);
    }
  };
}
