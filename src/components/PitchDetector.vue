<script setup lang="ts">
 import { PitchDetector } from "pitchy";
import { ref, onMounted } from "vue";

const pitch = ref<number | null>(null);
const clarity = ref<number | null>(null);
const button = ref<HTMLElement | null>(null);

function updatePitch(analyserNode: AnalyserNode, detector: PitchDetector<Float32Array>, input: Float32Array, sampleRate: number) {
  analyserNode.getFloatTimeDomainData(input);
  const [_pitch, _clarity] = detector.findPitch(input, sampleRate);

  // pitchDisplay.value.textContent = `${
  pitch.value = Math.round(_pitch * 10) / 10
  // } Hz`;
  // document.getElementById("clarity").textContent = `${Math.round(
  clarity.value= _clarity * 100;
  // )} %`;
  window.setTimeout(
    () => updatePitch(analyserNode, detector, input, sampleRate),
    100,
  );
}

onMounted(() => {
  const audioContext = new window.AudioContext();
  const analyserNode = audioContext.createAnalyser();

  button.value?.addEventListener("click", () => audioContext.resume());

  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    audioContext.createMediaStreamSource(stream).connect(analyserNode);
    const detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
    detector.minVolumeDecibels = -30;
    const input = new Float32Array(detector.inputLength);
    updatePitch(analyserNode, detector, input, audioContext.sampleRate);
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
  </div>  
</template>