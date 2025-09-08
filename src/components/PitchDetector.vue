<script setup lang="ts">
import { usePitchDetection } from "@/state/usePitchDetection";

;
import { ref, onMounted, onUnmounted } from "vue";
import Strobe from "./Strobe.vue";
import { useAudioInputDevices } from "@/state/useAudioInputDevices";

const { initializeAudio } = usePitchDetection();
const { deviceList, queryDevices, setInputDevice } = await useAudioInputDevices();
const button = ref<HTMLElement | null>(null);
const selectedAudioInput = ref<string | null>(null);

async function handleClick() {
  initializeAudio();
  await queryDevices();
  initializeAudio();
}

function handleDeviceChange(value: string) {
  alert(`Changing audio input to ${value}`);
  setInputDevice(value);
  initializeAudio();
}
  

onMounted(() => {
  button.value?.addEventListener("click", handleClick);
});

onUnmounted(() => {
  button.value?.removeEventListener("click", handleClick);
});

</script>
<template>
  <div>
    <h1>Pitch Detector</h1>
    <button ref="button">
      Load Devices
    </button>
    <div v-if="deviceList?.length">
      <select
        v-model="selectedAudioInput"
        @change="handleDeviceChange(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="input in deviceList"
          :key="input.deviceId"
          :value="input.label"
        >
          {{ input.label }}
        </option>
      </select>
    </div>
    <Strobe />
  </div>
</template>