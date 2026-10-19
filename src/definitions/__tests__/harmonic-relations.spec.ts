import { describe, expect, it } from "vitest";
import { rat } from "../scale-input";
import {
  commonDenominatorChord,
  fusionColumns,
  parseChordText,
  sharedRootPartials,
  subgroupOf,
} from "../harmonic-relations";

describe("subgroupOf", () => {
  it("unions the primes across the chord", () => {
    const { primes, label } = subgroupOf([
      rat(5n, 4n),
      rat(3n, 2n),
      rat(7n, 4n),
    ]);
    expect(primes).toEqual([2n, 3n, 5n, 7n]);
    expect(label).toBe("2.3.5.7");
  });

  it("factors reduced ratios", () => {
    expect(subgroupOf([rat(9n, 8n)]).label).toBe("2.3");
    expect(subgroupOf([rat(10n, 9n)]).label).toBe("2.3.5");
  });

  it("is empty without ratios", () => {
    expect(subgroupOf([]).label).toBe("");
  });
});

describe("commonDenominatorChord", () => {
  it("voices {5/4, 3/2, 7/4} as 4:5:6:7 over /4", () => {
    const chord = commonDenominatorChord([
      rat(5n, 4n),
      rat(3n, 2n),
      rat(7n, 4n),
    ]);
    expect(chord.denominator).toBe(4n);
    expect(chord.toneHarmonics).toEqual([5n, 6n, 7n]);
    expect(chord.withRoot).toEqual([4n, 5n, 6n, 7n]);
    expect(chord.label).toBe("4:5:6:7");
  });

  it("uses the LCM for mixed denominators", () => {
    const chord = commonDenominatorChord([rat(7n, 6n), rat(5n, 4n)]);
    expect(chord.denominator).toBe(12n);
    expect(chord.label).toBe("12:14:15");
  });

  it("keeps tones below the root in the series", () => {
    expect(commonDenominatorChord([rat(3n, 4n)]).label).toBe("3:4");
  });
});

describe("sharedRootPartials", () => {
  it("shares at every multiple of the numerator", () => {
    expect(sharedRootPartials(rat(5n, 4n), 20)).toEqual([5, 10, 15, 20]);
    expect(sharedRootPartials(rat(3n, 2n), 10)).toEqual([3, 6, 9]);
  });

  it("treats the unison as the whole series", () => {
    expect(sharedRootPartials(rat(1n), 4)).toEqual([1, 2, 3, 4]);
  });

  it("returns nothing for out-of-range or invalid numerators", () => {
    expect(sharedRootPartials(rat(101n), 32)).toEqual([]);
    expect(sharedRootPartials(rat(0n), 32)).toEqual([]);
  });
});

describe("fusionColumns", () => {
  it("marks where two tones meet on the root series", () => {
    // 5/4 and 3/2 overlap at multiples of lcm(5, 3) = 15
    const columns = fusionColumns([rat(5n, 4n), rat(3n, 2n)], 30);
    expect(columns).toEqual([
      { harmonic: 15, toneCount: 2 },
      { harmonic: 30, toneCount: 2 },
    ]);
  });

  it("finds nothing for a single tone", () => {
    expect(fusionColumns([rat(5n, 4n)], 40)).toEqual([]);
  });
});

describe("parseChordText", () => {
  it("parses whitespace-separated ratios ascending", () => {
    const { tones, warnings } = parseChordText("7/4 5/4 3/2");
    expect(warnings).toEqual([]);
    expect(tones.map((tone) => tone.source)).toEqual(["5/4", "3/2", "7/4"]);
    expect(tones[0].cents).toBeCloseTo(386.3, 1);
    expect(tones[2].cents).toBeCloseTo(968.8, 1);
  });

  it("drops the unison and coalesces duplicates", () => {
    const { tones } = parseChordText("1/1 3/2 3/2");
    expect(tones).toHaveLength(1);
    expect(tones[0].source).toBe("3/2");
  });

  it("warns and skips non-rational entries", () => {
    const { tones, warnings } = parseChordText("5/4 700.0");
    expect(tones.map((tone) => tone.source)).toEqual(["5/4"]);
    expect(warnings[0]).toMatch(/not an exact ratio/);
  });

  it("supports full Scale Workshop expressions per token", () => {
    const { tones } = parseChordText("3/2 * 81/80");
    expect(tones[0].ratio).toEqual({ n: 243n, d: 160n });
  });

  it("throws on bad syntax", () => {
    expect(() => parseChordText("5//4")).toThrow();
  });

  it("parses nothing from empty text", () => {
    expect(parseChordText("   ").tones).toEqual([]);
  });
});
