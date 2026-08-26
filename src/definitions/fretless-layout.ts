// Pure layout for fretless mode: places every tiled scale degree on every
// string at its physically correct stop distance. Because strings may be
// retuned to arbitrary ratios, guides are computed per string instead of as
// full-width fret lines.

import { formatRatio, type Rational } from "./scale-input";
import { pitchToFrequency, type TiledScale } from "./ratio-scale";

export type FretlessGuide = {
  degreeIndex: number;
  period: number;
  frequency: number;
  ratioText: string | null;
  label: string | null;
  // Absolute size of this degree in cents above its string's open pitch.
  centsAboveRoot: number;
};

export type GuidesByString = Record<string, FretlessGuide[]>;

export const layoutFretlessOnStrings = (
  tiled: TiledScale,
  stringRootFrequencies: Record<string, number>
): GuidesByString =>
  Object.fromEntries(
    Object.entries(stringRootFrequencies).map(([stringNumber, rootFrequency]) => [
      stringNumber,
      tiled.degrees.map((degree) => ({
        degreeIndex: degree.index,
        period: degree.period,
        frequency: pitchToFrequency(rootFrequency, degree.pitch),
        ratioText: degree.pitch.ratio
          ? formatRatio(degree.pitch.ratio)
          : null,
        label: degree.label,
        centsAboveRoot: degree.pitch.cents,
      })),
    ])
  );

export type RatioTextFn = (ratio: Rational) => string;

// Deviation between a guide and the nearest 12-TET semitone, in cents. Used to
// annotate how far a just interval sits from the fretted equivalent.
export const deviationFrom12TET = (centsAboveRoot: number): number => {
  const semitones = Math.round(centsAboveRoot / 100);
  return centsAboveRoot - semitones * 100;
};
