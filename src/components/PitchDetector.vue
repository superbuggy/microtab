<script setup lang="ts">
import { usePitchDetection, audioContext } from "@/state/usePitchDetection";
import { ref, onMounted } from "vue";

const { pitch, clarity } = usePitchDetection();
const button = ref<HTMLElement | null>(null);
const audioInputs = ref<MediaDeviceInfo[] | null>(null);
const selectedAudioInput = ref<string | null>(null);

onMounted(() => {
  button.value?.addEventListener("click", () => audioContext.resume());

  navigator.mediaDevices.enumerateDevices().then((devices) => {
    audioInputs.value = devices.filter((device) => device.kind === "audioinput");
  });
});

</script>
<template>
  <div>
    <h1>Pitch Detector</h1>
    <button ref="button">
      listen
    </button>
    <p>
      <strong>Pitch:</strong> {{ pitch }} Hz
    </p>
    <p>
      <strong>Clarity:</strong> {{ clarity }} %
    </p>
    <select v-model="selectedAudioInput">
      <option
        v-for="input in audioInputs"
        :key="input.deviceId"
        :value="input.deviceId"
      >
        {{ input.label }}
      </option>
    </select>
  </div>  
</template>