import { measure, percentChange } from "./measure.js";
import { Rational } from "./rational.js";
import { SYRINGE_IDS, SYRINGES, syringeCapacityUnits, syringeMarkUnits, syringeUnitsPerMl } from "./syringe.js";
/**
 * Above this |% change| between the true dose and the nearest mark, a reading
 * warns and points to a finer barrel. 5% is inside the fill variance people
 * already accept from a vial; past it the mark, not the vial, decides the dose.
 */
export const MARK_DEVIATION_WARN_PERCENT = 5;
/**
 * Nearest printed mark to `units`; exact ties go to the lower mark. Below
 * the first mark the answer is the first mark, never 0: 0 is not a dose, and
 * the reading's `below_smallest_mark` / `sub_one_unit` warning says why that
 * draw is a problem.
 */
export function nearestMarkTo(units, mark) {
    if (units.lt(mark))
        return mark;
    const lower = Rational.of(units.div(mark).floor()).mul(mark);
    const upper = lower.add(mark);
    return units.sub(lower).lte(upper.sub(units)) ? lower : upper;
}
/** Liquid volume one printed mark stands for, in mL. */
function markVolumeMl(id) {
    return syringeMarkUnits(id).div(syringeUnitsPerMl(id));
}
/** |% change| from units to its nearest mark on `id`, exact. */
function deviationOn(id, volumeMl) {
    const units = volumeMl.mul(syringeUnitsPerMl(id));
    const mark = nearestMarkTo(units, syringeMarkUnits(id));
    return { units, mark, percent: mark.sub(units).div(units).mul(Rational.of(100n)) };
}
/**
 * A barrel with finer marks that can hold `volumeMl` in one draw and puts a
 * mark within the threshold of the dose. Finest marks first; between equally
 * fine barrels the roomier one wins (0.5 mL before 0.3 mL).
 */
function finerBarrelFor(id, volumeMl, threshold) {
    const ownMark = markVolumeMl(id);
    const candidates = SYRINGE_IDS.filter((c) => c !== id && markVolumeMl(c).lt(ownMark)).sort((a, b) => markVolumeMl(a).cmp(markVolumeMl(b)) || SYRINGES[b].capacityMl - SYRINGES[a].capacityMl);
    for (const candidate of candidates) {
        const { units, percent } = deviationOn(candidate, volumeMl);
        if (units.gt(syringeCapacityUnits(candidate)) || units.lt(syringeMarkUnits(candidate)))
            continue;
        if (percent.abs().lte(threshold))
            return { id: candidate, units };
    }
    return null;
}
function markDeviationWarning(id, volumeMl, units, nearestMark) {
    const threshold = Rational.int(MARK_DEVIATION_WARN_PERCENT);
    const deviation = percentChange(units, nearestMark);
    if (!deviation.exact.abs().gt(threshold))
        return null;
    const shown = measure(units, "units").value;
    const markShown = nearestMark.toNumber();
    const finer = finerBarrelFor(id, volumeMl, threshold);
    const lower = Rational.of(units.div(syringeMarkUnits(id)).floor()).mul(syringeMarkUnits(id));
    const upper = lower.add(syringeMarkUnits(id));
    const base = {
        code: "nearest_mark_imprecise",
        syringe: id,
        units: shown,
        nearestMark: markShown,
        deviationPercent: deviation.value,
        thresholdPercent: MARK_DEVIATION_WARN_PERCENT,
    };
    const off = `Drawing to the ${markShown} unit mark gives ${Math.abs(deviation.value)}% ${deviation.value < 0 ? "less" : "more"} than this dose.`;
    if (finer) {
        const finerUnits = measure(finer.units, "units").value;
        return {
            ...base,
            recommendedSyringe: finer.id,
            recommendedUnits: finerUnits,
            message: `${off} A ${SYRINGES[finer.id].label} has finer marks: draw ${finerUnits} units on it.`,
        };
    }
    return {
        ...base,
        recommendedSyringe: null,
        recommendedUnits: null,
        message: `${off} Draw between the ${lower.toNumber()} and ${upper.toNumber()} unit marks, or change the water so the dose lands on a mark.`,
    };
}
function warningsFor(id, volumeMl, units, nearestMark, draws) {
    const spec = SYRINGES[id];
    const shown = measure(units, "units").value;
    const warnings = [];
    if (units.gt(syringeCapacityUnits(id))) {
        warnings.push({
            code: "exceeds_syringe_capacity",
            syringe: id,
            units: shown,
            capacityUnits: spec.capacityUnits,
            draws,
            message: `This dose is ${shown} units, more than a ${spec.capacityUnits}-unit syringe holds. Use a larger syringe, ${draws} draws, or less water.`,
        });
    }
    const mark = syringeMarkUnits(id);
    if (units.lt(Rational.ONE)) {
        warnings.push({
            code: "sub_one_unit",
            syringe: id,
            units: shown,
            message: `This dose is under 1 unit (${shown}), too small to draw accurately. Add more water to the vial so each dose is a bigger draw.`,
        });
    }
    else if (units.lt(mark)) {
        warnings.push({
            code: "below_smallest_mark",
            syringe: id,
            units: shown,
            markUnits: spec.markUnits,
            message: `This dose (${shown} units) is below the first mark on this syringe (${spec.markUnits} units). Use a smaller barrel or add more water.`,
        });
    }
    else if (!nearestMark.eq(units)) {
        const lower = Rational.of(units.div(mark).floor()).mul(mark);
        const upper = lower.add(mark);
        warnings.push({
            code: "between_marks",
            syringe: id,
            units: shown,
            lowerMark: lower.toNumber(),
            upperMark: upper.toNumber(),
            message: `${shown} units falls between the ${lower.toNumber()} and ${upper.toNumber()} unit marks on this syringe.`,
        });
        // Only for doses a mark can reach: under the first mark the warnings above already apply.
        const imprecise = markDeviationWarning(id, volumeMl, units, nearestMark);
        if (imprecise)
            warnings.push(imprecise);
    }
    return warnings;
}
/** Reads one syringe for `volumeMl` of liquid at concentration `perMl`. */
export function readSyringe(id, volumeMl, perMl) {
    const spec = SYRINGES[id];
    const unitsPerMl = syringeUnitsPerMl(id);
    const units = volumeMl.mul(unitsPerMl);
    const mark = syringeMarkUnits(id);
    const nearestMark = nearestMarkTo(units, mark);
    const draws = Math.max(1, Number(units.div(syringeCapacityUnits(id)).ceil()));
    return {
        syringe: id,
        label: spec.label,
        unitsPerMl: spec.unitsPerMl,
        capacityUnits: spec.capacityUnits,
        markUnits: spec.markUnits,
        note: spec.note,
        units: measure(units, "units"),
        draws,
        nearestMark: measure(nearestMark, "units"),
        nearestMarkDeviation: percentChange(units, nearestMark),
        perUnit: {
            ...(perMl.mcg ? { mcg: measure(perMl.mcg.div(unitsPerMl), "mcg/unit") } : {}),
            ...(perMl.iu ? { iu: measure(perMl.iu.div(unitsPerMl), "IU/unit") } : {}),
        },
        warnings: warningsFor(id, volumeMl, units, nearestMark, draws),
    };
}
/** Readings for every supported syringe, keyed by id. */
export function readAllSyringes(volumeMl, perMl) {
    const entries = SYRINGE_IDS.map((id) => [id, readSyringe(id, volumeMl, perMl)]);
    return Object.fromEntries(entries);
}
export function concentrationViews(perMl) {
    return {
        ...(perMl.mcg
            ? { mgPerMl: measure(perMl.mcg.div(Rational.of(1000n)), "mg/mL"), mcgPerMl: measure(perMl.mcg, "mcg/mL") }
            : {}),
        ...(perMl.iu ? { iuPerMl: measure(perMl.iu, "IU/mL") } : {}),
    };
}
