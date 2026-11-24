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
];
export class InputError extends Error {
    constructor(context, issues) {
        const first = issues[0] ?? { path: "", code: "invalid_value", message: "Invalid input" };
        super(`${context}: ${first.path ? `${first.path}: ` : ""}${first.message}`);
        this.name = "InputError";
        this.code = first.code;
        this.path = first.path;
        this.issues = issues.length > 0 ? issues : [first];
    }
}
export function isInputError(error) {
    return error instanceof InputError;
}
/** Throws a single-issue `InputError`. For rules checked after validation. */
export function failInput(context, path, code, message) {
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
    maxMg: 100000,
    maxMcg: 100000000,
    /** Bacteriostatic water per vial. Real values are 0.5 to 10 mL. */
    minWaterMl: 0.01,
    maxWaterMl: 100,
    /** Syringe units drawn in reverse mode (any syringe). */
    maxUnitsDrawn: 10000,
    /** Peptides in one blend vial. */
    maxBlendComponents: 12,
};
export const MASS_UNITS = ["mg", "mcg"];
export function isMassUnit(value) {
    return value === "mg" || value === "mcg";
}
export const MAX_BY_UNIT = { mg: LIMITS.maxMg, mcg: LIMITS.maxMcg };
/**
 * Collects issues for one input object, then throws them all at once so a
 * form can flag every bad field in one pass.
 */
export class Validator {
    constructor(context) {
        this.context = context;
        this.issues = [];
    }
    /** Rejects keys the function does not take (a typo like `watterMl` would otherwise be ignored). */
    object(value, allowed, path = "") {
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
    positive(value, path, max, min = LIMITS.minAmount) {
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
    amount(value, unit, valuePath, unitPath) {
        if (!isMassUnit(unit)) {
            this.issues.push({ path: unitPath, code: "invalid_value", message: 'Must be "mg" or "mcg"' });
            this.positive(value, valuePath, LIMITS.maxMcg);
            return;
        }
        this.positive(value, valuePath, MAX_BY_UNIT[unit]);
    }
    water(value, path = "waterMl") {
        this.positive(value, path, LIMITS.maxWaterMl, LIMITS.minWaterMl);
    }
    syringe(value, allowed, path = "syringe") {
        if (typeof value !== "string" || !allowed.includes(value)) {
            this.issues.push({ path, code: "invalid_value", message: `Must be one of ${allowed.join(", ")}` });
        }
    }
    custom(path, code, message) {
        this.issues.push({ path, code, message });
    }
    /** Throws if anything was collected. */
    done() {
        if (this.issues.length > 0)
            throw new InputError(this.context, this.issues);
    }
}
