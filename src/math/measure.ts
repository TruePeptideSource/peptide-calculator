import { Rational, type RoundingMode } from "./rational.js";

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
] as const;
export type MeasureUnit = (typeof MEASURE_UNITS)[number];

/**
 * Presentation rounding, in decimal places, half away from zero.
 *
 * - Syringe units to 0.1: finer than any insulin syringe marking (the finest
 *   is a half unit), coarse enough not to imply false precision.
 * - mL to 0.001: one U-100 unit is 0.01 mL, so three places keeps a tenth of
 *   a unit visible.
 * - mg to 0.001 (= 1 mcg) and mcg to 0.1, so mg and mcg views agree.
 */
export const PRESENTATION_DECIMALS: Readonly<Record<MeasureUnit, number>> = {
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

export interface Measured<U extends MeasureUnit = MeasureUnit> {
  /** Rounded for display per PRESENTATION_DECIMALS. */
  readonly value: number;
  readonly unit: U;
  /** Unrounded. Serialises to "num/den" in JSON. */
  readonly exact: Rational;
}

export function measure<U extends MeasureUnit>(exact: Rational, unit: U, mode: RoundingMode = "half-up"): Measured<U> {
  return {
    value: Number(exact.toDecimalString(PRESENTATION_DECIMALS[unit], mode)),
    unit,
    exact,
  };
}

export interface FormatOptions {
  /** Drop trailing zeros ("250" rather than "250.0"). Default true. */
  readonly trimZeros?: boolean;
  /** Append the unit ("250 mcg"). Default true. */
  readonly withUnit?: boolean;
}

/**
 * Display text with the canonical decimals, e.g. "5 units", "0.05 mL",
 * "250 mcg". One formatter, so a number never reads differently in two places.
 */
export function formatMeasured(m: Measured, options: FormatOptions = {}): string {
  const { trimZeros = true, withUnit = true } = options;
  let text = m.exact.toDecimalString(PRESENTATION_DECIMALS[m.unit], "half-up");
  if (trimZeros && text.includes(".")) text = text.replace(/\.?0+$/, "");
  if (!withUnit) return text;
  if (m.unit === "%") return `${text}%`;
  return `${text} ${m.unit}`;
}

/** Percent change from `from` to `to`: (to - from) / from * 100. */
export function percentChange(from: Rational, to: Rational): Measured<"%"> {
  return measure(to.sub(from).div(from).mul(Rational.of(100n)), "%");
}
