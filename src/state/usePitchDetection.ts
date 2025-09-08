import { PitchDetector } from "pitchy";
import { ref } from "vue";
import { useAudioInputDevices } from "@/state/useAudioInputDevices"; 

export const audioContext = new window.AudioContext();

const inputPitch = ref<number | null>(null);

const MIN_CLARITY = 0.75;
const SMOOTHING_FACTOR = 0.3;
let smoothedPitch: number | null = null;

const { selectedDeviceId } = await useAudioInputDevices();

export function usePitchDetection() {

  function lowPassFilter(newPitch: number): number {
    if (smoothedPitch === null) {
      smoothedPitch = newPitch;
      return newPitch;
    }
    
    smoothedPitch = smoothedPitch * (1 - SMOOTHING_FACTOR) + newPitch * SMOOTHING_FACTOR;
    return smoothedPitch;
  }

  function updatePitchContinuously(
    analyserNode: AnalyserNode, 
    detector: PitchDetector<Float32Array>, 
    input: Float32Array<ArrayBuffer>, 
    sampleRate: number
  ) {
    analyserNode.getFloatTimeDomainData(input);
    const [_pitch, _clarity] = detector.findPitch(input, sampleRate);

    if (_clarity > MIN_CLARITY && _pitch > 50 && _pitch < 4000) {
      const filteredPitch = lowPassFilter(_pitch);
      inputPitch.value = Math.round(filteredPitch * 100) / 100;
    }
    
    window.setTimeout(
      () => updatePitchContinuously(analyserNode, detector, input, sampleRate),
      50,
    );
  }

  async function initializeDetection() {
    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 4096;
    analyserNode.smoothingTimeConstant = 0.3;
    const deviceId = selectedDeviceId.value;
    const stream = await streamFromDeviceQuery(deviceId);
    audioContext.createMediaStreamSource(stream).connect(analyserNode);
    const detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
    detector.minVolumeDecibels = -30;
    const input = new Float32Array(detector.inputLength);
    updatePitchContinuously(analyserNode, detector, input, audioContext.sampleRate);
  }

  async function initializeAudio() {
    audioContext.resume();
    initializeDetection();
  } 
  
  async function streamFromDeviceQuery(label: string | null) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const deviceId = devices.find((device) => device.kind === "audioinput" && device.label === label)?.deviceId;
    const constraints = deviceId 
      ? { audio: { deviceId } } 
      : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  }

  return { inputPitch, audioContext, initializeDetection, initializeAudio };
}