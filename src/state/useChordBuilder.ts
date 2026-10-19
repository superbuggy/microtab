// Chord builder state for the timbre analyzer: constituent tones above the
// detected root (the "current sound"), their subgroup and otonal voicing,
// shared-partial map, and audition playback at the root's pitch. Module-level
// shared state, like useTimbreAnalysis.

import * as Tone from "tone";
import { computed, ref, watch } from "vue";
import { audioContext } from "@/state/usePitchDetection";
import { rootFrequency } from "@/state/useTimbreAnalysis";
import { describePitch } from "@/state/timbre-dsp";
import { chordGestaltReport } from "@/definitions/primodality";
import {
  commonDenominatorChord,
  fusionColumns,
  parseChordText,
  sharedRootPartials,
  subgroupOf,
  type ParsedTone,
} from "@/definitions/harmonic-relations";
import {
  formatRatio,
  rationalToCents,
  ratioToMonzo,
  type Rational,
} from "@/definitions/scale-input";

const DEFAULT_CHORD_TEXT = "5/4 3/2 7/4";
const FALLBACK_ROOT_HZ = 110;
// Lattice axis bounds: at least the timbre plot's 32 harmonics, capped so a
// stray high-numerator tone can't stretch the axis absurdly.
const LATTICE_MIN = 32;
const LATTICE_MAX = 96;

const ratioText = ref(DEFAULT_CHORD_TEXT);
const tones = ref<ParsedTone[]>([]);
const parseError = ref<string | null>(null);
const parseWarnings = ref<string[]>([]);

const isPlaying = ref(false);
const audition = ref<{ hz: number; detected: boolean } | null>(null);

// Audition playback internals (per-node Tone context, like the test tones).
let chordContext: Tone.Context | null = null;
let chordOscillators: Tone.Oscillator[] = [];
let chordGainNode: GainNode | null = null;

const ratiosOf = () => tones.value.map((tone) => tone.ratio);

// Lattice axis: covers every tone's first shared partial where possible.
const latticeLimit = computed(() => {
  const numerators = tones.value
    .map((tone) => Number(tone.ratio.n))
    .filter((numerator) => Number.isSafeInteger(numerator));
  const maxNumerator = numerators.length ? Math.max(...numerators) : 0;
  return Math.min(LATTICE_MAX, Math.max(LATTICE_MIN, maxNumerator));
});

export type ChordTone = {
  ratio: Rational;
  ratioText: string;
  cents: number;
  noteName: string | null;
  centsFromEqualTemperament: number | null;
  sharedPartials: number[];
};

// View model: everything the lattice and readouts need per tone. Note names
// follow the current sound's detected root.
const chordTones = computed<ChordTone[]>(() => {
  const root = rootFrequency.value;
  return tones.value.map((tone) => {
    const pitch =
      root === null
        ? null
        : describePitch((Number(tone.ratio.n) / Number(tone.ratio.d)) * root);
    return {
      ratio: tone.ratio,
      ratioText: formatRatio(tone.ratio),
      cents: Math.round(rationalToCents(tone.ratio) * 10) / 10,
      noteName: pitch?.noteName ?? null,
      centsFromEqualTemperament: pitch?.centsFromEqualTemperament ?? null,
      sharedPartials: sharedRootPartials(tone.ratio, latticeLimit.value),
    };
  });
});

const subgroup = computed(() => subgroupOf(ratiosOf()));

const subgroupWarnings = computed(() =>
  tones.value
    .filter((tone) => ratioToMonzo(tone.ratio) === null)
    .map(
      (tone) =>
        `"${formatRatio(tone.ratio)}" contains a prime beyond the factorization table; its subgroup entry is incomplete.`,
    ),
);

const warnings = computed(() => [
  ...parseWarnings.value,
  ...subgroupWarnings.value,
]);

const harmonicChord = computed(() => commonDenominatorChord(ratiosOf()));

const gestalt = computed(() =>
  tones.value.length === 0 ? null : chordGestaltReport(ratiosOf()),
);

const fusion = computed(() => fusionColumns(ratiosOf(), latticeLimit.value));

// Parse on every edit; hard errors clear the tones and surface the message.
watch(
  ratioText,
  (text) => {
    try {
      const parsed = parseChordText(text);
      tones.value = parsed.tones;
      parseWarnings.value = parsed.warnings;
      parseError.value = null;
    } catch (error) {
      parseError.value = (error as Error).message;
      tones.value = [];
      parseWarnings.value = [];
    }
  },
  { immediate: true },
);

// Edits while playing would desync the sounding chord; stop instead.
watch(tones, () => {
  if (isPlaying.value) stopChord();
});

function stopChord() {
  for (const oscillator of chordOscillators) {
    oscillator.stop();
    oscillator.dispose();
  }
  chordOscillators = [];
  if (chordGainNode) {
    chordGainNode.disconnect();
    chordGainNode = null;
  }
  isPlaying.value = false;
  audition.value = null;
}

async function playChord() {
  stopChord();
  if (tones.value.length === 0) return;
  await audioContext.resume();
  // Capture the root at press time so a drifting note can't drag the chord;
  // without a detected root, audition falls back to a labeled default.
  const detected = rootFrequency.value;
  const rootHz = detected ?? FALLBACK_ROOT_HZ;
  audition.value = { hz: rootHz, detected: detected !== null };

  // Bind to the shared context without disturbing Tone's global context.
  if (!chordContext) chordContext = new Tone.Context(audioContext);
  chordGainNode = audioContext.createGain();
  // Summed oscillators stay polite regardless of chord size.
  chordGainNode.gain.value = 0.5 / tones.value.length;
  chordGainNode.connect(audioContext.destination);

  for (const tone of tones.value) {
    const oscillator = new Tone.Oscillator({
      context: chordContext,
      frequency: (Number(tone.ratio.n) / Number(tone.ratio.d)) * rootHz,
      type: "sine",
    });
    oscillator.connect(chordGainNode);
    oscillator.start();
    chordOscillators.push(oscillator);
  }
  isPlaying.value = true;
}

export function useChordBuilder() {
  return {
    ratioText,
    parseError,
    warnings,
    chordTones,
    latticeLimit,
    subgroup,
    harmonicChord,
    gestalt,
    fusion,
    isPlaying,
    audition,
    playChord,
    stopChord,
  };
}
