import { PitchDetector } from "pitchy";
import { ref, onMounted } from "vue";

export const audioContext = new window.AudioContext();
const pitch = ref<number | null>(null);
const clarity = ref<number | null>(null);

export function usePitchDetection() {
  function updatePitch(analyserNode: AnalyserNode, detector: PitchDetector<Float32Array>, input: Float32Array, sampleRate: number) {
    analyserNode.getFloatTimeDomainData(input);
    const [_pitch, _clarity] = detector.findPitch(input, sampleRate);

    pitch.value = Math.round(_pitch * 10) / 10
    clarity.value = _clarity * 100;
    window.setTimeout(
      () => updatePitch(analyserNode, detector, input, sampleRate),
      100,
    );
  }

  onMounted(() => {
    const analyserNode = audioContext.createAnalyser();
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      audioContext.createMediaStreamSource(stream).connect(analyserNode);
      const detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
      detector.minVolumeDecibels = -30;
      const input = new Float32Array(detector.inputLength);
      updatePitch(analyserNode, detector, input, audioContext.sampleRate);
    });
  });

  return { pitch, clarity };
}