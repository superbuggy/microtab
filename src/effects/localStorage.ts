export const APP_NAMESPACE = 'MICROTAB';
export const LOCAL_STORAGE_KEY = `${APP_NAMESPACE}::PREFERRED_AUDIO_INPUT`;
export const FRETLESS_STORAGE_KEY = `${APP_NAMESPACE}::FRETLESS_STATE`;
export const BOARD_MODE_STORAGE_KEY = `${APP_NAMESPACE}::BOARD_MODE`;

export function getPreferredAudioInput() {
  return localStorage.getItem(LOCAL_STORAGE_KEY) || null;
}

export function setPreferredAudioInput(label: string) {
  localStorage.setItem(LOCAL_STORAGE_KEY, label);
}

// Fretless state survives reloads as one JSON blob (scale text, periods,
// temperament choice, per-string tuning).
export function getFretlessState(): unknown | null {
  try {
    const raw = localStorage.getItem(FRETLESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setFretlessState(state: unknown) {
  try {
    localStorage.setItem(FRETLESS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode); persistence is best-effort.
  }
}

export function getBoardMode(): string | null {
  return localStorage.getItem(BOARD_MODE_STORAGE_KEY);
}

export function setBoardMode(mode: string) {
  try {
    localStorage.setItem(BOARD_MODE_STORAGE_KEY, mode);
  } catch {
    // Best-effort.
  }
}
