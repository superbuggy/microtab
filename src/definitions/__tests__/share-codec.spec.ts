import { describe, it, expect } from "vitest";
import {
  encodeSharePayload,
  decodeSharePayload,
  shareHashFor,
  fretlessPayloadFromHash,
  type FretlessPayload,
} from "../share-codec";

const sample: FretlessPayload = {
  scaleText: "9/8\n5/4\n4/3\n3/2\n5/3\n15/8\n2",
  periods: 2,
  temperamentName: "Meantone (5-limit)",
  tuningScheme: "pote",
  stringRootFrequencies: {
    string6: 82.4069,
    string5: 110.0,
  },
};

describe("share codec", () => {
  it("round-trips payloads through base64url", () => {
    expect(decodeSharePayload(encodeSharePayload(sample))).toEqual(sample);
  });

  it("survives URL-safe characters only", () => {
    const encoded = encodeSharePayload(sample);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("round-trips unicode scale labels", () => {
    const labeled: FretlessPayload = {
      ...sample,
      scaleText: '3/2 "Quinte ♥"\n2',
    };
    expect(decodeSharePayload(encodeSharePayload(labeled))).toEqual(labeled);
  });

  it("returns null for garbage instead of throwing", () => {
    expect(decodeSharePayload("not-valid-base64!!")).toBeNull();
    expect(decodeSharePayload("bm90anNvbg")).toBeNull(); // "notjson"
  });

  it("embeds payloads in the URL hash and extracts them back", () => {
    const hash = shareHashFor(sample);
    expect(hash).toMatch(/^#fretless=[A-Za-z0-9_-]+$/);
    expect(fretlessPayloadFromHash(hash)).toEqual(sample);
  });

  it("ignores hashes for other features", () => {
    expect(fretlessPayloadFromHash("#tab=abc123")).toBeNull();
    expect(fretlessPayloadFromHash("")).toBeNull();
  });
});
