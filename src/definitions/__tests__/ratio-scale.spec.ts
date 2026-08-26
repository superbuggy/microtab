import { describe, it, expect } from "vitest";
import {
  tileParsedScale,
  pitchToFrequency,
  tiledFrequencies,
  mulPitch,
  nearestDegreeIndex,
  centsBetween,
  formatPitch,
} from "../ratio-scale";
import { scaleFromText } from "../scale-input";

describe("tileParsedScale", () => {
  it("tiles just intonation degrees over two octaves exactly", () => {
    const parsed = scaleFromText("9/8\n5/4\n4/3\n3/2\n5/3\n15/8\n2");
    const tiled = tileParsedScale(parsed, 2);

    // unison + (6 degrees + octave) x 2 periods
    expect(tiled.degrees).toHaveLength(15);
    expect(tiled.degrees[0].pitch.ratio?.n).toBe(1n);

    // Degree 7 is the first period's equave: exact 2/1
    expect(formatPitch(tiled.degrees[7].pitch)).toBe("2");
    expect(tiled.degrees[7].period).toBe(0);

    // The final placement is the doubled equave: exact 4/1
    const top = tiled.degrees[tiled.degrees.length - 1];
    expect(formatPitch(top.pitch)).toBe("4");
    expect(top.period).toBe(1);

    // Degree 1 and degree 8 are the same ratio one period apart (9/8 and 9/4)
    expect(formatPitch(tiled.degrees[1].pitch)).toBe("9/8");
    expect(formatPitch(tiled.degrees[8].pitch)).toBe("9/4");
  });

  it("keeps the equave as the final placement without duplicating it", () => {
    const parsed = scaleFromText("3/2\n3"); // Bohlen-Pierce-like tritave
    const tiled = tileParsedScale(parsed, 2);
    expect(tiled.degrees).toHaveLength(5); // unison, 3/2, 3/1, 9/2, 9/1
    expect(tiled.degrees[2].pitch.cents).toBeCloseTo(1901.955, 2);
    expect(tiled.degrees[4].pitch.cents).toBeCloseTo(3803.91, 2);
  });

  it("falls back to cents arithmetic when a degree is not rational", () => {
    const parsed = scaleFromText("701.9\n1200.");
    const tiled = tileParsedScale(parsed, 2);
    expect(tiled.degrees[1].pitch.cents).toBeCloseTo(701.9, 6);
    expect(tiled.degrees[1].pitch.ratio).toBeNull();
    // Period boundaries land on the equave (itself cents-only here)
    expect(tiled.degrees[2].pitch.cents).toBeCloseTo(1200, 6);
    expect(tiled.degrees[2].pitch.ratio).toBeNull();
    expect(tiled.degrees[3].pitch.cents).toBeCloseTo(1901.9, 6);
    expect(tiled.degrees[3].pitch.ratio).toBeNull();
  });

  it("rejects non-positive period counts", () => {
    const parsed = scaleFromText("3/2\n2");
    expect(() => tileParsedScale(parsed, 0)).toThrow(/at least one period/);
  });
});

describe("mulPitch", () => {
  it("stays exact when both operands are ratios", () => {
    const product = mulPitch(
      { cents: 498.04, ratio: { n: 4n, d: 3n } },
      { cents: 203.91, ratio: { n: 9n, d: 8n } }
    );
    expect(formatPitch(product)).toBe("3/2");
  });

  it("degrades to cents when either operand is cents-only", () => {
    const product = mulPitch(
      { cents: 701.96, ratio: { n: 3n, d: 2n } },
      { cents: 12.34, ratio: null }
    );
    expect(product.ratio).toBeNull();
    expect(product.cents).toBeCloseTo(714.3, 2);
  });
});

describe("pitchToFrequency", () => {
  it("uses exact rational multiplication for ratio pitches", () => {
    expect(pitchToFrequency(440, { cents: 0, ratio: { n: 3n, d: 2n } })).toBe(660);
  });

  it("uses exponential conversion for cents-only pitches", () => {
    const frequency = pitchToFrequency(440, { cents: 1200, ratio: null });
    expect(frequency).toBeCloseTo(880, 6);
  });

  it("produces just frequencies for a tiled primodal scale", () => {
    const parsed = scaleFromText("14/13\n26/13");
    const tiled = tileParsedScale(parsed, 1);
    const frequencies = tiledFrequencies(tiled, 130.813);
    expect(frequencies[1]).toBeCloseTo((130.813 * 14) / 13, 6);
    expect(frequencies[2]).toBeCloseTo(261.626, 3);
  });
});

describe("nearestDegreeIndex", () => {
  it("snaps arbitrary frequencies to the closest scale member", () => {
    const parsed = scaleFromText("9/8\n5/4\n4/3\n3/2\n2");
    const tiled = tileParsedScale(parsed, 1);

    expect(nearestDegreeIndex(tiled, 220, 245)).toBe(1); // near 9/8 = 247.5
    expect(nearestDegreeIndex(tiled, 220, 330)).toBe(4); // exactly 3/2
  });

  it("returns the root for very low frequencies", () => {
    const parsed = scaleFromText("3/2\n2");
    const tiled = tileParsedScale(parsed, 1);
    expect(nearestDegreeIndex(tiled, 220, 221)).toBe(0);
  });
});

describe("centsBetween", () => {
  it("measures deviations in cents", () => {
    expect(centsBetween(440, 440)).toBeCloseTo(0, 9);
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 6);
    expect(centsBetween(660, 659.25)).toBeCloseTo(1.97, 1);
  });
});

describe("formatPitch", () => {
  it("renders ratios as fractions and bare integers", () => {
    expect(formatPitch({ cents: 701.955, ratio: { n: 3n, d: 2n } })).toBe("3/2");
    expect(formatPitch({ cents: 1200, ratio: { n: 2n, d: 1n } })).toBe("2");
  });

  it("renders irrational pitches in cents", () => {
    expect(formatPitch({ cents: 600.25, ratio: null })).toBe("600.25c");
  });
});
