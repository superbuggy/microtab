// Timbre analysis state: one AnalyserNode fed by whichever source is active
// (mic, Tone.js test tone, or a decoded file), sampled each frame at the
// harmonics of the detected root. Module-level shared state, like
// usePitchDetection.

import * as Tone from "tone";
import { PitchDetector } from "pitchy";
import { ref } from "vue";
import { audioContext } from "@/state/usePitchDetection";
import { useAudioInputDevices } from "@/state/useAudioInputDevices";
import {
  DB_FLOOR,
  type HarmonicMeasurement,
  measureHarmonics,
  refineRootFrequency,
} from "@/state/timbre-dsp";

export type TimbreSource = "mic" | "test" | "file";
export type TestWaveform = "sawtooth" | "square" | "triangle" | "sine";

const FFT_SIZE = 8192;
// Rich timbres read noisier than a tuner's plain tone, so the gate sits a
// little looser than usePitchDetection's.
const MIN_CLARITY = 0.7;
const MIN_ROOT_HZ = 50;
const MAX_ROOT_HZ = 4000;
const ROOT_SMOOTHING = 0.35;
const HARMONIC_SMOOTHING = 0.4;
// When the gate fails, partials fade toward the floor; a sustained failure
// clears the root entirely.
const DECAY_DB_PER_FRAME = 1.25;
const GATE_RELEASE_MS = 700;
// Retuning farther than this (~70 cents) is a new note: reset per-harmonic
// smoothing so bars don't smear across the change.
const RETUNE_TOLERANCE = 0.04;

const source = ref<TimbreSource | null>(null);
const isFrozen = ref(false);
export const rootFrequency = ref<number | null>(null);
const rootClarity = ref<number | null>(null);
const harmonics = ref<HarmonicMeasurement[]>([]);
const harmonicCount = ref(16);

const testWaveform = ref<TestWaveform>("sawtooth");
const testFrequency = ref(110);
const testLevel = ref(20);

const isFileLooped = ref(false);
const fileName = ref<string | null>(null);

// Non-reactive analysis internals.
let analyserNode: AnalyserNode | null = null;
let detector: PitchDetector<Float32Array> | null = null;
let timeDomain: Float32Array<ArrayBuffer> | null = null;
let spectrumDb: Float32Array<ArrayBuffer> | null = null;
let animationFrameId: number | null = null;
let lastDetectedAt = 0;
let smoothedRoot: number | null = null;
const smoothedAmplitudes: number[] = [];

// Active source nodes, torn down on every switch.
let micStream: MediaStream | null = null;
let micSourceNode: MediaStreamAudioSourceNode | null = null;
let toneContext: Tone.Context | null = null;
let testOscillator: Tone.Oscillator | null = null;
let testGainNode: GainNode | null = null;
let fileBuffer: AudioBuffer | null = null;
let fileSourceNode: AudioBufferSourceNode | null = null;

export function useTimbreAnalysis() {
  function ensureAnalyser() {
    if (!analyserNode) {
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = FFT_SIZE;
      // Harmonic dB values get their own exponential smoothing per frame.
      analyserNode.smoothingTimeConstant = 0.3;
      detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
      detector.minVolumeDecibels = -30;
      timeDomain = new Float32Array(detector.inputLength);
      spectrumDb = new Float32Array(analyserNode.frequencyBinCount);
    }
    return {
      analyserNode: analyserNode!,
      detector: detector!,
      timeDomain: timeDomain!,
      spectrumDb: spectrumDb!,
    };
  }

  function releaseRoot() {
    rootFrequency.value = null;
    rootClarity.value = null;
    harmonics.value = [];
    smoothedRoot = null;
    smoothedAmplitudes.length = 0;
  }

  function analyzeFrame(timestamp: number) {
    animationFrameId = requestAnimationFrame(analyzeFrame);
    if (!analyserNode || !detector || !timeDomain || !spectrumDb) return;
    if (isFrozen.value || source.value === null) return;

    const sampleRate = audioContext.sampleRate;
    analyserNode.getFloatTimeDomainData(timeDomain);
    const [pitch, clarity] = detector.findPitch(timeDomain, sampleRate);

    if (
      clarity >= MIN_CLARITY &&
      pitch >= MIN_ROOT_HZ &&
      pitch <= MAX_ROOT_HZ
    ) {
      analyserNode.getFloatFrequencyData(spectrumDb);
      const refined = refineRootFrequency(
        spectrumDb,
        pitch,
        sampleRate,
        FFT_SIZE,
      );
      const detectedRoot = refined?.frequency ?? pitch;

      if (
        smoothedRoot === null ||
        Math.abs(detectedRoot - smoothedRoot) >
          Math.max(2, smoothedRoot * RETUNE_TOLERANCE)
      ) {
        smoothedAmplitudes.length = 0;
      }
      smoothedRoot =
        smoothedRoot === null
          ? detectedRoot
          : smoothedRoot * (1 - ROOT_SMOOTHING) +
            detectedRoot * ROOT_SMOOTHING;

      const measurements = measureHarmonics(
        spectrumDb,
        smoothedRoot,
        harmonicCount.value,
        sampleRate,
        FFT_SIZE,
      );
      harmonics.value = measurements.map((measurement) => {
        const index = measurement.n - 1;
        const previous = smoothedAmplitudes[index];
        const smoothed =
          previous === undefined
            ? measurement.amplitudeDb
            : previous * (1 - HARMONIC_SMOOTHING) +
              measurement.amplitudeDb * HARMONIC_SMOOTHING;
        smoothedAmplitudes[index] = smoothed;
        return { ...measurement, amplitudeDb: Math.max(DB_FLOOR, smoothed) };
      });

      rootFrequency.value = Math.round(smoothedRoot * 100) / 100;
      rootClarity.value = Math.round(clarity * 100) / 100;
      lastDetectedAt = timestamp;
    } else if (lastDetectedAt && timestamp - lastDetectedAt > GATE_RELEASE_MS) {
      releaseRoot();
    } else {
      // Brief gate failure (note decay, attack transient): fade toward floor.
      harmonics.value = harmonics.value.map((harmonic) => {
        const decayed = Math.max(
          DB_FLOOR,
          harmonic.amplitudeDb - DECAY_DB_PER_FRAME,
        );
        smoothedAmplitudes[harmonic.n - 1] = decayed;
        return { ...harmonic, amplitudeDb: decayed };
      });
    }
  }

  function startAnalysisLoop() {
    lastDetectedAt = 0;
    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(analyzeFrame);
    }
  }

  function stopAnalysisLoop() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function teardownCurrentSource() {
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }
    if (micSourceNode) {
      micSourceNode.disconnect();
      micSourceNode = null;
    }
    if (testOscillator) {
      testOscillator.stop();
      testOscillator.dispose();
      testOscillator = null;
    }
    if (testGainNode) {
      testGainNode.disconnect();
      testGainNode = null;
    }
    if (fileSourceNode) {
      fileSourceNode.onended = null;
      try {
        fileSourceNode.stop();
      } catch {
        // Already stopped.
      }
      fileSourceNode.disconnect();
      fileSourceNode = null;
    }
  }

  async function startMic() {
    teardownCurrentSource();
    const { analyserNode: analyser } = ensureAnalyser();
    await audioContext.resume();
    const { selectedDeviceId } = await useAudioInputDevices();
    // Browser DSP (AGC, noise suppression) reshapes timbre; ask for the raw signal.
    const trackConstraints: MediaTrackConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    };
    const constraints: MediaStreamConstraints = selectedDeviceId.value
      ? {
          audio: {
            ...trackConstraints,
            deviceId: { exact: selectedDeviceId.value },
          },
        }
      : { audio: trackConstraints };
    try {
      micStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      // The preferred device may be gone; fall back to the default input.
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: trackConstraints,
      });
    }
    micSourceNode = audioContext.createMediaStreamSource(micStream);
    micSourceNode.connect(analyser);
    source.value = "mic";
    releaseRoot();
    startAnalysisLoop();
  }

  async function playTestTone() {
    teardownCurrentSource();
    const { analyserNode: analyser } = ensureAnalyser();
    await audioContext.resume();
    // Bind the oscillator to the shared context without disturbing Tone's
    // global context (the tab sheet playback depends on it).
    if (!toneContext) {
      toneContext = new Tone.Context(audioContext);
    }
    testGainNode = audioContext.createGain();
    testGainNode.gain.value = testLevel.value / 100;
    testGainNode.connect(audioContext.destination);
    testOscillator = new Tone.Oscillator({
      context: toneContext,
      frequency: testFrequency.value,
      type: testWaveform.value,
    });
    testOscillator.connect(analyser);
    testOscillator.connect(testGainNode);
    testOscillator.start();
    source.value = "test";
    releaseRoot();
    startAnalysisLoop();
  }

  function updateTestTone() {
    if (testOscillator) {
      testOscillator.type = testWaveform.value;
      testOscillator.frequency.value = testFrequency.value;
    }
    if (testGainNode) {
      testGainNode.gain.value = testLevel.value / 100;
    }
  }

  async function loadFile(file: File) {
    fileBuffer = await audioContext.decodeAudioData(await file.arrayBuffer());
    fileName.value = file.name;
    playFile();
  }

  function playFile() {
    if (!fileBuffer) return;
    teardownCurrentSource();
    const { analyserNode: analyser } = ensureAnalyser();
    void audioContext.resume();
    fileSourceNode = audioContext.createBufferSource();
    fileSourceNode.buffer = fileBuffer;
    fileSourceNode.loop = isFileLooped.value;
    fileSourceNode.connect(analyser);
    fileSourceNode.connect(audioContext.destination);
    fileSourceNode.onended = () => {
      if (source.value === "file" && !isFileLooped.value) stop();
    };
    fileSourceNode.start();
    source.value = "file";
    releaseRoot();
    startAnalysisLoop();
  }

  function setFileLoop(looped: boolean) {
    isFileLooped.value = looped;
    if (fileSourceNode) fileSourceNode.loop = looped;
  }

  function stop() {
    teardownCurrentSource();
    source.value = null;
    releaseRoot();
    stopAnalysisLoop();
  }

  return {
    source,
    isFrozen,
    rootFrequency,
    rootClarity,
    harmonics,
    harmonicCount,
    testWaveform,
    testFrequency,
    testLevel,
    isFileLooped,
    fileName,
    startMic,
    playTestTone,
    updateTestTone,
    loadFile,
    playFile,
    setFileLoop,
    stop,
  };
}
