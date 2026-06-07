import type { Note, PitchName, StringNumber } from "./types";

export type FretNote = { note: Note; fretNumber: number };

/**
 * Layout scale notes on strings based on tuning and selection criteria.
 * Pure function - takes explicit inputs, no Vue dependencies.
 */
export function layoutScaleOnStrings(params: {
  scaleNotes: Note[];
  tuning: Record<StringNumber, PitchName>;
  stringNumbers: number[];
  noteNames: string[];
  lowestNote: PitchName;
  frettableFretSpan: number;
  startingFromFret: number;
  notesPerString: number | null;
  distanceBetweenNotes: (lower: PitchName, higher: PitchName) => number;
}): Record<StringNumber, FretNote[]> {
  const {
    scaleNotes,
    tuning,
    stringNumbers,
    noteNames,
    lowestNote,
    frettableFretSpan,
    startingFromFret,
    notesPerString,
    distanceBetweenNotes,
  } = params;

  // Initialize guitar notes structure
  const guitar: Record<StringNumber, FretNote[]> = Object.fromEntries(
    stringNumbers.map((stringNumber) => [`string${stringNumber}`, []])
  );

  for (const stringNumber in guitar) {
    const startingNoteOnString = tuning[stringNumber as StringNumber];
    const offset = distanceBetweenNotes(lowestNote, startingNoteOnString);
    const previousStringNumber = stringNumber.replace(
      /\d/,
      (n) => `${+n + 1}`
    ) as StringNumber;

    const distanceBetweenStrings = guitar[previousStringNumber]
      ? distanceBetweenNotes(
          tuning[previousStringNumber as StringNumber],
          startingNoteOnString
        )
      : 0;

    // Filter scale notes for this string's range
    const stringScale = scaleNotes
      .filter(
        (note) =>
          offset + noteNames.indexOf(lowestNote) <= note.absolutePitchNumber &&
          note.absolutePitchNumber <=
            offset + noteNames.indexOf(lowestNote) + frettableFretSpan
      )
      .map((note) => ({
        note,
        fretNumber:
          note.absolutePitchNumber -
          noteNames.indexOf(lowestNote) -
          offset +
          startingFromFret,
      }));

    if (!notesPerString) {
      guitar[stringNumber as StringNumber] = stringScale;
      continue;
    }

    // Apply notes-per-string constraint
    const priorString = guitar[previousStringNumber];
    const lastNoteOnPriorString = priorString?.at(-1);

    guitar[stringNumber as StringNumber] = stringScale
      .filter(({ fretNumber }) => {
        if (!priorString) return true;
        if (!lastNoteOnPriorString) return false;
        // Keep notes pitched above the last note on the prior string
        return (
          lastNoteOnPriorString.fretNumber <
          fretNumber + distanceBetweenStrings
        );
      })
      .slice(0, notesPerString);
  }

  return guitar;
}
