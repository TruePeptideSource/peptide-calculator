/**
 * peptide-calculator: exact peptide reconstitution, syringe-unit and blend
 * math, the same as truepeptidesource.com. Zero runtime dependencies.
 *
 * Every number is computed in exact rationals and rounded once, for
 * display: `.value` is the rounded number, `.exact` the full-precision one.
 */
export {
  reconstitute,
  unitsToDose,
  dosesPerVial,
  blend,
  blendDose,
  DEFAULT_CONCENTRATION_THRESHOLDS,
  type ReconstituteInput,
  type ReconstituteResult,
  type UnitsToDoseInput,
  type UnitsToDoseResult,
  type DosesPerVialInput,
  type DosesPerVialResult,
  type BlendPeptide,
  type BlendPeptideResult,
  type BlendInput,
  type BlendResult,
  type BlendDoseInput,
  type BlendDoseResult,
  type BlendTotals,
  type MassViews,
  type ConcentrationViews,
} from "./math/calculator.js";
export { SYRINGES, SYRINGE_IDS, isSyringeId, type SyringeId, type SyringeSpec } from "./math/syringe.js";
export { MARK_DEVIATION_WARN_PERCENT, nearestMarkTo, type SyringeReading } from "./math/readings.js";
export { formatMeasured, measure, PRESENTATION_DECIMALS, type Measured, type MeasureUnit } from "./math/measure.js";
export { Rational, roundRational, type RoundingMode } from "./math/rational.js";
export { InputError, isInputError, LIMITS, MASS_UNITS, ERROR_CODES, type ErrorCode, type InputIssue, type MassUnit } from "./math/errors.js";
export type { GlobalWarning, MathWarning, MathWarningCode, SyringeWarning } from "./math/warnings.js";
export { PRESETS, PRESETS_SOURCE, type Preset, type PresetComponent } from "./presets.js";
