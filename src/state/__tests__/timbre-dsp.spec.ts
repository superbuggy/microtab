import { describe, expect, it } from "vitest";
import {
  DB_FLOOR,
  binWidthFor,
  centsBetween,
  describePitch,
  measureHarmonics,
  parabolicInterpolation,
} from "../timbre-dsp";

const SAMPLE_RATE = 48000;
const FFT_SIZE = 8192;
const BIN_WIDTH = binWidthFor(SAMPLE_RATE, FFT_SIZE);
const NOISE_DB = -100;

// Build a synthetic dB spectrum: each partial is an exact parabola in the dB
// domain, so parabolic interpolation recovers its vertex precisely.
function synthesizeSpectrum(partials: { frequency: number; db: number }[]) {
  const bins = new Float32Array(FFT_SIZE / 2).fill(NOISE_DB);
  for (const { frequency, db } of partials) {
    const centerBin = frequency / BIN_WIDTH;
    for (
      let bin = Math.floor(centerBin) - 2;
      bin <= Math.ceil(centerBin) + 2;
      bin += 1
    ) {
      if (bin < 1 || bin >= bins.length - 1) continue;
      const value = db - 18 * (bin - centerBin) ** 2;
      if (value > bins[bin]) bins[bin] = value;
    }
  }
  return bins;
}

// A sawtooth: harmonic n rings at amplitude 1/n, i.e. 20·log10(1/n) dB
// below the root.
const sawPartials = (root: number, count: number) =>
  Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return { frequency: n * root, db: -20 - 20 * Math.log10(n) };
  });

describe("parabolicInterpolation", () => {
  it("recovers a centered vertex", () => {
    const { delta, powerDb } = parabolicInterpolation(3, 5, 3);
    expect(delta).toBe(0);
    expect(powerDb).toBeCloseTo(5);
  });

  it("leans toward the higher shoulder", () => {
    expect(parabolicInterpolation(5, 5, 2).delta).toBe(-0.5);
    expect(parabolicInterpolation(2, 5, 5).delta).toBe(0.5);
  });
});

describe("centsBetween", () => {
  it("measures musical intervals", () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 6);
    expect(centsBetween(660, 440)).toBeCloseTo(701.955, 2);
  });
});

describe("describePitch", () => {
  it("names 12-TET pitches with zero offset", () => {
    expect(describePitch(440)).toEqual({
      noteName: "A4",
      centsFromEqualTemperament: 0,
    });
  });

  it("measures cents to the nearest note", () => {
    expect(describePitch(446)).toEqual({
      noteName: "A4",
      centsFromEqualTemperament: 23,
    });
  });
});

describe("measureHarmonics", () => {
  it("reads a sawtooth's 1/n amplitude roll-off", () => {
    const root = 110;
    const harmonics = measureHarmonics(
      synthesizeSpectrum(sawPartials(root, 16)),
      root,
      16,
      SAMPLE_RATE,
      FFT_SIZE,
    );

    expect(harmonics).toHaveLength(16);
    for (const harmonic of harmonics) {
      expect(harmonic.amplitudeDb).toBeCloseTo(-20 * Math.log10(harmonic.n), 1);
      expect(harmonic.frequency).toBeCloseTo(harmonic.n * root, 3);
    }
  });

  it("keeps each partial inside its own window", () => {
    // A loud peak between the root and the octave must not pollute either.
    const harmonics = measureHarmonics(
      synthesizeSpectrum([
        { frequency: 110, db: -20 },
        { frequency: 165, db: -5 },
        { frequency: 220, db: -26 },
      ]),
      110,
      3,
      SAMPLE_RATE,
      FFT_SIZE,
    );

    expect(harmonics[0].amplitudeDb).toBeCloseTo(0, 1);
    expect(harmonics[1].amplitudeDb).toBeCloseTo(-6, 1);
    expect(harmonics[2].amplitudeDb).toBe(DB_FLOOR);
  });

  it("floors partials with no energy in their window", () => {
    const harmonics = measureHarmonics(
      synthesizeSpectrum([
        { frequency: 110, db: -20 },
        { frequency: 220, db: -26 },
        // nothing at 330 or above
      ]),
      110,
      5,
      SAMPLE_RATE,
      FFT_SIZE,
    );

    expect(harmonics[2].amplitudeDb).toBe(DB_FLOOR);
    expect(harmonics[4].amplitudeDb).toBe(DB_FLOOR);
  });

  it("reports stretched partials as inharmonicity", () => {
    const harmonics = measureHarmonics(
      synthesizeSpectrum([
        { frequency: 110, db: -20 },
        { frequency: 330 * 1.01, db: -29.5 },
      ]),
      110,
      3,
      SAMPLE_RATE,
      FFT_SIZE,
    );

    expect(harmonics[0].inharmonicityCents).toBeCloseTo(0, 0);
    // 1200 · log2(1.01) ≈ 17 cents sharp
    expect(harmonics[2].inharmonicityCents).toBeCloseTo(17, 0);
  });

  it("floors partials at or beyond Nyquist", () => {
    const root = 3000;
    const harmonics = measureHarmonics(
      synthesizeSpectrum(sawPartials(root, 7)),
      root,
      8,
      SAMPLE_RATE,
      FFT_SIZE,
    );

    expect(harmonics[6].amplitudeDb).toBeGreaterThan(DB_FLOOR); // 21 kHz
    expect(harmonics[7].amplitudeDb).toBe(DB_FLOOR); // 24 kHz = Nyquist
  });

  it("floors everything on a silent spectrum", () => {
    const spectrum = new Float32Array(FFT_SIZE / 2).fill(-Infinity);
    const harmonics = measureHarmonics(
      spectrum,
      110,
      8,
      SAMPLE_RATE,
      FFT_SIZE,
    );

    expect(harmonics.every((h) => h.amplitudeDb === DB_FLOOR)).toBe(true);
  });

  it("floors everything when the fundamental is inaudible", () => {
    const harmonics = measureHarmonics(
      synthesizeSpectrum([{ frequency: 110, db: -95 }]),
      110,
      4,
      SAMPLE_RATE,
      FFT_SIZE,
    );

    expect(harmonics.every((h) => h.amplitudeDb === DB_FLOOR)).toBe(true);
  });
});
