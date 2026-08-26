import { describe, it, expect } from "vitest";
import {
  adjectiveForPrime,
  isPrime,
  harmonicSegment,
  primeFamilyScaleText,
  nejiQuantize,
  chordGestaltReport,
} from "../primodality";
import { scaleFromText, rationalToCents, formatRatio, rat } from "../scale-input";

describe("prime predicates", () => {
  it("identifies primes and composites", () => {
    expect(isPrime(13)).toBe(true);
    expect(isPrime(19)).toBe(true);
    expect(isPrime(1)).toBe(false);
    expect(isPrime(21)).toBe(false);
    expect(isPrime(2.5)).toBe(false);
  });

  it("uses Zhea's adjectives", () => {
    expect(adjectiveForPrime(7)).toBe("septimal");
    expect(adjectiveForPrime(11)).toBe("undecimal");
    expect(adjectiveForPrime(13)).toBe("tridecimal");
    expect(adjectiveForPrime(17)).toBe("septendecimal");
    expect(adjectiveForPrime(19)).toBe("novemdecimal");
  });
});

describe("harmonicSegment", () => {
  it("builds the first octave of /13 (Mode 13)", () => {
    const segment = harmonicSegment(13);
    expect(segment.from).toBe(13);
    expect(segment.to).toBe(26);
    expect(segment.numerators[0]).toBe(14);
    expect(segment.numerators.at(-1)).toBe(25);
    expect(segment.ratios).toHaveLength(12);
    expect(formatRatio(segment.ratios[0])).toBe("14/13");
  });

  it("builds the second octave of /p as Mode 2p", () => {
    const segment = harmonicSegment(7, { mode: 2 });
    expect(segment.from).toBe(14);
    expect(segment.to).toBe(28);
    // Each family-octave doubles the span: 28/14 = 2/1
    expect(formatRatio(rat(BigInt(segment.to), BigInt(segment.from)))).toBe("2");
    expect(segment.numerators).toHaveLength(13);
  });

  it("supports arbitrary subsets of the lineal segment", () => {
    const segment = harmonicSegment(11, { include: [13, 15] });
    expect(segment.numerators).toEqual([13, 15]);
  });

  it("rejects non-primes and empty selections", () => {
    expect(() => harmonicSegment(9)).toThrow(/not a prime/);
    expect(() => harmonicSegment(13, { include: [5] })).toThrow(/inside the segment/);
  });
});

describe("primeFamilyScaleText", () => {
  it("produces Scale Workshop text that round-trips through the parser", () => {
    const text = primeFamilyScaleText(13);
    // The documented /13 second-octave... first octave here:
    const parsed = scaleFromText(text);
    expect(parsed.degrees).toHaveLength(12);
    expect(formatRatio(parsed.equave.ratio!)).toBe("2");

    // Every degree keeps the shared denominator 13 (gestalt preserved)
    for (const degree of parsed.degrees) {
      expect(degree.pitch.ratio!.d).toBe(13n);
    }
  });

  it("respects subset selection", () => {
    const parsed = scaleFromText(primeFamilyScaleText(7, { mode: 1, include: [8, 10, 12] }));
    expect(parsed.degrees.map((d) => formatRatio(d.pitch.ratio!))).toEqual([
      "8/7",
      "10/7",
      "12/7",
    ]);
  });
});

describe("nejiQuantize", () => {
  it("keeps every degree inside the prime family (period aside)", () => {
    const { ratios } = nejiQuantize(13);
    const internal = ratios.slice(0, -1);
    expect(internal.every((ratio) => ratio.d === 13n)).toBe(true);
  });

  it("stays strictly increasing and ends on the period", () => {
    const { ratios } = nejiQuantize(11, { mode: 2 });
    const cents = ratios.map((ratio) => rationalToCents(ratio));
    for (let i = 1; i < cents.length; i++) {
      expect(cents[i]).toBeGreaterThan(cents[i - 1]);
    }
    // Final degree is Mode 2p's period: 44/11 reduces to 4/1
    expect(formatRatio(ratios.at(-1)!)).toBe("4");
  });

  it("lands near-equal steps where harmonics allow", () => {
    // Low harmonics are sparse relative to the equal step: early /13 degrees
    // overshoot the ideal 92.3c step by up to ~100c mid-segment. This is an
    // intrinsic property of keeping denominator p (the gestalt tradeoff),
    // and it is scale-invariant across modes — Mode 2p shows the same
    // deviation profile because step sizes halve exactly as harmonic gaps do.
    const first = nejiQuantize(13);
    expect(first.maxDeviationCents).toBeGreaterThan(0);
    expect(first.maxDeviationCents).toBeLessThan(110);

    const second = nejiQuantize(13, { mode: 2 });
    expect(second.maxDeviationCents).toBeCloseTo(first.maxDeviationCents, 3);
  });

  it("honors the shift window when set to zero", () => {
    const tight = nejiQuantize(13, { maxShift: 0 });
    const raw = harmonicSegment(13);
    // Zero window reproduces the raw segment (final period entry aside)
    expect(tight.ratios.slice(0, -1)).toEqual(raw.ratios);
    expect(tight.maxDeviationCents).toBeGreaterThan(0);
  });
});

describe("chordGestaltReport", () => {
  it("flags intervals that break a referenced prime family", () => {
    // A /4-tonic chord stays in-family...
    const report = chordGestaltReport([
      { n: 5n, d: 4n },
      { n: 6n, d: 4n },
      { n: 7n, d: 4n },
    ], { familyDenominator: 4n });
    expect(report.dominantDenominator).toBe(4n);
    expect(report.broken).toBe(0);

    // ...but adding 4/3 introduces a /3 member where 21/16 would keep /4
    const withFourth = chordGestaltReport([{ n: 4n, d: 3n }], { familyDenominator: 4n });
    expect(withFourth.entries[0].breaksFamily).toBe(true);
    const withSeventhOver = chordGestaltReport([{ n: 21n, d: 16n }], { familyDenominator: 16n });
    expect(withSeventhOver.entries[0].breaksFamily).toBe(false);
  });

  it("counts blended vs broken members against the majority family", () => {
    const report = chordGestaltReport([
      { n: 14n, d: 13n },
      { n: 15n, d: 13n },
      { n: 4n, d: 3n },
    ]);
    expect(report.blended).toBe(2);
    expect(report.broken).toBe(1);
    expect(report.entries[2].familyDenominator).toBe(3n);
  });
});
