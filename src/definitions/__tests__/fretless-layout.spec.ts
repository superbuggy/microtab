import { describe, it, expect } from "vitest";
import {
  layoutFretlessOnStrings,
  deviationFrom12TET,
} from "../fretless-layout";
import { scaleFromText } from "../scale-input";
import { tileParsedScale } from "../ratio-scale";

const tiledFrom = (text: string, periods = 1) =>
  tileParsedScale(scaleFromText(text), periods);

describe("layoutFretlessOnStrings", () => {
  it("places exact just frequencies on each string independently", () => {
    const tiled = tiledFrom("9/8\n5/4\n4/3\n3/2\n2");
    const guides = layoutFretlessOnStrings(tiled, {
      string6: 82.4069,
      string5: 110.0,
    });

    expect(Object.keys(guides)).toEqual(["string6", "string5"]);

    // 3/2 on the A string is exactly 165 Hz
    const aStringThirds = guides.string5.find((g) => g.ratioText === "3/2");
    expect(aStringThirds?.frequency).toBeCloseTo(165, 6);

    // The same ratio sits at a different absolute frequency per string
    const lowEThird = guides.string6.find((g) => g.ratioText === "3/2");
    expect(lowEThird?.frequency).not.toBeCloseTo(165, 0);
    expect(lowEThird?.frequency).toBeCloseTo(82.4069 * 1.5, 6);
  });

  it("carries degree metadata through to the guides", () => {
    const tiled = tiledFrom('9/8 "tone" yellow\n2', 2);
    const guide = layoutFretlessOnStrings(tiled, { string6: 110 }).string6[1];

    expect(guide.degreeIndex).toBe(1);
    expect(guide.ratioText).toBe("9/8");
    expect(guide.label).toBe("tone");
  });

  it("records cents above the open string for every period", () => {
    const tiled = tiledFrom("3/2\n2", 2);
    const guides = layoutFretlessOnStrings(tiled, { string6: 100 });
    expect(guides.string6.map((g) => Math.round(g.centsAboveRoot))).toEqual([
      0, 702, 1200, 1902, 2400,
    ]);
  });

  it("annotates irrational degrees as cents-only", () => {
    const tiled = tiledFrom("250.\n500.\n1000.");
    const guides = layoutFretlessOnStrings(tiled, { string1: 400 });
    expect(guides.string1[1].ratioText).toBeNull();
    expect(guides.string1[1].frequency).toBeCloseTo(400 * 2 ** (250 / 1200), 6);
  });
});

describe("deviationFrom12TET", () => {
  it("measures how far a just interval sits from the nearest fret", () => {
    expect(deviationFrom12TET(701.955)).toBeCloseTo(1.955, 3); // 3/2
    expect(deviationFrom12TET(386.314)).toBeCloseTo(-13.686, 3); // 5/4
    expect(deviationFrom12TET(1200)).toBeCloseTo(0, 6);
    expect(deviationFrom12TET(968.826)).toBeCloseTo(-31.174, 3); // 7/4
  });
});
