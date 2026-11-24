import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRESETS, blendDose, formatMeasured, reconstitute, unitsToDose, type Measured, type SyringeId } from "../src/index.js";

/**
 * The site's own answers, recorded from truepeptidesource.com by
 * scripts/site-parity.mjs. Every number here must match the library exactly.
 */
const fixture = JSON.parse(readFileSync(new URL("./fixtures/site-parity.json", import.meta.url), "utf8"));

type Case = any;
const cases = (list: Case[]): [string, Case][] => list.map((c) => [JSON.stringify(c.input), c]);

const SITE_SYRINGE: Record<string, SyringeId> = {
  "U-100, 1 mL": "U-100",
  "U-100, 0.5 mL": "U-50",
  "U-40, 1 mL": "U-40",
  "U-100, 0.3 mL": "U-30",
};

/** Formats `views` in the unit the site used in `text` ("250 mcg" or "0.25 mg"). */
function sameUnit(text: string, views: { mg: Measured<"mg">; mcg: Measured<"mcg"> }): string {
  return formatMeasured(text.endsWith(" mg") ? views.mg : views.mcg);
}

describe("matches truepeptidesource.com: reconstitution", () => {
  it.each(cases(fixture.reconstitution))("%s", (_label, c) => {
    const r = reconstitute({ vialMg: c.input.vialAmount, waterMl: c.input.waterMl, dose: c.input.dose, doseUnit: c.input.doseUnit });
    expect(r.units.value).toBe(c.site.units);
    expect(formatMeasured(r.volumeMl)).toBe(c.site.liquidPerDose);
    expect([formatMeasured(r.concentration.mgPerMl), formatMeasured(r.concentration.mcgPerMl)]).toEqual(c.site.concentration);
    expect(r.fullDosesPerVial).toBe(c.site.fullDosesPerVial);
    for (const other of c.site.otherSyringes) expect(r.syringes[SITE_SYRINGE[other.syringe]!].units.value).toBe(other.units);
  });
});

describe("matches truepeptidesource.com: units to dose", () => {
  it.each(cases(fixture.reverse))("%s", (_label, c) => {
    const r = unitsToDose({ vialMg: c.input.vialAmount, waterMl: c.input.waterMl, units: c.input.unitsDrawn, syringe: c.input.syringe });
    expect(sameUnit(c.site.dose, r.dose)).toBe(c.site.dose);
    expect([formatMeasured(r.dose.mcg), formatMeasured(r.dose.mg)]).toEqual(c.site.doseAllUnits);
    expect(formatMeasured(r.volumeMl)).toBe(c.site.liquidPerDose);
    expect(formatMeasured(r.fractionOfVial)).toBe(c.site.shareOfVial);
  });
});

describe("matches truepeptidesource.com: blends", () => {
  it.each(cases(fixture.blend))("%s", (_label, c) => {
    const peptides = c.input.blend
      ? PRESETS[String(c.input.blend).toLowerCase()]!.components
      : c.input.components.map((x: any) => ({ name: x.peptide, mg: x.amount }));
    const r = blendDose({
      peptides,
      waterMl: c.input.waterMl,
      dose: c.input.dose,
      doseUnit: c.input.doseUnit,
      ...(c.input.targetPeptide ? { target: c.input.targetPeptide } : {}),
    });
    expect(r.units.value).toBe(c.site.reading.units);
    expect(formatMeasured(r.volumeMl)).toBe(c.site.liquidPerDose);
    expect(r.fullDosesPerVial).toBe(c.site.fullDosesPerVial);
    expect(r.peptides.map((p) => p.name)).toEqual(c.site.perComponent.map((p: any) => p.peptide));
    r.peptides.forEach((p, i) => {
      const site = c.site.perComponent[i];
      expect(sameUnit(site.amountPerDose, p.delivered)).toBe(site.amountPerDose);
      expect(formatMeasured(p.shareOfVial)).toBe(site.shareOfVial);
      expect([formatMeasured(p.concentration.mgPerMl), formatMeasured(p.concentration.mcgPerMl)]).toEqual(site.concentration);
    });
    expect(sameUnit(c.site.vialTotal, r.vialTotal)).toBe(c.site.vialTotal);
    expect(sameUnit(c.site.drawnTotal, r.drawnTotal)).toBe(c.site.drawnTotal);
    for (const other of c.site.otherSyringes) expect(r.syringes[SITE_SYRINGE[other.syringe]!].units.value).toBe(other.units);
  });
});
