import type { Note, PitchName, StringNumber } from "./types";

export type PlaybackEvent = { note: number[]; id?: string };

/**
 * Build a playback sequence from a pattern scale's walk.
 * Pure function - takes explicit inputs, no Vue dependencies.
 */
export function buildPlaybackSequence(params: {
  offsets: number[] | undefined;
  lowestNote: PitchName;
  noteNames: string[];
  notesInTemperamentByPitch: Record<string, { frequency: number }>;
  scaleNotesOnStrings: Record<StringNumber, Array<{ note: Note }>>;
}): PlaybackEvent[] | null {
  const { offsets, lowestNote, noteNames, notesInTemperamentByPitch, scaleNotesOnStrings } = params;

  if (!offsets) return null;

  // Map each rendered note's absolute pitch to its dot id for highlighting
  const idByPitchNumber: Record<number, string> = {};
  for (const [stringNumber, notes] of Object.entries(scaleNotesOnStrings)) {
    for (const { note } of notes) {
      if (!(note.absolutePitchNumber in idByPitchNumber)) {
        idByPitchNumber[note.absolutePitchNumber] = `note-${stringNumber}-${note.frequency}-hz`;
      }
    }
  }

  const rootIndex = noteNames.indexOf(lowestNote);

  return offsets
    .map((offset): PlaybackEvent | null => {
      const pitchIndex = rootIndex + offset;
      const pitchName = noteNames[pitchIndex];
      const frequency = pitchName ? notesInTemperamentByPitch[pitchName]?.frequency : undefined;
      if (frequency == null) return null;
      return { note: [frequency], id: idByPitchNumber[pitchIndex] };
    })
    .filter((event): event is PlaybackEvent => event !== null);
}
