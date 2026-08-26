import { describe, it, expect } from "vitest";
import {
  parseCommaList,
  monzosFromRationals,
  temperedSteps,
  temperedCentsOfMonzo,
  poteGenerators,
  cteGenerators,
  temperTiledScale,
  TEMPERAMENT_PRESETS,
} from "../rtt";
import { scaleFromText, rat } from "../scale-input";
import { tileParsedScale } from "../ratio-scale";
import { solveLinearSystem, leastSquares } from "../linalg";

const MEANTONE = TEMPERAMENT_PRESETS[0];

describe("linalg", () => {
  it("solves exact linear systems", () => {
    const x = solveLinearSystem(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 10]
    );
    expect(x?.[0]).toBeCloseTo(1, 9);
    expect(x?.[1]).toBeCloseTo(3, 9);
  });

  it("solves overdetermined least squares", () => {
    // Fit y = 2x to points (0,0), (1,2), (2,4.1)
    const solution = leastSquares([[0], [1], [2]], [0, 2, 4.1]);
    expect(solution?.[0]).toBeGreaterThan(1.99);
    expect(solution?.[0]).toBeLessThan(2.05);
  });
});

describe("parseCommaList", () => {
  it("parses comma- and whitespace-separated ratios", () => {
    const commas = parseCommaList("81/80, 126/125\n225/224");
    expect(commas).toHaveLength(3);
    expect(commas[0].n).toBe(81n);
    expect(commas[2].d).toBe(224n);
  });

  it("accepts bare integers as ratios", () => {
    expect(parseCommaList("2 3")).toEqual([rat(2n), rat(3n)]);
  });

  it("throws on an empty list", () => {
    expect(() => parseCommaList("  ")).toThrow(/empty/i);
  });
});

describe("presets and mappings", () => {
  it("meantone mapping tempers out 81/80 exactly", () => {
    const [monzo] = monzosFromRationals(MEANTONE.commas);
    const steps = temperedSteps(MEANTONE.mapping, monzo!, MEANTONE.mapping[0].length);
    expect(steps).toEqual([0, 0]);
  });

  it("septimal meantone kills both of its commas", () => {
    const sept = TEMPERAMENT_PRESETS[1];
    const monzos = monzosFromRationals(sept.commas);
    for (const monzo of monzos) {
      const steps = temperedSteps(sept.mapping, monzo, sept.mapping[0].length);
      expect(steps).toEqual([0, 0]);
    }
  });

  it("maps primes to sensible generator counts in meantone", () => {
    // 2 -> one period; 3 -> period + generator (the fifth)
    const mapping = MEANTONE.mapping;
    expect(mapping.map((row) => row[0])).toEqual([1, 0]); // prime 2
    const threeSteps = temperedSteps(mapping, { 1: 1 }, 3);
    expect(threeSteps).toEqual([1, 1]);
  });
});

describe("POTE tuning", () => {
  it("keeps the octave pure at 1200 cents", () => {
    const tunings = poteGenerators(MEANTONE);
    expect(tunings[0]).toBe(1200);
  });

  it("lands the meantone fifth near 696.6 cents", () => {
    const tunings = poteGenerators(MEANTONE);
    // Tenney-weighted (1/p) POTE fifth sits between quarter-comma meantone
    // (696.58c) and Aron's 697.1c
    expect(tunings[1]).toBeGreaterThan(695);
    expect(tunings[1]).toBeLessThan(698);
  });

  it("gives a tempered major third near 5/4", () => {
    const tunings = poteGenerators(MEANTONE);
    // M3 = monzo [-2 0 1]; Tenney 1/p weights trade a few cents of third
    // accuracy against fifth accuracy
    const cents = temperedCentsOfMonzo(MEANTONE.mapping, tunings, { 0: -2, 2: 1 });
    expect(cents).toBeGreaterThan(380);
    expect(cents).toBeLessThan(395);
  });

  it("still optimizes generators when there are no commas", () => {
    const tuning = poteGenerators({ mapping: [[1, 1, 0], [0, 1, 4]], commas: [] });
    expect(tuning[0]).toBe(1200);
    expect(tuning[1]).toBeGreaterThan(650);
    expect(tuning[1]).toBeLessThan(720);
  });
});

describe("CTE tuning", () => {
  it("zeros the commas while keeping the octave pure", () => {
    const tunings = cteGenerators(MEANTONE);
    expect(tunings).not.toBeNull();
    const [monzo] = monzosFromRationals(MEANTONE.commas);
    const size = temperedCentsOfMonzo(MEANTONE.mapping, tunings!, monzo!);
    expect(size).toBeCloseTo(0, 6);
    expect(tunings![0]).toBe(1200);
  });

  it("matches POTE when the constraints are already satisfied by it", () => {
    // Single-comma temperaments have a 1-parameter constraint family; CTE
    // picks the TE-optimal point which equals POTE here.
    const cte = cteGenerators(MEANTONE)!;
    const pote = poteGenerators(MEANTONE);
    expect(cte[1]).toBeCloseTo(pote[1], 4);
  });
});

describe("temperTiledScale", () => {
  it("replaces ratio degrees with tempered cents, keeping structure", () => {
    const parsed = scaleFromText("9/8\n5/4\n4/3\n3/2\n2");
    const tiled = tileParsedScale(parsed, 1);
    const tunings = poteGenerators(MEANTONE);
    const tempered = temperTiledScale(tiled, MEANTONE.mapping, tunings);

    expect(tempered.degrees).toHaveLength(tiled.degrees.length);
    expect(tempered.degrees.every((degree) => degree.pitch.ratio === null)).toBe(true);

    // Tempered fifth sits ~2 cents flat of its just size
    const fifth = tempered.degrees.find((d) => Math.abs(d.pitch.cents - 702) < 10);
    expect(fifth!.pitch.cents).toBeCloseTo(tunings[1] + 1200 - 1200, 1);

    // The equave stays at the period tuning
    expect(tempered.degrees[tempered.degrees.length - 1].pitch.cents).toBeCloseTo(1200, 6);
  });

  it("leaves cents-only scales untouched", () => {
    const parsed = scaleFromText("700.\n1200.");
    const tiled = tileParsedScale(parsed, 1);
    const tunings = poteGenerators(MEANTONE);
    const tempered = temperTiledScale(tiled, MEANTONE.mapping, tunings);
    expect(tempered.degrees[1].pitch.cents).toBeCloseTo(700, 6);
    expect(tempered.degrees[2].pitch.cents).toBeCloseTo(1200, 6);
  });
});
