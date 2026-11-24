import { Rational } from "./rational.js";
/**
 * A computed quantity: the presentation-rounded number plus the exact value.
 *
 * Rounding happens exactly once, here, using the per-unit decimals below.
 * `value` is for display; `exact` is for anything that keeps calculating
 * ("show the math", chaining into another calculation, tests).
 */
export const MEASURE_UNITS = [
    "mcg",
    "mg",
    "IU",
    "mL",
    "units",
    "mg/mL",
    "mcg/mL",
    "IU/mL",
    "mcg/unit",
    "IU/unit",
    "%",
    "doses",
];
/**
 * Presentation rounding, in decimal places, half away from zero.
 *
 * - Syringe units to 0.1: finer than any insulin syringe marking (the finest
 *   is a half unit), coarse enough not to imply false precision.
 * - mL to 0.001: one U-100 unit is 0.01 mL, so three places keeps a tenth of
 *   a unit visible.
 * - mg to 0.001 (= 1 mcg) and mcg to 0.1, so mg and mcg views agree.
 */
export const PRESENTATION_DECIMALS = {
    mcg: 1,
    mg: 3,
    IU: 2,
    mL: 3,
    units: 1,
    "mg/mL": 3,
    "mcg/mL": 1,
    "IU/mL": 2,
    "mcg/unit": 2,
    "IU/unit": 3,
    "%": 1,
    doses: 1,
};
export function measure(exact, unit, mode = "half-up") {
    return {
        value: Number(exact.toDecimalString(PRESENTATION_DECIMALS[unit], mode)),
        unit,
        exact,
    };
}
/**
 * Display text with the canonical decimals, e.g. "5 units", "0.05 mL",
 * "250 mcg". One formatter, so a number never reads differently in two places.
 */
export function formatMeasured(m, options = {}) {
    const { trimZeros = true, withUnit = true } = options;
    let text = m.exact.toDecimalString(PRESENTATION_DECIMALS[m.unit], "half-up");
    if (trimZeros && text.includes("."))
        text = text.replace(/\.?0+$/, "");
    if (!withUnit)
        return text;
    if (m.unit === "%")
        return `${text}%`;
    return `${text} ${m.unit}`;
}
/** Percent change from `from` to `to`: (to - from) / from * 100. */
export function percentChange(from, to) {
    return measure(to.sub(from).div(from).mul(Rational.of(100n)), "%");
}
