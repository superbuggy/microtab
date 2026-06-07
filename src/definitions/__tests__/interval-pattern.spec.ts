import { describe, it, expect } from "vitest";
import {
  parsePattern,
  intervalNameToSteps,
  stepDeltasToScale,
} from "../interval-pattern";

const sum = (numbers: number[]) => numbers.reduce((a, b) => a + b, 0);

describe("parsePattern", () => {
  it("parses integer tokens as signed EDO steps", () => {
    expect(parsePattern("+3 -1 +7", 24)).toEqual([3, -1, 7]);
  });

  it("treats a missing operator as ascending", () => {
    expect(parsePattern("3 m3", 24)).toEqual([3, 6]);
  });

  it("parses interval-name tokens in 24-TET", () => {
    // m3 = 300c = 6 steps, M2 = 200c = 4 steps, P5 = 700c = 14 steps
    expect(parsePattern("+m3 -M2 +P5", 24)).toEqual([6, -4, 14]);
  });

  it("applies S (super) and s (sub) modifiers as ±1 24-TET step", () => {
    // SM2 = 250c = 5, sm3 = 250c = 5, SP4 = 550c = 11, s8 = 1150c = 23
    expect(parsePattern("+SM2 +sm3 +SP4 +s8", 24)).toEqual([5, 5, 11, 23]);
  });

  it("handles descending operators on named intervals", () => {
    expect(parsePattern("+P4 -P4", 24)).toEqual([10, -10]);
  });

  it("rounds named intervals to the nearest step in 12-TET", () => {
    // n2 = 150c rounds to 2 semitones, m3 = 300c = 3, P5 = 700c = 7
    expect(parsePattern("+m3 +n2 +P5", 12)).toEqual([3, 2, 7]);
  });

  it("parses a longer real-world pattern", () => {
    expect(parsePattern("+m2 +m2 +m3 +m2 +m2", 24)).toEqual([2, 2, 6, 2, 2]);
  });

  it("throws on an unknown interval token", () => {
    expect(() => parsePattern("+x9", 24)).toThrow(/Unknown interval token/);
  });

  it("throws on an empty pattern", () => {
    expect(() => parsePattern("   ", 24)).toThrow(/empty/i);
  });

  it("throws on an operator with no distance", () => {
    expect(() => parsePattern("+", 24)).toThrow(/missing a distance/);
  });
});

describe("intervalNameToSteps", () => {
  it("resolves base intervals in 24-TET", () => {
    expect(intervalNameToSteps("U", 24)).toBe(0);
    expect(intervalNameToSteps("M3", 24)).toBe(8);
    expect(intervalNameToSteps("8", 24)).toBe(24);
  });

  it("resolves modified intervals in 24-TET", () => {
    expect(intervalNameToSteps("SM3", 24)).toBe(9);
    expect(intervalNameToSteps("sP4", 24)).toBe(9);
  });

  it("returns null for unrecognized names", () => {
    expect(intervalNameToSteps("Q5", 24)).toBeNull();
  });
});

describe("stepDeltasToScale", () => {
  it("builds an octave-summing scale that closes within one cycle", () => {
    const { pitchClasses, intervals, period } = stepDeltasToScale(
      [5, 5, 4, 5, 5],
      24
    );
    expect(pitchClasses).toEqual([0, 5, 10, 14, 19]);
    expect(intervals).toEqual([5, 5, 4, 5, 5]);
    expect(period).toBe(24);
    expect(sum(intervals)).toBe(24);
  });

  it("produces a whole-tone scale from repeated major seconds", () => {
    const { pitchClasses, intervals } = stepDeltasToScale([4, 4, 4, 4, 4, 4], 24);
    expect(pitchClasses).toEqual([0, 4, 8, 12, 16, 20]);
    expect(intervals).toEqual([4, 4, 4, 4, 4, 4]);
  });

  it("repeats the pattern (each step relative to the last) until it closes on the octave", () => {
    // +5 -1 in 12-TET walks 0,5,4,9,8,1 then back to the octave
    const { pitchClasses, intervals, period } = stepDeltasToScale([5, -1], 12);
    expect(pitchClasses).toEqual([0, 1, 4, 5, 8, 9]);
    expect(intervals).toEqual([1, 3, 1, 3, 1, 3]);
    expect(period).toBe(12);
    expect(sum(intervals)).toBe(12);
  });

  it("always begins on the root and sums intervals to one octave", () => {
    const { pitchClasses, intervals } = stepDeltasToScale([7, -5], 24);
    expect(pitchClasses[0]).toBe(0);
    expect(sum(intervals)).toBe(24);
  });
});
