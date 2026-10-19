<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Collapsible from "@/components/Collapsible.vue";
import HarmonicRelations from "@/components/HarmonicRelations.vue";
import HarmonicSeriesPlot from "@/components/HarmonicSeriesPlot.vue";
import { describePitch } from "@/state/timbre-dsp";
import {
  useTimbreAnalysis,
  type TimbreSource,
} from "@/state/useTimbreAnalysis";
import { useChordBuilder } from "@/state/useChordBuilder";
import { useAudioInputDevices } from "@/state/useAudioInputDevices";

const {
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
} = useTimbreAnalysis();

const SOURCE_OPTIONS: { value: TimbreSource; label: string }[] = [
  { value: "mic", label: "Live Mic" },
  { value: "test", label: "Test Tone" },
  { value: "file", label: "Audio File" },
];

const panel = ref<TimbreSource>("mic");

// Devices load without blocking setup (this view needs no Suspense).
const deviceList = ref<MediaDeviceInfo[] | null>(null);
const selectedAudioInput = ref<string | null>(null);
let setInputDevice: ((deviceId: string) => void) | null = null;

onMounted(async () => {
  const devices = await useAudioInputDevices();
  deviceList.value = devices.deviceList.value;
  selectedAudioInput.value = devices.selectedDeviceId.value;
  setInputDevice = devices.setInputDevice;
});

const audioInputs = computed(() =>
  (deviceList.value ?? []).filter((device) => device.kind === "audioinput"),
);

// Only the active panel's controls are visible; stop anything still running
// from another panel so there is always a stop button in reach.
watch(panel, () => {
  if (source.value && source.value !== panel.value) stop();
});

function handleDeviceChange() {
  if (selectedAudioInput.value) {
    setInputDevice?.(selectedAudioInput.value);
  }
  if (source.value === "mic") startMic().catch(() => {});
}

function handleMicToggle() {
  if (source.value === "mic") {
    stop();
  } else {
    startMic().catch(() => alert("Microphone access was denied."));
  }
}

function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) loadFile(file).catch(() => alert("Could not decode that file."));
}

const rootReadout = computed(() => {
  if (rootFrequency.value === null) return null;
  const { noteName, centsFromEqualTemperament } = describePitch(
    rootFrequency.value,
  );
  return {
    noteName,
    cents: centsFromEqualTemperament,
    hz: rootFrequency.value,
    clarity: rootClarity.value,
  };
});

const signedCents = (cents: number) => (cents > 0 ? `+${cents}` : `${cents}`);

const {
  ratioText,
  parseError,
  warnings,
  chordTones,
  isPlaying,
  audition,
  playChord,
  stopChord,
} = useChordBuilder();

const builderOpen = ref(true);

// Chord playback is module state; stop it when the view goes away.
onUnmounted(() => stopChord());
</script>

<template>
  <main class="timbre-analyzer">
    <h1>Timbre Analyzer</h1>
    <p class="tagline">
      Detects the root of a sound and plots its partials along the harmonic
      series.
    </p>

    <div class="source-picker">
      <label
        v-for="option in SOURCE_OPTIONS"
        :key="option.value"
      >
        <input
          v-model="panel"
          type="radio"
          :value="option.value"
        >
        {{ option.label }}
      </label>
    </div>

    <section class="source-panel">
      <template v-if="panel === 'mic'">
        <button @click="handleMicToggle">
          {{ source === 'mic' ? 'Stop Listening' : 'Start Listening' }}
        </button>
        <select
          v-model="selectedAudioInput"
          @change="handleDeviceChange"
        >
          <option
            v-for="input in audioInputs"
            :key="input.deviceId"
            :value="input.deviceId"
          >
            {{ input.label || input.deviceId }}
          </option>
        </select>
      </template>

      <template v-else-if="panel === 'test'">
        <button @click="source === 'test' ? stop() : playTestTone()">
          {{ source === 'test' ? 'Stop Tone' : 'Play Tone' }}
        </button>
        <label>
          Waveform
          <select
            v-model="testWaveform"
            @change="updateTestTone"
          >
            <option value="sawtooth">
              Sawtooth
            </option>
            <option value="square">
              Square
            </option>
            <option value="triangle">
              Triangle
            </option>
            <option value="sine">
              Sine
            </option>
          </select>
        </label>
        <label>
          Frequency (Hz)
          <input
            v-model.number="testFrequency"
            type="number"
            min="20"
            max="2000"
            step="1"
            @change="updateTestTone"
          >
        </label>
        <label class="level">
          Level
          <input
            v-model.number="testLevel"
            type="range"
            min="0"
            max="100"
            @input="updateTestTone"
          >
        </label>
      </template>

      <template v-else>
        <label class="file-label">
          Audio file
          <input
            type="file"
            accept="audio/*"
            @change="handleFileChange"
          >
        </label>
        <label>
          <input
            type="checkbox"
            :checked="isFileLooped"
            @change="setFileLoop(($event.target as HTMLInputElement).checked)"
          >
          Loop
        </label>
        <button
          :disabled="!fileName"
          @click="source === 'file' ? stop() : playFile()"
        >
          {{ source === 'file' ? 'Stop Playback' : 'Play File' }}
        </button>
        <span
          v-if="fileName"
          class="file-name"
        >{{ fileName }}</span>
      </template>
    </section>

    <section class="controls">
      <label>
        Harmonics
        <select v-model.number="harmonicCount">
          <option
            v-for="count in [8, 12, 16, 24, 32]"
            :key="count"
            :value="count"
          >
            {{ count }}
          </option>
        </select>
      </label>
      <button @click="isFrozen = !isFrozen">
        {{ isFrozen ? 'Unfreeze' : 'Freeze' }}
      </button>
    </section>

    <p
      v-if="rootReadout"
      class="root-readout"
    >
      Root <strong>{{ rootReadout.noteName }}</strong>
      <span v-if="rootReadout.cents"> {{ signedCents(rootReadout.cents) }}¢</span>
      · {{ rootReadout.hz }} Hz
      <span v-if="rootReadout.clarity !== null">
        · clarity {{ Math.round((rootReadout.clarity ?? 0) * 100) }}%
      </span>
    </p>
    <p
      v-else
      class="root-readout muted"
    >
      No root detected
    </p>

    <HarmonicSeriesPlot :harmonics="harmonics" />

    <Collapsible
      v-model:open="builderOpen"
      title="Subgroup / Ratio Builder"
    >
      <div class="builder-row">
        <label class="ratio-input">
          Ratios
          <input
            v-model="ratioText"
            type="text"
            placeholder="e.g. 5/4 3/2 7/4"
            spellcheck="false"
          >
        </label>
        <button
          :disabled="!chordTones.length"
          @click="isPlaying ? stopChord() : playChord()"
        >
          {{ isPlaying ? 'Stop Chord' : 'Play Chord' }}
        </button>
        <span
          v-if="isPlaying && audition"
          class="audition-note"
        >
          {{
            audition.detected
              ? `At detected root (${audition.hz} Hz)`
              : `No root detected — playing at ${audition.hz} Hz`
          }}
        </span>
      </div>
      <p
        v-if="parseError"
        class="parse-error"
      >
        {{ parseError }}
      </p>
      <ul
        v-if="warnings.length"
        class="parse-warnings"
      >
        <li
          v-for="warning in warnings"
          :key="warning"
        >
          {{ warning }}
        </li>
      </ul>
      <HarmonicRelations v-if="builderOpen" />
    </Collapsible>
  </main>
</template>

<style scoped>
.timbre-analyzer {
  max-width: 980px;
  margin: 0 auto;
  padding: 0 1rem;
}

.tagline {
  margin-top: -0.5rem;
  color: #666;
}

.source-picker,
.source-panel,
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.root-readout.muted {
  color: #888;
}

.file-name {
  color: #666;
  font-size: 0.9rem;
}

.builder-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.ratio-input input {
  min-width: 260px;
}

.audition-note {
  font-size: 0.85rem;
  color: #666;
}

.parse-error {
  margin: 0.5rem 0 0;
  color: #b00020;
}

.parse-warnings {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  color: #8a6d3b;
  font-size: 0.85rem;
}
</style>
