// Timbre analysis DSP: given a detected root (fundamental), sample the
// spectrum at each harmonic n × root and describe the partial. Everything
// here is pure so it can be tested against synthetic spectra.

import {
  frequencyToMidiNoteNumber,
  midiNoteNumberToFrequency,
  midiNoteNumberToPitchName,
} from "@/helpers";

// Partials are drawn down to this floor, relative to the root's own peak.
export const DB_FLOOR = -60;

// A fundamental peak quieter than this reads as silence.
export const FUNDAMENTAL_GATE_DB = -90;

export interface HarmonicMeasurement {
  // Harmonic number along the series (1 = the root itself).
  n: number;
  // Measured partial frequency (interpolated, Hz).
  frequency: number;
  // Peak power relative to the root's peak (dB; 0 = the root).
  amplitudeDb: number;
  // Nearest 12-TET pitch name for the partial.
  noteName: string;
  // Cents from that 12-TET pitch.
  centsFromEqualTemperament: number;
  // Cents the measured partial deviates from the pure n × root
  // (stiff-string inharmonicity reads sharp as n grows).
  inharmonicityCents: number;
}

export interface SpectralPeak {
  frequency: number;
  powerDb: number;
}

export const binWidthFor = (sampleRate: number, fftSize: number) =>
  sampleRate / fftSize;

export const centsBetween = (frequency: number, reference: number) =>
  1200 * Math.log2(frequency / reference);

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

// getFloatFrequencyData reports -Infinity for digital silence; substitute a
// finite stand-in so the interpolator never sees NaN.
const finiteDb = (value: number) => (Number.isFinite(value) ? value : -400);

// Nearest 12-TET pitch: name plus cents offset.
export function describePitch(frequency: number) {
  const midiNoteNumber = frequencyToMidiNoteNumber(frequency);
  return {
    noteName: midiNoteNumberToPitchName(midiNoteNumber),
    centsFromEqualTemperament: Math.round(
      centsBetween(frequency, midiNoteNumberToFrequency(midiNoteNumber)),
    ),
  };
}

// Standard spectral-peak interpolation: fit a parabola through the peak bin
// and its neighbors, take the vertex.
export function parabolicInterpolation(
  leftDb: number,
  centerDb: number,
  rightDb: number,
) {
  const denominator = leftDb - 2 * centerDb + rightDb;
  // `|| 0` also normalizes -0 to +0.
  const delta =
    denominator === 0
      ? 0
      : clamp((0.5 * (leftDb - rightDb)) / denominator, -0.5, 0.5) || 0;
  return {
    delta,
    powerDb: centerDb - 0.25 * (leftDb - rightDb) * delta,
  };
}

// Strongest spectral peak within halfWindowHz of targetFrequency, refined to
// sub-bin accuracy. Returns null when the target sits outside the spectrum.
export function findPeakNear(
  spectrumDb: Float32Array,
  targetFrequency: number,
  halfWindowHz: number,
  sampleRate: number,
  fftSize: number,
): SpectralPeak | null {
  const binWidth = binWidthFor(sampleRate, fftSize);
  const nyquist = sampleRate / 2;
  if (targetFrequency <= 0 || targetFrequency >= nyquist) return null;

  const firstBin = Math.max(
    1,
    Math.floor((targetFrequency - halfWindowHz) / binWidth),
  );
  const lastBin = Math.min(
    spectrumDb.length - 2,
    Math.ceil((targetFrequency + halfWindowHz) / binWidth),
  );
  if (lastBin < firstBin) return null;

  let peakBin = firstBin;
  for (let bin = firstBin; bin <= lastBin; bin += 1) {
    if (spectrumDb[bin] > spectrumDb[peakBin]) peakBin = bin;
  }

  const { delta, powerDb } = parabolicInterpolation(
    finiteDb(spectrumDb[peakBin - 1]),
    finiteDb(spectrumDb[peakBin]),
    finiteDb(spectrumDb[peakBin + 1]),
  );

  return { frequency: (peakBin + delta) * binWidth, powerDb };
}

// The autocorrelation root is bin-quantized; snap it onto the actual spectral
// fundamental so per-harmonic error doesn't multiply with n.
export function refineRootFrequency(
  spectrumDb: Float32Array,
  coarseFrequency: number,
  sampleRate: number,
  fftSize: number,
): SpectralPeak | null {
  return findPeakNear(
    spectrumDb,
    coarseFrequency,
    Math.max(binWidthFor(sampleRate, fftSize), coarseFrequency * 0.03),
    sampleRate,
    fftSize,
  );
}

const floorMeasurement = (
  n: number,
  rootFrequency: number,
): HarmonicMeasurement => ({
  n,
  frequency: n * rootFrequency,
  amplitudeDb: DB_FLOOR,
  ...describePitch(n * rootFrequency),
  inharmonicityCents: 0,
});

// Sample the spectrum at every harmonic n × root (n = 1..harmonicCount).
// Each partial gets its own peak-search window (±root/4), which absorbs small
// root drift and real inharmonicity without bleeding into the neighboring
// partial's window.
export function measureHarmonics(
  spectrumDb: Float32Array,
  rootFrequency: number,
  harmonicCount: number,
  sampleRate: number,
  fftSize: number,
): HarmonicMeasurement[] {
  const fundamental = refineRootFrequency(
    spectrumDb,
    rootFrequency,
    sampleRate,
    fftSize,
  );

  if (!fundamental || fundamental.powerDb < FUNDAMENTAL_GATE_DB) {
    return Array.from({ length: harmonicCount }, (_, index) =>
      floorMeasurement(index + 1, rootFrequency),
    );
  }

  const halfWindowHz = Math.max(
    binWidthFor(sampleRate, fftSize),
    rootFrequency / 4,
  );
  const measurements: HarmonicMeasurement[] = [];

  for (let n = 1; n <= harmonicCount; n += 1) {
    const expected = n * rootFrequency;
    const peak = findPeakNear(
      spectrumDb,
      expected,
      halfWindowHz,
      sampleRate,
      fftSize,
    );
    const measuredFrequency = peak?.frequency ?? expected;

    measurements.push({
      n,
      frequency: measuredFrequency,
      amplitudeDb: peak
        ? Math.max(DB_FLOOR, peak.powerDb - fundamental.powerDb)
        : DB_FLOOR,
      ...describePitch(measuredFrequency),
      inharmonicityCents: peak
        ? Math.round(centsBetween(measuredFrequency, expected))
        : 0,
    });
  }

  return measurements;
}
