import { PitchDetector } from "pitchy";
import { ref, onMounted } from "vue";

export const audioContext = new window.AudioContext();
const inputPitch = ref<number | null>(null);

const MIN_CLARITY = 0.75;
const SMOOTHING_FACTOR = 0.3;
let smoothedPitch: number | null = null;

export function usePitchDetection() {
  function lowPassFilter(newPitch: number): number {
    if (smoothedPitch === null) {
      smoothedPitch = newPitch;
      return newPitch;
    }
    
    smoothedPitch = smoothedPitch * (1 - SMOOTHING_FACTOR) + newPitch * SMOOTHING_FACTOR;
    return smoothedPitch;
  }

  function updatePitch(analyserNode: AnalyserNode, detector: PitchDetector<Float32Array>, input: Float32Array, sampleRate: number) {
    analyserNode.getFloatTimeDomainData(input);
    const [_pitch, _clarity] = detector.findPitch(input, sampleRate);

    if (_clarity > MIN_CLARITY && _pitch > 50 && _pitch < 4000) {
      const filteredPitch = lowPassFilter(_pitch);
      inputPitch.value = Math.round(filteredPitch * 100) / 100;
    }
    
    window.setTimeout(
      () => updatePitch(analyserNode, detector, input, sampleRate),
      50,
    );
  }

  onMounted(() => {
    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 4096;
    analyserNode.smoothingTimeConstant = 0.3;
    
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      console.log("got audio stream", navigator.mediaDevices);
      audioContext.createMediaStreamSource(stream).connect(analyserNode);
      const detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
      detector.minVolumeDecibels = -30;
      const input = new Float32Array(detector.inputLength);
      updatePitch(analyserNode, detector, input, audioContext.sampleRate);
    });
  });

  return { inputPitch, audioContext };
}