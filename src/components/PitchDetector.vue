<script setup lang="ts">
import { usePitchDetection } from "@/state/usePitchDetection";

;
import { ref, onMounted, onUnmounted } from "vue";
import Strobe from "./Strobe.vue";

const { audioContext } = usePitchDetection();
const button = ref<HTMLElement | null>(null);
const audioInputs = ref<MediaDeviceInfo[] | null>(null);
const selectedAudioInput = ref<string | null>(null);


function initalizeAudio() {
  audioContext.resume();

  navigator.mediaDevices.enumerateDevices().then((devices) => {
    audioInputs.value = devices.filter((device) => device.kind === "audioinput");
  });
}

onMounted(() => {
  button.value?.addEventListener("click", initalizeAudio);

});

onUnmounted(() => {
  button.value?.removeEventListener("click", initalizeAudio);
});

</script>
<template>
  <div>
    <h1>Pitch Detector</h1>
    <button ref="button">
      listen
    </button>
    <div v-if="audioInputs">
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
    <Strobe />
  </div>
</template>