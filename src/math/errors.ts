/**
 * Typed input errors.
 *
 * Every public function validates its input and throws an `InputError` on
 * failure, so a caller can switch on `code` and `path` (for example to
 * highlight the right form field) without parsing messages.
 */

export const ERROR_CODES = [
  /** Wrong type, including NaN and +/-Infinity, which are never valid numbers here. */
  "invalid_type",
  /** Zero or negative where a positive quantity is required. */
  "not_positive",
  /** Positive but below the smallest meaningful value (see LIMITS). */
  "too_small",
  /** Above the documented ceiling (see LIMITS). Almost always a typo. */
  "too_large",
  /** A value outside an allowed set, an unknown key, or a broken cross-field rule. */
  "invalid_value",
  /** A blend target names a peptide the blend does not contain. */
  "unknown_component",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface InputIssue {
  /** Dotted path to the offending field, e.g. "peptides.1.mg". Empty for the root. */
  readonly path: string;
  readonly code: ErrorCode;
  readonly message: string;
}

export class InputError extends Error {
  override readonly name = "InputError";
  /** Code of the first issue; the one a form should surface first. */
  readonly code: ErrorCode;
  /** Path of the first issue. */
  readonly path: string;
  readonly issues: readonly InputIssue[];

  constructor(context: string, issues: readonly InputIssue[]) {
    const first = issues[0] ?? { path: "", code: "invalid_value" as const, message: "Invalid input" };
    super(`${context}: ${first.path ? `${first.path}: ` : ""}${first.message}`);
    this.code = first.code;
    this.path = first.path;
    this.issues = issues.length > 0 ? issues : [first];
  }
}

export function isInputError(error: unknown): error is InputError {
  return error instanceof InputError;
}

/** Throws a single-issue `InputError`. For rules checked after validation. */
export function failInput(context: string, path: string, code: ErrorCode, message: string): never {
  throw new InputError(context, [{ path, code, message }]);
}

/**
 * Input ceilings and floors, the same as truepeptidesource.com. Anything
 * outside is a typo, not a dose. They are deliberately generous: the largest
 * real vials sit far inside them.
 */
export const LIMITS = {
  /** Smallest accepted amount in its own unit (1e-6 mg = 1 ng). */
  minAmount: 0.000001,
  maxMg: 100_000,
  maxMcg: 100_000_000,
  /** Bacteriostatic water per vial. Real values are 0.5 to 10 mL. */
  minWaterMl: 0.01,
  maxWaterMl: 100,
  /** Syringe units drawn in reverse mode (any syringe). */
  maxUnitsDrawn: 10_000,
  /** Peptides in one blend vial. */
  maxBlendComponents: 12,
} as const;

export const MASS_UNITS = ["mg", "mcg"] as const;
export type MassUnit = (typeof MASS_UNITS)[number];

export function isMassUnit(value: unknown): value is MassUnit {
  return value === "mg" || value === "mcg";
}

export const MAX_BY_UNIT: Readonly<Record<MassUnit, number>> = { mg: LIMITS.maxMg, mcg: LIMITS.maxMcg };

/**
 * Collects issues for one input object, then throws them all at once so a
 * form can flag every bad field in one pass.
 */
export class Validator {
  readonly issues: InputIssue[] = [];

  constructor(private readonly context: string) {}

  /** Rejects keys the function does not take (a typo like `watterMl` would otherwise be ignored). */
  object(value: unknown, allowed: readonly string[], path = ""): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      this.issues.push({ path, code: "invalid_type", message: "Expected an object" });
      return false;
    }
    const extra = Object.keys(value).filter((k) => !allowed.includes(k));
    if (extra.length > 0) {
      this.issues.push({ path, code: "invalid_value", message: `Unknown key(s): ${extra.join(", ")}` });
    }
    return true;
  }

  /** A positive, finite number within [min, max]. */
  positive(value: unknown, path: string, max: number, min: number = LIMITS.minAmount): value is number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      this.issues.push({ path, code: "invalid_type", message: "Expected a finite number" });
      return false;
    }
    if (value <= 0) {
      this.issues.push({ path, code: "not_positive", message: "Must be greater than 0" });
      return false;
    }
    if (value < min) {
      this.issues.push({ path, code: "too_small", message: `Must be at least ${min}` });
      return false;
    }
    if (value > max) {
      this.issues.push({ path, code: "too_large", message: `Must be at most ${max}` });
      return false;
    }
    return true;
  }

  /** An amount in mg or mcg; the ceiling depends on the unit (100,000 mg = 100,000,000 mcg). */
  amount(value: unknown, unit: unknown, valuePath: string, unitPath: string): void {
    if (!isMassUnit(unit)) {
      this.issues.push({ path: unitPath, code: "invalid_value", message: 'Must be "mg" or "mcg"' });
      this.positive(value, valuePath, LIMITS.maxMcg);
      return;
    }
    this.positive(value, valuePath, MAX_BY_UNIT[unit]);
  }

  water(value: unknown, path = "waterMl"): void {
    this.positive(value, path, LIMITS.maxWaterMl, LIMITS.minWaterMl);
  }

  syringe(value: unknown, allowed: readonly string[], path = "syringe"): void {
    if (typeof value !== "string" || !allowed.includes(value)) {
      this.issues.push({ path, code: "invalid_value", message: `Must be one of ${allowed.join(", ")}` });
    }
  }

  custom(path: string, code: InputIssue["code"], message: string): void {
    this.issues.push({ path, code, message });
  }

  /** Throws if anything was collected. */
  done(): void {
    if (this.issues.length > 0) throw new InputError(this.context, this.issues);
  }
}
