import { describe, it, expect } from "vitest";
import {
  scaleFromText,
  formatRatio,
  rationalToCents,
  ratioToMonzo,
  monzoToRatio,
} from "../scale-input";

const centsOf = (entry: { pitch: { cents: number } }) => entry.pitch.cents;
const pitchCents = (pitch: { cents: number }) => pitch.cents;
const ratioText = (entry: { pitch: { ratio: { n: bigint; d: bigint } | null } }) =>
  entry.pitch.ratio ? formatRatio(entry.pitch.ratio) : null;

describe("scaleFromText: basic pitch types", () => {
  it("parses ratios, bare integers and the final line as the equave", () => {
    const scale = scaleFromText("9/8\n5/4\n4/3\n3/2\n2");
    expect(scale.degrees.map(ratioText)).toEqual(["9/8", "5/4", "4/3", "3/2"]);
    expect(formatRatio(scale.equave.ratio!)).toBe("2");
  });

  it("treats a single interval as a one-degree equal temperament", () => {
    const scale = scaleFromText("3");
    expect(scale.degrees).toEqual([]);
    expect(rationalToCents(scale.equave.ratio!)).toBeCloseTo(1901.955, 3);
  });

  it("parses cents values (any number containing a dot)", () => {
    const scale = scaleFromText("204.\n701.9\n1200.");
    expect(centsOf(scale.degrees[0])).toBeCloseTo(204, 6);
    expect(centsOf(scale.degrees[1])).toBeCloseTo(701.9, 6);
    expect(pitchCents(scale.equave)).toBe(1200);
  });

  it("parses EDO steps n\\m", () => {
    const scale = scaleFromText("7\\12\n12\\12");
    expect(centsOf(scale.degrees[0])).toBeCloseTo(700, 6);
    expect(pitchCents(scale.equave)).toBe(1200);
  });

  it("parses EDJI steps n\\m<p/q>", () => {
    // n steps of m-EDO where the p/q equave replaces the octave
    const scale = scaleFromText("6\\12<3/2>\n12\\12<3/2>");
    expect(centsOf(scale.degrees[0])).toBeCloseTo(701.955 / 2, 3);
    expect(pitchCents(scale.equave)).toBeCloseTo(1200 * Math.log2(1.5), 6);
  });

  it("parses decimal ratios marked with e", () => {
    const scale = scaleFromText("1.5e\n3e");
    expect(centsOf(scale.degrees[0])).toBeCloseTo(701.955, 3);
    expect(pitchCents(scale.equave)).toBeCloseTo(1901.955, 3);
  });

  it("parses monzos into exact ratios", () => {
    const scale = scaleFromText("[-6 4>\n[-1 1>\n[1 0>");
    expect(ratioText(scale.degrees[0])).toBe("81/64");
    expect(ratioText(scale.degrees[1])).toBe("3/2");
    expect(formatRatio(scale.equave.ratio!)).toBe("2");
  });

  it("evaluates fractional monzos in the cents domain", () => {
    const scale = scaleFromText("[0.5 0>\n[1 0>");
    expect(centsOf(scale.degrees[0])).toBeCloseTo(600, 6);
    expect(scale.degrees[0].pitch.ratio).toBeNull();
  });
});

describe("scaleFromText: FJS", () => {
  it("resolves plain Pythagorean qualities", () => {
    const scale = scaleFromText("M3\nP5\nP8");
    expect(rationalToCents(scale.degrees[0].pitch.ratio!)).toBeCloseTo(
      rationalToCents({ n: 81n, d: 64n }),
      6
    );
    expect(rationalToCents(scale.degrees[1].pitch.ratio!)).toBeCloseTo(701.955, 3);
  });

  it("applies over-inflections (^5 flattens M3 onto 5/4)", () => {
    const scale = scaleFromText("M3^5\nP8");
    // The formal 5-comma is 80/81: 81/64 * 80/81 = 5/4
    expect(rationalToCents(scale.degrees[0].pitch.ratio!)).toBeCloseTo(386.314, 3);
    expect(formatRatio(scale.degrees[0].pitch.ratio!)).toBe("5/4");
  });

  it("applies v (under) inflections (m3v5 = 6/5)", () => {
    const scale = scaleFromText("m3v5\nM6^5\nP8");
    // m3 = 32/27 divided by 80/81 = 6/5
    expect(rationalToCents(scale.degrees[0].pitch.ratio!)).toBeCloseTo(315.641, 3);
    // M6 = 27/16 * 80/81 = 5/3
    expect(rationalToCents(scale.degrees[1].pitch.ratio!)).toBeCloseTo(884.359, 3);
  });

  it("supports septimal inflections (m7^7 = 7/4)", () => {
    const scale = scaleFromText("m7^7\nP8");
    // m7 = 16/9 times the 63/64 comma = 7/4
    expect(rationalToCents(scale.degrees[0].pitch.ratio!)).toBeCloseTo(968.826, 3);
    expect(formatRatio(scale.degrees[0].pitch.ratio!)).toBe("7/4");
  });

  it("rejects invalid quality/degree combinations", () => {
    expect(() => scaleFromText("M5\nP8")).toThrow(/does not take/);
    expect(() => scaleFromText("P3\nP8")).toThrow(/requires M or m/);
  });
});

describe("scaleFromText: composition operators", () => {
  it("stacks fractions with * and %", () => {
    const scale = scaleFromText("32/27 * 81/80\n27/16 % 81/80\n2");
    expect(rationalToCents(scale.degrees[0].pitch.ratio!)).toBeCloseTo(
      rationalToCents({ n: 32n * 81n, d: 27n * 80n }),
      6
    );
    // 27/16 divided by 81/80 = 5/3
    expect(ratioText(scale.degrees[1])).toBe("5/3");
  });

  it("adds cents to EDO steps with + and subtracts with -", () => {
    const scale = scaleFromText("7\\12 + 1.96\nP8 - 1.96\n2");
    expect(centsOf(scale.degrees[0])).toBeCloseTo(700 + 1.96, 6);
    expect(centsOf(scale.degrees[1])).toBeCloseTo(1200 - 1.96, 6);
  });

  it("mixes ratios and cents with *~ and %~", () => {
    const scale = scaleFromText("4/3 *~ 1.23\n3/2 %~ 5.1\n2");
    expect(centsOf(scale.degrees[0])).toBeCloseTo(498.045 + 1.23, 3);
    expect(centsOf(scale.degrees[1])).toBeCloseTo(701.955 - 5.1, 3);
  });

  it("rejects multiplying cents-valued pitches with *", () => {
    expect(() => scaleFromText("7\\12 * 3/2\n2")).toThrow(/\*~/);
  });

  it("supports unary minus", () => {
    const scale = scaleFromText("3/2\n- 3/2\n2");
    // The negated entry inverts to 2/3 and sorts below the octave
    expect(scale.degrees.map(ratioText)).toContain("2/3");
    expect(formatRatio(scale.equave.ratio!)).toBe("2");
  });
});

describe("scaleFromText: comments, labels, colors", () => {
  it("strips (* block comments *) including across lines", () => {
    const scale = scaleFromText("(* header\ndetails *)\n3/2\n2 (* octave *)");
    expect(scale.degrees).toHaveLength(1);
    expect(ratioText(scale.degrees[0])).toBe("3/2");
  });

  it("attaches quoted labels and CSS colors", () => {
    const scale = scaleFromText('9/8 "my tone" yellow\n4/3 #fae123 "my fourth"\n2/1 "the octave" #fff');
    expect(scale.degrees[0].label).toBe("my tone");
    expect(scale.degrees[0].color).toBe("yellow");
    expect(scale.degrees[1].label).toBe("my fourth");
    expect(scale.degrees[1].color).toBe("#fae123");
    expect(scale.equave).toBeDefined();
  });

  it("handles labels before colors in either order", () => {
    const scale = scaleFromText('3/2 yellow "fifth"\n2');
    expect(scale.degrees[0].label).toBe("fifth");
    expect(scale.degrees[0].color).toBe("yellow");
  });
});

describe("scaleFromText: directives", () => {
  it("accepts simplify / defer simplify as no-ops", () => {
    const scale = scaleFromText("defer simplify\n10/8\n2");
    expect(ratioText(scale.degrees[0])).toBe("5/4");
  });

  it("sorts degrees ascending regardless of input order", () => {
    const scale = scaleFromText("3/2\n9/8\n2");
    expect(scale.degrees.map(ratioText)).toEqual(["9/8", "3/2"]);
  });

  it("drops duplicate intervals and unison lines", () => {
    const scale = scaleFromText("1/1\n9/8\n9/8\n5/4\n2");
    expect(scale.degrees.map(ratioText)).toEqual(["9/8", "5/4"]);
  });

  it("organizes nearby degrees when defer organize(tolerance) is present", () => {
    // 10/9 (~182c) vs 182.5c coalesce within 10c, keeping the simpler ratio
    const scale = scaleFromText("defer organize(10.)\n10/9\n182.5\n3/2\n2");
    expect(scale.degrees.map(ratioText)).toEqual(["10/9", "3/2"]);
  });

  it("collects unknown directives as warnings instead of failing", () => {
    const scale = scaleFromText("repeat 3\n3/2\n2");
    expect(scale.warnings.some((w) => w.includes("repeat"))).toBe(true);
    expect(scale.degrees.map(ratioText)).toEqual(["3/2"]);
  });
});

describe("scaleFromText: primodal scales", () => {
  it("builds the second octave of /13 as written by Zhea's method", () => {
    const harmonics = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const text =
      harmonics.map((n) => `${n}/13`).join("\n") + "\n26/13";
    const scale = scaleFromText(text);
    expect(scale.degrees).toHaveLength(harmonics.length);
    expect(ratioText(scale.degrees[0])).toBe("14/13");
    expect(formatRatio(scale.equave.ratio!)).toBe("2");
  });
});

describe("scaleFromText: errors", () => {
  it("throws on empty input", () => {
    expect(() => scaleFromText("   \n  ")).toThrow(/empty/i);
  });

  it("throws on unrecognizable tokens, citing the offending line", () => {
    expect(() => scaleFromText("3/2\nX9q\n2")).toThrow(/X9q/);
  });

  it("throws when only unison remains after deduplication", () => {
    expect(() => scaleFromText("1/1\n1/1")).toThrow(/non-unison/);
  });
});

describe("monzo helpers", () => {
  it("round-trips ratios through monzos within the prime limit", () => {
    const ratio = { n: 135n, d: 128n };
    const monzo = ratioToMonzo(ratio);
    expect(monzo).not.toBeNull();
    const restored = monzoToRatio(monzo!);
    expect(restored.n).toBe(135n);
    expect(restored.d).toBe(128n);
  });

  it("returns null for intervals beyond the prime limit table", () => {
    expect(ratioToMonzo({ n: 211n, d: 1n })).toBeNull();
  });
});
