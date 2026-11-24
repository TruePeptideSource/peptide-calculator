/**
 * peptide-calculator: exact peptide reconstitution, syringe-unit and blend
 * math, the same as truepeptidesource.com. Zero runtime dependencies.
 *
 * Every number is computed in exact rationals and rounded once, for
 * display: `.value` is the rounded number, `.exact` the full-precision one.
 */
export { reconstitute, unitsToDose, dosesPerVial, blend, blendDose, DEFAULT_CONCENTRATION_THRESHOLDS, } from "./math/calculator.js";
export { SYRINGES, SYRINGE_IDS, isSyringeId } from "./math/syringe.js";
export { MARK_DEVIATION_WARN_PERCENT, nearestMarkTo } from "./math/readings.js";
export { formatMeasured, measure, PRESENTATION_DECIMALS } from "./math/measure.js";
export { Rational, roundRational } from "./math/rational.js";
export { InputError, isInputError, LIMITS, MASS_UNITS, ERROR_CODES } from "./math/errors.js";
export { PRESETS, PRESETS_SOURCE } from "./presets.js";
