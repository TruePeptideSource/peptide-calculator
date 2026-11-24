import { describe, expect, it } from "vitest";
import {
  InputError,
  MARK_DEVIATION_WARN_PERCENT,
  Rational,
  SYRINGES,
  blend,
  blendDose,
  dosesPerVial,
  formatMeasured,
  reconstitute,
  unitsToDose,
  type ReconstituteInput,
} from "../src/index.js";

function expectInputError(fn: () => unknown, code: string, path?: string): InputError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(InputError);
    const e = error as InputError;
    expect(e.code).toBe(code);
    if (path !== undefined) expect(e.path).toBe(path);
    return e;
  }
  throw new Error("expected an InputError");
}

const BPC_TB = [
  { name: "BPC-157", mg: 5 },
  { name: "TB-500", mg: 5 },
];
const KLOW = [
  { name: "GHK-Cu", mg: 50 },
  { name: "BPC-157", mg: 10 },
  { name: "TB-500", mg: 10 },
  { name: "KPV", mg: 10 },
];

describe("required cases", () => {
  it("10 mg vial + 2 mL water, 2 mg dose = 40 units on U-100", () => {
    const r = reconstitute({ vialMg: 10, waterMl: 2, dose: 2, doseUnit: "mg", syringe: "U-100" });
    expect(r.concentration.mgPerMl.value).toBe(5);
    expect(r.volumeMl.value).toBe(0.4);
    expect(r.units.value).toBe(40);
    expect(r.units.exact.toString()).toBe("40");
  });

  it("10 units on a U-40 syringe = 2.5x the volume of 10 units on a U-100", () => {
    const u40 = unitsToDose({ vialMg: 10, waterMl: 2, units: 10, syringe: "U-40" });
    const u100 = unitsToDose({ vialMg: 10, waterMl: 2, units: 10, syringe: "U-100" });
    expect(u40.volumeMl.value).toBe(0.25);
    expect(u100.volumeMl.value).toBe(0.1);
    expect(u40.volumeMl.exact.div(u100.volumeMl.exact).toString()).toBe("5/2");
  });

  it("2.5 mg at 10 mg/mL = 25 units; 2.5 mg at 20 mg/mL = 12.5 units (U-100)", () => {
    const at10 = reconstitute({ vialMg: 20, waterMl: 2, dose: 2.5, doseUnit: "mg" });
    const at20 = reconstitute({ vialMg: 20, waterMl: 1, dose: 2.5, doseUnit: "mg" });
    expect(at10.concentration.mgPerMl.value).toBe(10);
    expect(at10.units.value).toBe(25);
    expect(at20.concentration.mgPerMl.value).toBe(20);
    expect(at20.units.value).toBe(12.5);
  });

  it("0.25 mg at 2.5 mg/mL = 10 units; 0.25 mg at 5 mg/mL = 5 units (U-100)", () => {
    const at2_5 = reconstitute({ vialMg: 5, waterMl: 2, dose: 0.25, doseUnit: "mg" });
    const at5 = reconstitute({ vialMg: 10, waterMl: 2, dose: 0.25, doseUnit: "mg" });
    expect(at2_5.concentration.mgPerMl.value).toBe(2.5);
    expect(at2_5.units.value).toBe(10);
    expect(at5.concentration.mgPerMl.value).toBe(5);
    expect(at5.units.value).toBe(5);
  });

  it("BPC-157 5 mg + TB-500 5 mg, 2 mL water: 10 units = 250 mcg of each", () => {
    const r = blend({ peptides: BPC_TB, waterMl: 2, units: 10, syringe: "U-100" });
    expect(r.volumeMl.value).toBe(0.1);
    expect(r.peptides.map((p) => [p.name, p.delivered.mcg.value])).toEqual([
      ["BPC-157", 250],
      ["TB-500", 250],
    ]);
    expect(r.drawnTotal.mcg.value).toBe(500);
  });
});

describe("reconstitute", () => {
  const base: ReconstituteInput = { vialMg: 10, waterMl: 2, dose: 250, doseUnit: "mcg" };

  it("10 mg + 2 mL, 250 mcg: 5 mg/mL, 0.05 mL, 5 units, 40 doses", () => {
    const r = reconstitute(base);
    expect(r.concentration.mgPerMl.value).toBe(5);
    expect(r.concentration.mcgPerMl.value).toBe(5000);
    expect(r.volumeMl.value).toBe(0.05);
    expect(r.volumeMl.exact.toString()).toBe("1/20");
    expect(r.units.value).toBe(5);
    expect(r.syringe).toBe("U-100");
    expect(r.reading.perUnit.mcg?.value).toBe(50);
    expect(r.dosesPerVial.value).toBe(40);
    expect(r.fullDosesPerVial).toBe(40);
    expect(r.dose.mcg.value).toBe(250);
    expect(r.dose.mg.value).toBe(0.25);
    expect(r.warnings).toEqual([]);
  });

  it("U-50 and U-30 read the same units as U-100 (they are U-100 scale); U-40 reads 40% of them", () => {
    const r = reconstitute(base);
    expect(r.syringes["U-50"].units.value).toBe(5);
    expect(r.syringes["U-30"].units.value).toBe(5);
    expect(r.syringes["U-40"].units.value).toBe(2);
    expect(r.syringes["U-40"].perUnit.mcg?.value).toBe(125);
    expect(reconstitute({ ...base, syringe: "U-40" }).units.value).toBe(2);
  });

  it("mcg and mg doses agree exactly", () => {
    const a = reconstitute({ vialMg: 10, waterMl: 2, dose: 0.25, doseUnit: "mg" });
    const b = reconstitute(base);
    expect(a.units.exact.eq(b.units.exact)).toBe(true);
  });

  it("rounds to 0.1 unit for display but keeps full precision", () => {
    // 6 mg in 2 mL, 1 mg: 1/3 mL = 33.333... units
    const r = reconstitute({ vialMg: 6, waterMl: 2, dose: 1, doseUnit: "mg" });
    expect(r.volumeMl.exact.toString()).toBe("1/3");
    expect(r.volumeMl.value).toBe(0.333);
    expect(r.units.value).toBe(33.3);
    expect(r.units.exact.toString()).toBe("100/3");
    expect(formatMeasured(r.units)).toBe("33.3 units");
    // 10 mg in 3 mL, 250 mcg: exactly 7.5 units
    expect(reconstitute({ ...base, waterMl: 3 }).units.value).toBe(7.5);
  });

  it("decimal inputs do not pick up float error (0.1 + 0.2 style)", () => {
    // 0.3 mg vial, 0.1 mL water, 0.1 mg dose = 1/30 mL = 3.333... units
    const r = reconstitute({ vialMg: 0.3, waterMl: 0.1, dose: 0.1, doseUnit: "mg" });
    expect(r.units.exact.toString()).toBe("10/3");
    expect(r.dosesPerVial.exact.toString()).toBe("3");
  });

  it("dose bigger than the vial warns, never throws", () => {
    const r = reconstitute({ ...base, dose: 12, doseUnit: "mg" });
    expect(r.warnings.map((w) => w.code)).toContain("dose_exceeds_vial");
    expect(r.fullDosesPerVial).toBe(0);
    expect(r.dosesPerVial.value).toBe(0.8);
  });

  it("over syringe capacity reports the draws needed", () => {
    // 2 mg = 40 units: fits a U-100, takes 2 draws on a 30-unit U-30
    const r = reconstitute({ ...base, dose: 2, doseUnit: "mg" });
    expect(r.syringes["U-100"].draws).toBe(1);
    expect(r.syringes["U-30"].draws).toBe(2);
    expect(r.syringes["U-30"].warnings.find((w) => w.code === "exceeds_syringe_capacity")).toMatchObject({ capacityUnits: 30, draws: 2, units: 40 });
  });

  it("sub-one-unit and below-first-mark draws warn", () => {
    expect(reconstitute({ ...base, waterMl: 0.5, dose: 100 }).reading.warnings.map((w) => w.code)).toEqual(["sub_one_unit"]);
    expect(reconstitute({ ...base, dose: 75 }).reading.warnings.map((w) => w.code)).toEqual(["below_smallest_mark"]);
  });

  it("unusual concentrations warn, with overridable thresholds", () => {
    expect(reconstitute({ vialMg: 60, waterMl: 0.5, dose: 1, doseUnit: "mg" }).warnings.map((w) => w.code)).toContain("concentration_high");
    expect(reconstitute({ vialMg: 1, waterMl: 20, dose: 10, doseUnit: "mcg" }).warnings.map((w) => w.code)).toContain("concentration_low");
    expect(
      reconstitute({ vialMg: 60, waterMl: 0.5, dose: 1, doseUnit: "mg", thresholds: { lowMgPerMl: 0.01, highMgPerMl: 500 } }).warnings,
    ).toEqual([]);
  });

  it("messages carry no em dashes", () => {
    const r = reconstitute({ ...base, waterMl: 0.5, dose: 100 });
    const all = [...r.warnings, ...Object.values(r.syringes).flatMap((s) => s.warnings)];
    for (const w of all) expect(w.message).not.toContain("\u2014");
    for (const spec of Object.values(SYRINGES)) expect(spec.note).not.toContain("\u2014");
  });
});

describe("input validation", () => {
  const base: ReconstituteInput = { vialMg: 10, waterMl: 2, dose: 250, doseUnit: "mcg" };

  it.each([
    ["zero vial", { ...base, vialMg: 0 }, "not_positive", "vialMg"],
    ["negative vial", { ...base, vialMg: -10 }, "not_positive", "vialMg"],
    ["zero water", { ...base, waterMl: 0 }, "not_positive", "waterMl"],
    ["negative dose", { ...base, dose: -250 }, "not_positive", "dose"],
    ["zero dose", { ...base, dose: 0 }, "not_positive", "dose"],
    ["NaN vial", { ...base, vialMg: Number.NaN }, "invalid_type", "vialMg"],
    ["Infinity water", { ...base, waterMl: Number.POSITIVE_INFINITY }, "invalid_type", "waterMl"],
    ["string number", { ...base, waterMl: "2" }, "invalid_type", "waterMl"],
    ["tiny water", { ...base, waterMl: 0.001 }, "too_small", "waterMl"],
    ["tiny dose", { ...base, dose: 1e-9 }, "too_small", "dose"],
    ["huge vial", { ...base, vialMg: 1e9 }, "too_large", "vialMg"],
    ["huge water", { ...base, waterMl: 1e6 }, "too_large", "waterMl"],
    ["huge mg dose", { ...base, dose: 200_000, doseUnit: "mg" }, "too_large", "dose"],
    ["unknown unit", { ...base, doseUnit: "g" }, "invalid_value", "doseUnit"],
    ["unknown syringe", { ...base, syringe: "U-20" }, "invalid_value", "syringe"],
    ["unknown key", { ...base, watterMl: 2 }, "invalid_value", ""],
  ])("rejects %s with a clear error", (_name, input, code, path) => {
    expectInputError(() => reconstitute(input as ReconstituteInput), code, path);
  });

  it("errors read clearly and report every bad field", () => {
    const e = expectInputError(() => reconstitute({ vialMg: -1, waterMl: Number.NaN, dose: 0, doseUnit: "mg" }), "not_positive");
    expect(e.message).toBe("reconstitute: vialMg: Must be greater than 0");
    expect(e.issues.map((i) => i.path)).toEqual(["vialMg", "waterMl", "dose"]);
  });

  it("accepts the documented limits exactly", () => {
    expect(() => reconstitute({ vialMg: 100_000, waterMl: 100, dose: 100_000_000, doseUnit: "mcg" })).not.toThrow();
    expect(() => reconstitute({ vialMg: 1, waterMl: 0.01, dose: 0.000001, doseUnit: "mg" })).not.toThrow();
  });

  it("every function validates", () => {
    expectInputError(() => unitsToDose({ vialMg: 10, waterMl: 2, units: 0 }), "not_positive", "units");
    expectInputError(() => unitsToDose({ vialMg: 10, waterMl: 2, units: 1e7 }), "too_large", "units");
    expectInputError(() => dosesPerVial({ vialMg: 10, dose: -1, doseUnit: "mg" }), "not_positive", "dose");
    expectInputError(() => blend({ peptides: [], waterMl: 2, units: 10 }), "too_small", "peptides");
    expectInputError(() => blend({ peptides: [{ name: "A", mg: 0 }], waterMl: 2, units: 10 }), "not_positive", "peptides.0.mg");
    expectInputError(
      () => blend({ peptides: [{ name: "A", mg: 5 }, { name: "A", mg: 5 }], waterMl: 2, units: 10 }),
      "invalid_value",
      "peptides.1.name",
    );
    expectInputError(() => blendDose({ peptides: BPC_TB, waterMl: 2, dose: 1, doseUnit: "mg", target: "KPV" }), "unknown_component", "target");
  });
});

describe("unitsToDose", () => {
  it("5 units on U-100 from 10 mg + 2 mL = 250 mcg, 2.5% of the vial", () => {
    const r = unitsToDose({ vialMg: 10, waterMl: 2, units: 5 });
    expect(r.volumeMl.value).toBe(0.05);
    expect(r.dose.mcg.value).toBe(250);
    expect(r.dose.mg.value).toBe(0.25);
    expect(r.fractionOfVial.value).toBe(2.5);
    expect(r.warnings).toEqual([]);
  });

  it("2 units on U-40 is the same 0.05 mL", () => {
    const r = unitsToDose({ vialMg: 10, waterMl: 2, units: 2, syringe: "U-40" });
    expect(r.volumeMl.value).toBe(0.05);
    expect(r.dose.mcg.value).toBe(250);
  });

  it("round-trips with reconstitute", () => {
    const fwd = reconstitute({ vialMg: 7, waterMl: 3, dose: 333, doseUnit: "mcg" });
    const back = unitsToDose({ vialMg: 7, waterMl: 3, units: fwd.units.exact.toNumber() });
    expect(back.dose.mcg.value).toBe(333);
  });

  it("warns when the draw exceeds the vial or the syringe", () => {
    const r = unitsToDose({ vialMg: 10, waterMl: 0.5, units: 60, syringe: "U-30" });
    expect(r.warnings.map((w) => w.code)).toEqual(["exceeds_vial_volume"]);
    expect(r.reading.warnings.map((w) => w.code)).toContain("exceeds_syringe_capacity");
  });
});

describe("dosesPerVial", () => {
  it("10 mg at 250 mcg = 40 doses; 5 mg at 0.75 mg = 6.7 (6 whole)", () => {
    expect(dosesPerVial({ vialMg: 10, dose: 250, doseUnit: "mcg" })).toMatchObject({ fullDoses: 40, warnings: [] });
    const r = dosesPerVial({ vialMg: 5, dose: 0.75, doseUnit: "mg" });
    expect(r.dosesPerVial.value).toBe(6.7);
    expect(r.dosesPerVial.exact.toString()).toBe("20/3");
    expect(r.fullDoses).toBe(6);
  });
});

describe("blends", () => {
  it("BPC/TB 10 mg in 2 mL: 250 mcg of BPC-157 = 10 units, TB-500 rides along", () => {
    const r = blendDose({ peptides: BPC_TB, waterMl: 2, dose: 250, doseUnit: "mcg", target: "BPC-157" });
    expect(r.units.value).toBe(10);
    expect(r.peptides.map((p) => p.delivered.mcg.value)).toEqual([250, 250]);
    expect(r.dosesPerVial.value).toBe(20);
  });

  it("KLOW 80 mg in 4 mL, 2 mg of the whole blend: 10 units, each peptide pro rata", () => {
    const r = blendDose({ peptides: KLOW, waterMl: 4, dose: 2, doseUnit: "mg" });
    expect(r.units.value).toBe(10);
    expect(r.peptides.map((p) => [p.name, formatMeasured(p.delivered.mg)])).toEqual([
      ["GHK-Cu", "1.25 mg"],
      ["BPC-157", "0.25 mg"],
      ["TB-500", "0.25 mg"],
      ["KPV", "0.25 mg"],
    ]);
    expect(r.vialTotal.mg.value).toBe(80);
    expect(r.drawnTotal.mg.value).toBe(2);
    expect(r.dosesPerVial.value).toBe(40);
  });

  it("KLOW 80 mg in 3 mL, 10 units: GHK-Cu 1.667 mg, others 333.3 mcg (site example)", () => {
    const r = blend({ peptides: KLOW, waterMl: 3, units: 10 });
    expect(r.volumeMl.value).toBe(0.1);
    expect(r.peptides.map((p) => p.delivered.mcg.value)).toEqual([1666.7, 333.3, 333.3, 333.3]);
    expect(r.peptides[0]?.delivered.mg.value).toBe(1.667);
  });

  it("KLOW 80 mg in 3 mL, 500 mcg BPC-157: 15 units, GHK-Cu 2.5 mg rides along (site example)", () => {
    const r = blendDose({ peptides: KLOW, waterMl: 3, dose: 500, doseUnit: "mcg", target: "BPC-157" });
    expect(r.volumeMl.value).toBe(0.15);
    expect(r.units.value).toBe(15);
    expect(r.peptides.map((p) => p.delivered.mcg.value)).toEqual([2500, 500, 500, 500]);
  });

  it("three-peptide blend (GLOW 70 mg) shares sum to exactly 100%", () => {
    const glow = [
      { name: "GHK-Cu", mg: 50 },
      { name: "BPC-157", mg: 10 },
      { name: "TB-500", mg: 10 },
    ];
    const r = blend({ peptides: glow, waterMl: 3, units: 10 });
    const sum = r.peptides.reduce((s, p) => s.add(p.shareOfVial.exact), Rational.ZERO);
    expect(sum.toString()).toBe("100");
  });

  it("units mode and dose mode agree for the same draw", () => {
    const byDose = blendDose({ peptides: KLOW, waterMl: 4, dose: 2, doseUnit: "mg" });
    const byUnits = blend({ peptides: KLOW, waterMl: 4, units: byDose.units.exact.toNumber() });
    expect(byUnits.peptides.map((p) => p.delivered.mcg.exact.toString())).toEqual(byDose.peptides.map((p) => p.delivered.mcg.exact.toString()));
  });

  it("blend draws past the vial volume or the whole vial warn", () => {
    expect(blend({ peptides: BPC_TB, waterMl: 2, units: 250 }).warnings.map((w) => w.code)).toEqual(["exceeds_vial_volume"]);
    expect(blendDose({ peptides: BPC_TB, waterMl: 2, dose: 20, doseUnit: "mg" }).warnings.map((w) => w.code)).toEqual(["dose_exceeds_vial"]);
  });
});

describe("nearest mark (ported from the site)", () => {
  // 10 mg in 2 mL: 50 mcg per U-100 unit.
  const at = (mcg: number) => reconstitute({ vialMg: 10, waterMl: 2, dose: mcg, doseUnit: "mcg" });

  it.each([
    [150, 3, 2],
    [250, 5, 4],
    [350, 7, 6],
  ] as const)("%s mcg = %s units on a 1 mL U-100 ties to the lower mark %s and points to the 0.5 mL barrel", (mcg, units, mark) => {
    const reading = at(mcg).syringes["U-100"];
    expect(reading.units.value).toBe(units);
    expect(reading.nearestMark.value).toBe(mark);
    expect(reading.warnings.find((w) => w.code === "nearest_mark_imprecise")).toMatchObject({ recommendedSyringe: "U-50", recommendedUnits: units });
  });

  it("2.5 units on a U-30 ties down to 2 and says to draw between the marks", () => {
    const reading = at(125).syringes["U-30"];
    expect(reading.nearestMark.value).toBe(2);
    const imprecise = reading.warnings.find((w) => w.code === "nearest_mark_imprecise");
    expect(imprecise).toMatchObject({ deviationPercent: -20, recommendedSyringe: null, recommendedUnits: null });
    expect(imprecise?.message).toContain("between the 2 and 3 unit marks");
  });

  it("a non-tie goes to the nearest mark, even the upper one", () => {
    expect(at(260).syringes["U-100"].nearestMark.value).toBe(6);
  });

  it(`no imprecision warning at or under ${MARK_DEVIATION_WARN_PERCENT}%`, () => {
    for (const mcg of [2050, 1050]) expect(at(mcg).syringes["U-100"].warnings.map((w) => w.code)).toEqual(["between_marks"]);
    expect(at(500).syringes["U-100"].warnings).toEqual([]);
  });
});
