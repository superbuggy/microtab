import type { NoteLetters, PitchClass, SupportedEDOs, ScaleDefinition } from './types';

export type StaffAccidental = 'sharp' | 'flat' | 'natural' | 'doubleSharp' | 'doubleFlat' | null;

export type StaffNoteMapping = {
  noteLetter: NoteLetters;
  staffPositionInOctave: number; // 0=C, 1=D, 2=E, 3=F, 4=G, 5=A, 6=B
  accidental: StaffAccidental;
  arrows: number; // positive=up, negative=down, 0=none
};

export type StaffNote = StaffNoteMapping & {
  pitchClass: PitchClass;
  scaleDegree: number;
  staffPosition: number; // absolute position including octave
};

const LETTER_TO_POSITION: Record<NoteLetters, number> = {
  C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
};

function mapping(
  noteLetter: NoteLetters,
  accidental: StaffAccidental,
  arrows: number,
): StaffNoteMapping {
  return {
    noteLetter,
    staffPositionInOctave: LETTER_TO_POSITION[noteLetter],
    accidental,
    arrows,
  };
}

// 12 TET: sharp-1, standard Western — no arrows
const EDO_12: Record<string, StaffNoteMapping> = {
  C:    mapping('C', null, 0),
  'C#': mapping('C', 'sharp', 0),
  D:    mapping('D', null, 0),
  'D#': mapping('D', 'sharp', 0),
  E:    mapping('E', null, 0),
  F:    mapping('F', null, 0),
  'F#': mapping('F', 'sharp', 0),
  G:    mapping('G', null, 0),
  'G#': mapping('G', 'sharp', 0),
  A:    mapping('A', null, 0),
  'A#': mapping('A', 'sharp', 0),
  B:    mapping('B', null, 0),
};

// 16 TET: flat-1, superflat — no arrows in initial implementation
const EDO_16: Record<string, StaffNoteMapping> = {
  C:    mapping('C', null, 0),
  'C#': mapping('C', 'sharp', 0),
  D:    mapping('D', null, 0),
  'D#': mapping('D', 'sharp', 0),
  Eb:   mapping('E', 'flat', 0),
  E:    mapping('E', null, 0),
  'E#': mapping('E', 'sharp', 0),
  F:    mapping('F', null, 0),
  'F#': mapping('F', 'sharp', 0),
  G:    mapping('G', null, 0),
  'G#': mapping('G', 'sharp', 0),
  Ab:   mapping('A', 'flat', 0),
  A:    mapping('A', null, 0),
  'A#': mapping('A', 'sharp', 0),
  Bb:   mapping('B', 'flat', 0),
  B:    mapping('B', null, 0),
};

// 17 TET: sharp-2, diatonic — + = up arrow, - = down arrow
const EDO_17: Record<string, StaffNoteMapping> = {
  C:    mapping('C', null, 0),
  'C+': mapping('C', null, 1),
  'C#': mapping('C', 'sharp', 0),
  D:    mapping('D', null, 0),
  Eb:   mapping('E', 'flat', 0),
  'E-': mapping('E', null, -1),
  E:    mapping('E', null, 0),
  F:    mapping('F', null, 0),
  'F+': mapping('F', null, 1),
  'F#': mapping('F', 'sharp', 0),
  G:    mapping('G', null, 0),
  'G#': mapping('G', 'sharp', 0),
  Ab:   mapping('A', 'flat', 0),
  A:    mapping('A', null, 0),
  'A#': mapping('A', 'sharp', 0),
  'B-': mapping('B', null, -1),
  B:    mapping('B', null, 0),
};

// 24 TET: sharp-2, diatonic — + = up arrow
const EDO_24: Record<string, StaffNoteMapping> = {
  C:     mapping('C', null, 0),
  'C+':  mapping('C', null, 1),
  'C#':  mapping('C', 'sharp', 0),
  'C#+': mapping('C', 'sharp', 1),
  D:     mapping('D', null, 0),
  'D+':  mapping('D', null, 1),
  'D#':  mapping('D', 'sharp', 0),
  'D#+': mapping('D', 'sharp', 1),
  E:     mapping('E', null, 0),
  'E+':  mapping('E', null, 1),
  F:     mapping('F', null, 0),
  'F+':  mapping('F', null, 1),
  'F#':  mapping('F', 'sharp', 0),
  'F#+': mapping('F', 'sharp', 1),
  G:     mapping('G', null, 0),
  'G+':  mapping('G', null, 1),
  'G#':  mapping('G', 'sharp', 0),
  'G#+': mapping('G', 'sharp', 1),
  A:     mapping('A', null, 0),
  'A+':  mapping('A', null, 1),
  'A#':  mapping('A', 'sharp', 0),
  'A#+': mapping('A', 'sharp', 1),
  B:     mapping('B', null, 0),
  'B+':  mapping('B', null, 1),
};

// 31 TET: sharp-2, meantone — translating Ron Sword names to Ups-and-Downs
// Sharp raises 2 steps, so single-step intervals get arrow modifiers
const EDO_31: Record<string, StaffNoteMapping> = {
  C:    mapping('C', null, 0),
  Dbb:  mapping('C', null, 1),       // ^C
  'C#': mapping('C', 'sharp', 0),
  Db:   mapping('D', 'flat', 0),
  Cx:   mapping('C', 'sharp', 1),    // ^C#
  D:    mapping('D', null, 0),
  Ebb:  mapping('D', null, 1),       // ^D
  'D#': mapping('D', 'sharp', 0),
  Eb:   mapping('E', 'flat', 0),
  Dx:   mapping('D', 'sharp', 1),    // ^D#
  E:    mapping('E', null, 0),
  Fb:   mapping('E', null, 1),       // ^E
  'E#': mapping('F', null, -1),      // vF
  F:    mapping('F', null, 0),
  Gbb:  mapping('F', null, 1),       // ^F
  'F#': mapping('F', 'sharp', 0),
  Gb:   mapping('G', 'flat', 0),
  Fx:   mapping('F', 'sharp', 1),    // ^F#
  G:    mapping('G', null, 0),
  Abb:  mapping('G', null, 1),       // ^G
  'G#': mapping('G', 'sharp', 0),
  Ab:   mapping('A', 'flat', 0),
  Gx:   mapping('G', 'sharp', 1),    // ^G#
  A:    mapping('A', null, 0),
  Bbb:  mapping('A', null, 1),       // ^A
  'A#': mapping('A', 'sharp', 0),
  Bb:   mapping('B', 'flat', 0),
  Ax:   mapping('A', 'sharp', 1),    // ^A#
  B:    mapping('B', null, 0),
  Cb:   mapping('B', null, 1),       // ^B
  'B#': mapping('C', null, -1),      // vC (next octave context)
};

const EDO_MAPPINGS: Record<SupportedEDOs, Record<string, StaffNoteMapping>> = {
  12: EDO_12,
  16: EDO_16,
  17: EDO_17,
  24: EDO_24,
  31: EDO_31,
};

export function pitchClassToStaffMapping(
  pitchClass: string,
  edo: SupportedEDOs,
): StaffNoteMapping | undefined {
  return EDO_MAPPINGS[edo]?.[pitchClass];
}

export function staffPositionForPitch(noteLetter: NoteLetters, octave: number): number {
  return octave * 7 + LETTER_TO_POSITION[noteLetter];
}

export function scaleToStaffNotes(
  scale: ScaleDefinition,
  pitchClassNames: PitchClass[],
  edo: SupportedEDOs,
  octave = 4,
): StaffNote[] {
  const edoMap = EDO_MAPPINGS[edo];
  if (!edoMap) return [];

  return scale.pitchClassNumbers.map((pcNum, degree) => {
    const pitchClass = pitchClassNames[pcNum % pitchClassNames.length];
    const m = edoMap[pitchClass];
    if (!m) {
      return {
        pitchClass,
        noteLetter: 'C' as NoteLetters,
        staffPositionInOctave: 0,
        accidental: null,
        arrows: 0,
        scaleDegree: degree,
        staffPosition: staffPositionForPitch('C', octave),
      };
    }
    const noteOctave = m.staffPositionInOctave < LETTER_TO_POSITION[scale.rootNoteName[0] as NoteLetters]
      ? octave + 1
      : octave;
    return {
      ...m,
      pitchClass,
      scaleDegree: degree,
      staffPosition: staffPositionForPitch(m.noteLetter, noteOctave),
    };
  });
}

// Treble clef: line positions from bottom to top are E4, G4, B4, D5, F5
// Staff position of bottom line (E4) = 4*7 + 2 = 30
const TREBLE_BOTTOM_LINE = 30; // E4
const TREBLE_TOP_LINE = 34;    // F5

export function staffPositionToY(
  staffPosition: number,
  lineSpacing: number,
  topLineY: number,
): number {
  return topLineY + (TREBLE_TOP_LINE - staffPosition) * (lineSpacing / 2);
}

export function ledgerLinesNeeded(staffPosition: number): number[] {
  const lines: number[] = [];
  if (staffPosition < TREBLE_BOTTOM_LINE) {
    for (let p = TREBLE_BOTTOM_LINE - 2; p >= staffPosition; p -= 2) {
      if (p <= staffPosition + 1) lines.push(p);
    }
  }
  // Middle C (position 28) needs a ledger line
  if (staffPosition <= 28) lines.push(28);
  if (staffPosition > TREBLE_TOP_LINE) {
    for (let p = TREBLE_TOP_LINE + 2; p <= staffPosition; p += 2) {
      lines.push(p);
    }
  }
  return lines;
}

export function isOnLine(staffPosition: number): boolean {
  return staffPosition % 2 === 0;
}

export function formatStaffNoteLabel(note: StaffNote): string {
  const arrowPrefix = note.arrows > 0
    ? '^'.repeat(note.arrows)
    : note.arrows < 0
      ? 'v'.repeat(Math.abs(note.arrows))
      : '';
  const acc = note.accidental === 'sharp' ? '#'
    : note.accidental === 'flat' ? 'b'
    : note.accidental === 'doubleSharp' ? 'x'
    : note.accidental === 'doubleFlat' ? 'bb'
    : '';
  return `${arrowPrefix}${note.noteLetter}${acc}`;
}
