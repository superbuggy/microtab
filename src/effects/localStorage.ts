export const APP_NAMESPACE = 'MICROTAB';
export const LOCAL_STORAGE_KEY = `${APP_NAMESPACE}::PREFERRED_AUDIO_INPUT`;

export function getPreferredAudioInput() {
  return localStorage.getItem(LOCAL_STORAGE_KEY) || null;
}

export function setPreferredAudioInput(label: string) {
  localStorage.setItem(LOCAL_STORAGE_KEY, label);
}
