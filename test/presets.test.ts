import { describe, expect, it } from "vitest";
import { PRESETS, blendDose, reconstitute } from "../src/index.js";

const REQUIRED = ["semaglutide", "tirzepatide", "retatrutide", "bpc-157", "tb-500", "ipamorelin", "cjc-1295", "ghk-cu", "bpc-157-tb-500-blend", "klow", "glow"];
const ORIGINS = new Set(["Clinical study", "FDA / regulator", "Protocol sites", "Community reported", "Media", "Reference"]);

describe("presets", () => {
  it("cover every widget preset", () => {
    expect(Object.keys(PRESETS).sort()).toEqual([...REQUIRED].sort());
  });

  it.each(Object.values(PRESETS).map((p) => [p.slug, p] as const))("%s computes with the site's starting values", (_slug, p) => {
    expect(p.vialMg).not.toBeNull();
    expect(p.waterMl).not.toBeNull();
    if (!p.startingDose || p.vialMg === null || p.waterMl === null) return;
    expect(ORIGINS.has(p.startingDose.origin)).toBe(true);
    const units = p.isBlend
      ? blendDose({ peptides: p.components, waterMl: p.waterMl, dose: p.startingDose.value, doseUnit: p.startingDose.unit }).units.value
      : reconstitute({ vialMg: p.vialMg, waterMl: p.waterMl, dose: p.startingDose.value, doseUnit: p.startingDose.unit }).units.value;
    expect(units).toBeGreaterThan(0);
  });

  it("blend label totals match their components", () => {
    for (const p of Object.values(PRESETS).filter((x) => x.isBlend)) {
      expect(p.components.length).toBeGreaterThanOrEqual(2);
      expect(p.components.reduce((s, c) => s + c.mg, 0)).toBe(p.vialMg);
    }
  });

  it("semaglutide starts on the site's values: 5 mg, 2 mL, 0.25 mg = 10 units", () => {
    const p = PRESETS["semaglutide"]!;
    expect([p.vialMg, p.waterMl, p.startingDose?.value, p.startingDose?.unit]).toEqual([5, 2, 0.25, "mg"]);
    expect(reconstitute({ vialMg: 5, waterMl: 2, dose: 0.25, doseUnit: "mg" }).units.value).toBe(10);
  });

  it("contain no em dashes", () => {
    expect(JSON.stringify(PRESETS)).not.toContain("\u2014");
  });
});
