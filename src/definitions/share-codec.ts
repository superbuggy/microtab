// URL-share codec for fretless state: JSON -> UTF-8 -> base64url in the
// location hash, mirroring Scale Workshop's shareable tuning links.

export type FretlessPayload = {
  scaleText: string;
  periods: number;
  temperamentName: string;
  tuningScheme: "pote" | "cte";
  stringRootFrequencies: Record<string, number>;
};

export const FRETLESS_SHARE_KEY = "fretless";

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64 = (encoded: string): Uint8Array => {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

export const encodeSharePayload = (payload: FretlessPayload): string =>
  toBase64(new TextEncoder().encode(JSON.stringify(payload)));

export const decodeSharePayload = (encoded: string): FretlessPayload | null => {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64(encoded)));
    if (typeof parsed?.scaleText !== "string") return null;
    return parsed as FretlessPayload;
  } catch {
    return null;
  }
};

export const shareHashFor = (payload: FretlessPayload): string =>
  `#${FRETLESS_SHARE_KEY}=${encodeSharePayload(payload)}`;

export const fretlessPayloadFromHash = (hash: string): FretlessPayload | null => {
  const match = hash.match(new RegExp(`#${FRETLESS_SHARE_KEY}=([A-Za-z0-9_-]+)`));
  return match ? decodeSharePayload(match[1]) : null;
};
