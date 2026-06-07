import { noteInTET } from './TET.ts';

export type Note = InstanceType<ReturnType<typeof noteInTET>>;

export type StringNumber = `string${number}`;
export type GuitarChord = {
  id: string;
  [stringNumber: StringNumber]: number | null;
};

export type GuitarTuning = Record<StringNumber, PitchName>;

export type NoteLetters = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type NoteAccidentals = '#' | 'b' | '' | 'x' | 'bb' | '#+' | '+' | '-' | 'b-';
export type PitchClass = `${NoteLetters}${NoteAccidentals}`;
export type PitchName = `${PitchClass}${number}`;

export type TetSchema = {
  name: string;
  description: string;
  source: string;
  referenceName: string;
  referencePitch: number;
  referenceOctave: number;
  octaveBaseName: string;
  notes: Record<string, [string, number]>;
};

export type PitchMap = Record<string, number>;

export type SupportedEDOs = 12 | 16 | 17 | 24 | 31;

export type Key = string | number;
export type Dict = Record<Key, any>;
export type Pair = [Key, any];
export type Callback = (key: Key, value: any) => any;
export type EntriesCallback = (pair: Pair, index: number) => any;

// ── Scale domain types ───────────────────────────────────────────────

export type ScaleDefinition = {
  notes: Note[];
  period: number;
  intervals: number[];
  degrees: number;
  rootNoteName: PitchClass;
  pitchClassNumbers: number[];
};

export type PatternScaleDefinition = ScaleDefinition & {
  deltas: number[];
  walk?: number[]; // ordered offsets from root for render + playback (added later in pipeline)
};

export type PlaybackEvent = { note: number[]; id?: string };