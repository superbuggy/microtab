import { readonly, ref } from "vue";
import { getPreferredAudioInput } from "@/effects/localStorage"

const deviceList = ref<MediaDeviceInfo[] | null>(null);
const _selectedDeviceId = ref<string | null>(getPreferredAudioInput());

export async function useAudioInputDevices() {
  const selectedDeviceId =  readonly(_selectedDeviceId);
  
  await queryDevices();

  async function queryDevices() {
    deviceList.value = await navigator.mediaDevices.enumerateDevices();
  }

  function setInputDevice(deviceId: string) {
    _selectedDeviceId.value = deviceId;
    localStorage.setItem('MICROTAB::PREFERRED_AUDIO_INPUT', deviceId);
  }
  return { deviceList, selectedDeviceId, setInputDevice, queryDevices }; 
};
