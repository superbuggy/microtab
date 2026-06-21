import { describe, it, expect } from 'vitest';
import {
  pitchClassToStaffMapping,
  staffPositionForPitch,
  staffPositionToY,
  ledgerLinesNeeded,
  isOnLine,
  formatStaffNoteLabel,
} from '../staff-notation';

describe('pitchClassToStaffMapping', () => {
  it('maps all 12 TET pitch classes', () => {
    const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (const pc of pitchClasses) {
      const m = pitchClassToStaffMapping(pc, 12);
      expect(m).toBeDefined();
    }
  });

  it('produces zero arrows for all 12 TET pitch classes', () => {
    const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (const pc of pitchClasses) {
      expect(pitchClassToStaffMapping(pc, 12)?.arrows).toBe(0);
    }
  });

  it('maps all 17 TET pitch classes', () => {
    const pitchClasses = ['C', 'C+', 'C#', 'D', 'Eb', 'E-', 'E', 'F', 'F+', 'F#', 'G', 'G#', 'Ab', 'A', 'A#', 'B-', 'B'];
    for (const pc of pitchClasses) {
      expect(pitchClassToStaffMapping(pc, 17)).toBeDefined();
    }
  });

  it('17 TET: C+ maps to up arrow on C', () => {
    const m = pitchClassToStaffMapping('C+', 17);
    expect(m?.noteLetter).toBe('C');
    expect(m?.accidental).toBeNull();
    expect(m?.arrows).toBe(1);
  });

  it('17 TET: E- maps to down arrow on E', () => {
    const m = pitchClassToStaffMapping('E-', 17);
    expect(m?.noteLetter).toBe('E');
    expect(m?.accidental).toBeNull();
    expect(m?.arrows).toBe(-1);
  });

  it('17 TET: C# maps to sharp with no arrow', () => {
    const m = pitchClassToStaffMapping('C#', 17);
    expect(m?.noteLetter).toBe('C');
    expect(m?.accidental).toBe('sharp');
    expect(m?.arrows).toBe(0);
  });

  it('maps all 24 TET pitch classes', () => {
    const pitchClasses = [
      'C', 'C+', 'C#', 'C#+', 'D', 'D+', 'D#', 'D#+',
      'E', 'E+', 'F', 'F+', 'F#', 'F#+', 'G', 'G+',
      'G#', 'G#+', 'A', 'A+', 'A#', 'A#+', 'B', 'B+',
    ];
    for (const pc of pitchClasses) {
      expect(pitchClassToStaffMapping(pc, 24)).toBeDefined();
    }
  });

  it('24 TET: C#+ maps to sharp + up arrow on C', () => {
    const m = pitchClassToStaffMapping('C#+', 24);
    expect(m?.noteLetter).toBe('C');
    expect(m?.accidental).toBe('sharp');
    expect(m?.arrows).toBe(1);
  });

  it('maps all 31 TET pitch classes', () => {
    const pitchClasses = [
      'C', 'Dbb', 'C#', 'Db', 'Cx', 'D', 'Ebb', 'D#', 'Eb', 'Dx',
      'E', 'Fb', 'E#', 'F', 'Gbb', 'F#', 'Gb', 'Fx', 'G', 'Abb',
      'G#', 'Ab', 'Gx', 'A', 'Bbb', 'A#', 'Bb', 'Ax', 'B', 'Cb', 'B#',
    ];
    for (const pc of pitchClasses) {
      expect(pitchClassToStaffMapping(pc, 31)).toBeDefined();
    }
  });

  it('31 TET: Dbb maps to ^C (up arrow on C)', () => {
    const m = pitchClassToStaffMapping('Dbb', 31);
    expect(m?.noteLetter).toBe('C');
    expect(m?.accidental).toBeNull();
    expect(m?.arrows).toBe(1);
  });

  it('31 TET: Cx maps to ^C# (sharp + up arrow on C)', () => {
    const m = pitchClassToStaffMapping('Cx', 31);
    expect(m?.noteLetter).toBe('C');
    expect(m?.accidental).toBe('sharp');
    expect(m?.arrows).toBe(1);
  });

  it('31 TET: E# maps to vF (down arrow on F)', () => {
    const m = pitchClassToStaffMapping('E#', 31);
    expect(m?.noteLetter).toBe('F');
    expect(m?.accidental).toBeNull();
    expect(m?.arrows).toBe(-1);
  });

  it('maps all 16 TET pitch classes', () => {
    const pitchClasses = ['C', 'C#', 'D', 'D#', 'Eb', 'E', 'E#', 'F', 'F#', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
    for (const pc of pitchClasses) {
      expect(pitchClassToStaffMapping(pc, 16)).toBeDefined();
    }
  });

  it('returns undefined for unknown pitch class', () => {
    expect(pitchClassToStaffMapping('Z#', 12)).toBeUndefined();
  });
});

describe('staffPositionForPitch', () => {
  it('natural notes occupy consecutive positions within an octave', () => {
    const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
    for (let i = 0; i < letters.length - 1; i++) {
      const pos1 = staffPositionForPitch(letters[i], 4);
      const pos2 = staffPositionForPitch(letters[i + 1], 4);
      expect(pos2 - pos1).toBe(1);
    }
  });

  it('C4 is at position 28', () => {
    expect(staffPositionForPitch('C', 4)).toBe(28);
  });

  it('E4 (bottom treble line) is at position 30', () => {
    expect(staffPositionForPitch('E', 4)).toBe(30);
  });

  it('octave changes add 7 to position', () => {
    const c4 = staffPositionForPitch('C', 4);
    const c5 = staffPositionForPitch('C', 5);
    expect(c5 - c4).toBe(7);
  });
});

describe('staffPositionToY', () => {
  it('higher staff positions produce lower Y values', () => {
    const lineSpacing = 12;
    const topLineY = 50;
    const yLow = staffPositionToY(30, lineSpacing, topLineY);
    const yHigh = staffPositionToY(34, lineSpacing, topLineY);
    expect(yHigh).toBeLessThan(yLow);
  });

  it('adjacent positions differ by half a line spacing', () => {
    const lineSpacing = 12;
    const topLineY = 50;
    const y1 = staffPositionToY(30, lineSpacing, topLineY);
    const y2 = staffPositionToY(31, lineSpacing, topLineY);
    expect(Math.abs(y1 - y2)).toBe(lineSpacing / 2);
  });
});

describe('ledgerLinesNeeded', () => {
  it('returns middle C ledger line for C4', () => {
    const lines = ledgerLinesNeeded(28);
    expect(lines).toContain(28);
  });

  it('returns empty for notes on the staff', () => {
    // E4 (position 30) is the bottom line — no ledger needed
    const lines = ledgerLinesNeeded(32);
    expect(lines).toHaveLength(0);
  });
});

describe('isOnLine', () => {
  it('even positions are on lines', () => {
    expect(isOnLine(30)).toBe(true);  // E4
    expect(isOnLine(32)).toBe(true);  // G4
  });

  it('odd positions are in spaces', () => {
    expect(isOnLine(31)).toBe(false); // F4
    expect(isOnLine(33)).toBe(false); // A4
  });
});

describe('formatStaffNoteLabel', () => {
  it('formats a plain natural note', () => {
    expect(formatStaffNoteLabel({
      pitchClass: 'C' as any, noteLetter: 'C', staffPositionInOctave: 0,
      accidental: null, arrows: 0, scaleDegree: 0, staffPosition: 28,
    })).toBe('C');
  });

  it('formats an up-arrow note', () => {
    expect(formatStaffNoteLabel({
      pitchClass: 'C+' as any, noteLetter: 'C', staffPositionInOctave: 0,
      accidental: null, arrows: 1, scaleDegree: 1, staffPosition: 28,
    })).toBe('^C');
  });

  it('formats a sharp + up-arrow note', () => {
    expect(formatStaffNoteLabel({
      pitchClass: 'C#+' as any, noteLetter: 'C', staffPositionInOctave: 0,
      accidental: 'sharp', arrows: 1, scaleDegree: 2, staffPosition: 28,
    })).toBe('^C#');
  });

  it('formats a down-arrow note', () => {
    expect(formatStaffNoteLabel({
      pitchClass: 'E-' as any, noteLetter: 'E', staffPositionInOctave: 2,
      accidental: null, arrows: -1, scaleDegree: 5, staffPosition: 30,
    })).toBe('vE');
  });
});
