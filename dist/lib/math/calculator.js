import { LIMITS, Validator, failInput } from "./errors.js";
import { measure } from "./measure.js";
import { Rational } from "./rational.js";
import { readAllSyringes, readSyringe } from "./readings.js";
import { SYRINGE_IDS, syringeUnitsPerMl } from "./syringe.js";
/**
 * The calculators. Same math as truepeptidesource.com: every input is read
 * as the exact decimal the person typed, the whole chain stays in exact
 * rationals, and rounding happens once, for display (see measure.ts).
 *
 *   concentration  = vial content / water
 *   volume (mL)    = dose / concentration
 *   units          = volume * syringe units-per-mL
 *   doses per vial = vial content / dose
 */
const THOUSAND = Rational.of(1000n);
const HUNDRED = Rational.of(100n);
/** Concentrations outside these bounds are almost always a typo (mcg typed as mg, water in L). */
export const DEFAULT_CONCENTRATION_THRESHOLDS = { lowMgPerMl: 0.1, highMgPerMl: 100 };
/** mg or mcg to exact mcg. */
function toMcg(value, unit) {
    const r = Rational.fromNumber(value);
    return unit === "mg" ? r.mul(THOUSAND) : r;
}
function massViews(mcg) {
    return { mg: measure(mcg.div(THOUSAND), "mg"), mcg: measure(mcg, "mcg") };
}
function concentrationOf(mcgPerMl) {
    return { mgPerMl: measure(mcgPerMl.div(THOUSAND), "mg/mL"), mcgPerMl: measure(mcgPerMl, "mcg/mL") };
}
function doseExceedsVial(dosesPerVial) {
    if (!dosesPerVial.lt(Rational.ONE))
        return [];
    return [
        {
            code: "dose_exceeds_vial",
            dosesPerVial: measure(dosesPerVial, "doses").value,
            message: "This dose is more than the whole vial contains.",
        },
    ];
}
function volumeWarning(volumeMl, water, waterMl) {
    if (!volumeMl.gt(water))
        return [];
    return [
        {
            code: "exceeds_vial_volume",
            volumeMl: measure(volumeMl, "mL").value,
            waterMl,
            message: "This draw is more liquid than the vial holds.",
        },
    ];
}
function concentrationWarnings(mcgPerMl, thresholds) {
    const mgPerMl = mcgPerMl.div(THOUSAND);
    const shown = measure(mgPerMl, "mg/mL").value;
    if (mgPerMl.gt(Rational.fromNumber(thresholds.highMgPerMl))) {
        return [
            {
                code: "concentration_high",
                mgPerMl: shown,
                thresholdMgPerMl: thresholds.highMgPerMl,
                message: `${shown} mg/mL is an unusually strong mix. Check the vial size and the water volume.`,
            },
        ];
    }
    if (mgPerMl.lt(Rational.fromNumber(thresholds.lowMgPerMl))) {
        return [
            {
                code: "concentration_low",
                mgPerMl: shown,
                thresholdMgPerMl: thresholds.lowMgPerMl,
                message: `${shown} mg/mL is an unusually weak mix. Check the vial size and the water volume.`,
            },
        ];
    }
    return [];
}
const RECONSTITUTE_KEYS = ["vialMg", "waterMl", "dose", "doseUnit", "syringe", "thresholds"];
/**
 * Units to draw for a dose from a reconstituted vial.
 *
 * @example
 * reconstitute({ vialMg: 10, waterMl: 2, dose: 2, doseUnit: "mg" }).units.value // 40
 * @throws InputError on NaN, zero, negative, out-of-range or unknown input.
 */
export function reconstitute(input) {
    const context = "reconstitute";
    const v = new Validator(context);
    if (v.object(input, RECONSTITUTE_KEYS)) {
        v.positive(input.vialMg, "vialMg", LIMITS.maxMg);
        v.water(input.waterMl);
        v.amount(input.dose, input.doseUnit, "dose", "doseUnit");
        if (input.syringe !== undefined)
            v.syringe(input.syringe, SYRINGE_IDS);
        if (input.thresholds !== undefined && v.object(input.thresholds, ["lowMgPerMl", "highMgPerMl"], "thresholds")) {
            const lowOk = v.positive(input.thresholds.lowMgPerMl, "thresholds.lowMgPerMl", LIMITS.maxMg);
            const highOk = v.positive(input.thresholds.highMgPerMl, "thresholds.highMgPerMl", LIMITS.maxMg);
            if (lowOk && highOk && !(input.thresholds.lowMgPerMl < input.thresholds.highMgPerMl)) {
                v.custom("thresholds.highMgPerMl", "invalid_value", "lowMgPerMl must be below highMgPerMl");
            }
        }
    }
    v.done();
    const syringe = input.syringe ?? "U-100";
    const content = toMcg(input.vialMg, "mg");
    const dose = toMcg(input.dose, input.doseUnit);
    const water = Rational.fromNumber(input.waterMl);
    const perMl = content.div(water);
    const volumeMl = dose.div(perMl);
    const dosesPerVial = content.div(dose);
    const syringes = readAllSyringes(volumeMl, { mcg: perMl, iu: null });
    const reading = syringes[syringe];
    return {
        concentration: concentrationOf(perMl),
        dose: massViews(dose),
        volumeMl: measure(volumeMl, "mL"),
        units: reading.units,
        syringe,
        reading,
        syringes,
        dosesPerVial: measure(dosesPerVial, "doses"),
        fullDosesPerVial: Number(dosesPerVial.floor()),
        warnings: [
            ...doseExceedsVial(dosesPerVial),
            ...concentrationWarnings(perMl, input.thresholds ?? DEFAULT_CONCENTRATION_THRESHOLDS),
        ],
    };
}
/**
 * "I drew N units on this syringe. How much did I take?"
 *
 *   volume (mL) = units / syringe units-per-mL
 *   dose        = volume * vial content / water
 *
 * @example
 * unitsToDose({ vialMg: 10, waterMl: 2, units: 5 }).dose.mcg.value // 250
 */
export function unitsToDose(input) {
    const context = "unitsToDose";
    const v = new Validator(context);
    if (v.object(input, ["vialMg", "waterMl", "units", "syringe"])) {
        v.positive(input.vialMg, "vialMg", LIMITS.maxMg);
        v.water(input.waterMl);
        v.positive(input.units, "units", LIMITS.maxUnitsDrawn);
        if (input.syringe !== undefined)
            v.syringe(input.syringe, SYRINGE_IDS);
    }
    v.done();
    const syringe = input.syringe ?? "U-100";
    const content = toMcg(input.vialMg, "mg");
    const water = Rational.fromNumber(input.waterMl);
    const perMl = content.div(water);
    const volumeMl = Rational.fromNumber(input.units).div(syringeUnitsPerMl(syringe));
    const fraction = volumeMl.div(water);
    return {
        volumeMl: measure(volumeMl, "mL"),
        dose: massViews(content.mul(fraction)),
        concentration: concentrationOf(perMl),
        fractionOfVial: measure(fraction.mul(HUNDRED), "%"),
        reading: readSyringe(syringe, volumeMl, { mcg: perMl, iu: null }),
        warnings: volumeWarning(volumeMl, water, input.waterMl),
    };
}
/**
 * @example dosesPerVial({ vialMg: 10, dose: 250, doseUnit: "mcg" }).fullDoses // 40
 */
export function dosesPerVial(input) {
    const v = new Validator("dosesPerVial");
    if (v.object(input, ["vialMg", "dose", "doseUnit"])) {
        v.positive(input.vialMg, "vialMg", LIMITS.maxMg);
        v.amount(input.dose, input.doseUnit, "dose", "doseUnit");
    }
    v.done();
    const doses = toMcg(input.vialMg, "mg").div(toMcg(input.dose, input.doseUnit));
    return { dosesPerVial: measure(doses, "doses"), fullDoses: Number(doses.floor()), warnings: doseExceedsVial(doses) };
}
function validatePeptides(v, peptides) {
    if (!Array.isArray(peptides)) {
        v.custom("peptides", "invalid_type", "Expected an array of { name, mg }");
        return;
    }
    if (peptides.length < 1 || peptides.length > LIMITS.maxBlendComponents) {
        v.custom("peptides", peptides.length < 1 ? "too_small" : "too_large", `A blend has 1 to ${LIMITS.maxBlendComponents} peptides`);
    }
    const seen = new Set();
    peptides.forEach((p, i) => {
        if (!v.object(p, ["name", "mg"], `peptides.${i}`))
            return;
        if (typeof p.name !== "string" || p.name.trim() === "" || p.name.length > 80) {
            v.custom(`peptides.${i}.name`, "invalid_value", "Name must be 1 to 80 characters");
        }
        else if (seen.has(p.name)) {
            v.custom(`peptides.${i}.name`, "invalid_value", `Duplicate peptide "${p.name}"`);
        }
        else {
            seen.add(p.name);
        }
        v.positive(p.mg, `peptides.${i}.mg`, LIMITS.maxMg);
    });
}
function componentsOf(peptides) {
    return peptides.map((p) => ({ name: p.name, mcg: toMcg(p.mg, "mg") }));
}
function vialTotal(components) {
    return components.reduce((sum, c) => sum.add(c.mcg), Rational.ZERO);
}
function peptidesAt(components, fraction, water) {
    const total = vialTotal(components);
    return components.map((c) => ({
        name: c.name,
        delivered: massViews(c.mcg.mul(fraction)),
        concentration: concentrationOf(c.mcg.div(water)),
        shareOfVial: measure(c.mcg.div(total).mul(HUNDRED), "%"),
    }));
}
function totalsAt(components, fraction) {
    const total = vialTotal(components);
    return { vialTotal: massViews(total), drawnTotal: massViews(total.mul(fraction)) };
}
/**
 * How much of EACH peptide one draw of `units` delivers.
 *
 * @example
 * blend({ peptides: [{ name: "BPC-157", mg: 5 }, { name: "TB-500", mg: 5 }], waterMl: 2, units: 10 })
 * // 0.1 mL: BPC-157 250 mcg, TB-500 250 mcg
 */
export function blend(input) {
    const context = "blend";
    const v = new Validator(context);
    if (v.object(input, ["peptides", "waterMl", "units", "syringe"])) {
        validatePeptides(v, input.peptides);
        v.water(input.waterMl);
        v.positive(input.units, "units", LIMITS.maxUnitsDrawn);
        if (input.syringe !== undefined)
            v.syringe(input.syringe, SYRINGE_IDS);
    }
    v.done();
    const syringe = input.syringe ?? "U-100";
    const components = componentsOf(input.peptides);
    const water = Rational.fromNumber(input.waterMl);
    const volumeMl = Rational.fromNumber(input.units).div(syringeUnitsPerMl(syringe));
    const fraction = volumeMl.div(water);
    return {
        volumeMl: measure(volumeMl, "mL"),
        peptides: peptidesAt(components, fraction, water),
        ...totalsAt(components, fraction),
        reading: readSyringe(syringe, volumeMl, { mcg: vialTotal(components).div(water), iu: null }),
        warnings: volumeWarning(volumeMl, water, input.waterMl),
    };
}
/**
 * Units to draw for a blend dose, plus what every peptide delivers.
 *
 * @example
 * blendDose({ peptides: KLOW, waterMl: 4, dose: 2, doseUnit: "mg" })
 * // 80 mg in 4 mL = 20 mg/mL; 2 mg = 0.1 mL = 10 units:
 * // GHK-Cu 1.25 mg, BPC-157 250 mcg, TB-500 250 mcg, KPV 250 mcg
 * @throws InputError `unknown_component` when `target` is not in the blend.
 */
export function blendDose(input) {
    const context = "blendDose";
    const v = new Validator(context);
    if (v.object(input, ["peptides", "waterMl", "dose", "doseUnit", "target", "syringe"])) {
        validatePeptides(v, input.peptides);
        v.water(input.waterMl);
        v.amount(input.dose, input.doseUnit, "dose", "doseUnit");
        if (input.target !== undefined && typeof input.target !== "string")
            v.custom("target", "invalid_type", "Expected a peptide name");
        if (input.syringe !== undefined)
            v.syringe(input.syringe, SYRINGE_IDS);
    }
    v.done();
    const syringe = input.syringe ?? "U-100";
    const components = componentsOf(input.peptides);
    const total = vialTotal(components);
    let content = total;
    if (input.target !== undefined) {
        const found = components.find((c) => c.name === input.target);
        if (!found)
            failInput(context, "target", "unknown_component", `"${input.target}" is not in this blend`);
        content = found.mcg;
    }
    const dose = toMcg(input.dose, input.doseUnit);
    const water = Rational.fromNumber(input.waterMl);
    const fraction = dose.div(content);
    const volumeMl = water.mul(fraction);
    const dosesPerVial = content.div(dose);
    // Readings report per-unit amounts of the dose being chosen: the target peptide, or the whole blend.
    const syringes = readAllSyringes(volumeMl, { mcg: content.div(water), iu: null });
    const reading = syringes[syringe];
    return {
        volumeMl: measure(volumeMl, "mL"),
        units: reading.units,
        syringe,
        reading,
        syringes,
        dosesPerVial: measure(dosesPerVial, "doses"),
        fullDosesPerVial: Number(dosesPerVial.floor()),
        peptides: peptidesAt(components, fraction, water),
        ...totalsAt(components, fraction),
        warnings: doseExceedsVial(dosesPerVial),
    };
}
