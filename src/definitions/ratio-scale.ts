// Ratio-based scale core: tiles a parsed scale across multiple periods of its
// equave and converts pitches to absolute frequencies. Nothing here assumes an
// octave period or integer step coordinates; exact rationals are carried all
// the way through so just intervals stay just.

import {
  rat,
  rationalToCents,
  type ParsedScale,
  type Rational,
  type ScalePitch,
} from "./scale-input";

export type ScaleDegree = {
  // Global degree index: 0 is the unison/root, increasing monotonically.
  index: number;
  // Which repetition of the equave this degree sits in.
  period: number;
  pitch: ScalePitch;
  label: string | null;
  color: string | null;
};

export type TiledScale = {
  degrees: ScaleDegree[];
  equaveCents: number;
};

// Multiply two pitches, keeping the result exact when both sides are exact.
export const mulPitch = (a: ScalePitch, b: ScalePitch): ScalePitch =>
  a.ratio && b.ratio
    ? {
        cents: a.cents + b.cents,
        ratio: rat(a.ratio.n * b.ratio.n, a.ratio.d * b.ratio.d),
      }
    : { cents: a.cents + b.cents, ratio: null };

// Raise a pitch to an integer power of periods.
const powPitch = (pitch: ScalePitch, exponent: number): ScalePitch => {
  let result: ScalePitch = { cents: 0, ratio: rat(1n) };
  for (let i = 0; i < exponent; i++) result = mulPitch(result, pitch);
  return result;
};

// Tile the parsed scale over `periods` repetitions of its equave. The result
// always starts at the unison (degree 0); every period contributes all of its
// degrees followed by the equave itself, so period boundaries appear as guides
// (e.g. the octave at degree 6 of a hexatonic scale).
export const tileParsedScale = (
  parsed: ParsedScale,
  periods: number
): TiledScale => {
  if (periods < 1) throw new Error("A scale needs at least one period.");

  const degrees: ScaleDegree[] = [
    {
      index: 0,
      period: 0,
      pitch: { cents: 0, ratio: rat(1n) },
      label: null,
      color: null,
    },
  ];

  let index = 0;
  for (let period = 0; period < periods; period++) {
    const shift = powPitch(parsed.equave, period);

    for (const entry of parsed.degrees) {
      index++;
      degrees.push({
        index,
        period,
        pitch: mulPitch(shift, entry.pitch),
        label: entry.label,
        color: entry.color,
      });
    }

    index++;
    degrees.push({
      index,
      period,
      pitch: mulPitch(shift, parsed.equave),
      label: null,
      color: null,
    });
  }

  return { degrees, equaveCents: parsed.equave.cents };
};

// Absolute frequency of a pitch given the frequency of its unison.
export const pitchToFrequency = (rootFrequency: number, pitch: ScalePitch) => {
  if (!pitch.ratio) return rootFrequency * 2 ** (pitch.cents / 1200);
  const { n, d } = pitch.ratio;
  return (rootFrequency * Number(n)) / Number(d);
};

// Frequencies of every tiled degree, ascending from the root.
export const tiledFrequencies = (
  tiled: TiledScale,
  rootFrequency: number
): number[] =>
  tiled.degrees.map((degree) => pitchToFrequency(rootFrequency, degree.pitch));

export const formatPitch = (pitch: ScalePitch): string =>
  pitch.ratio
    ? formatRational(pitch.ratio)
    : `${pitch.cents.toFixed(2)}c`;

const formatRational = ({ n, d }: Rational): string =>
  d === 1n ? `${n}` : `${n}/${d}`;

// Deviation of an arbitrary frequency from a target pitch, in cents.
export const centsBetween = (frequency: number, target: number): number =>
  1200 * Math.log2(frequency / target);

// Nearest tiled degree to a frequency, for snapping free positions to the
// scale while playing.
export const nearestDegreeIndex = (
  tiled: TiledScale,
  rootFrequency: number,
  frequency: number
): number => {
  const degrees = tiled.degrees;
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < degrees.length; i++) {
    const distance = Math.abs(
      centsBetween(frequency, pitchToFrequency(rootFrequency, degrees[i].pitch))
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
};

export { rationalToCents };
