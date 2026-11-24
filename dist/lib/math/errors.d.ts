/**
 * Typed input errors.
 *
 * Every public function validates its input and throws an `InputError` on
 * failure, so a caller can switch on `code` and `path` (for example to
 * highlight the right form field) without parsing messages.
 */
export declare const ERROR_CODES: readonly ["invalid_type", "not_positive", "too_small", "too_large", "invalid_value", "unknown_component"];
export type ErrorCode = (typeof ERROR_CODES)[number];
export interface InputIssue {
    /** Dotted path to the offending field, e.g. "peptides.1.mg". Empty for the root. */
    readonly path: string;
    readonly code: ErrorCode;
    readonly message: string;
}
export declare class InputError extends Error {
    readonly name = "InputError";
    /** Code of the first issue; the one a form should surface first. */
    readonly code: ErrorCode;
    /** Path of the first issue. */
    readonly path: string;
    readonly issues: readonly InputIssue[];
    constructor(context: string, issues: readonly InputIssue[]);
}
export declare function isInputError(error: unknown): error is InputError;
/** Throws a single-issue `InputError`. For rules checked after validation. */
export declare function failInput(context: string, path: string, code: ErrorCode, message: string): never;
/**
 * Input ceilings and floors, the same as truepeptidesource.com. Anything
 * outside is a typo, not a dose. They are deliberately generous: the largest
 * real vials sit far inside them.
 */
export declare const LIMITS: {
    /** Smallest accepted amount in its own unit (1e-6 mg = 1 ng). */
    readonly minAmount: 0.000001;
    readonly maxMg: 100000;
    readonly maxMcg: 100000000;
    /** Bacteriostatic water per vial. Real values are 0.5 to 10 mL. */
    readonly minWaterMl: 0.01;
    readonly maxWaterMl: 100;
    /** Syringe units drawn in reverse mode (any syringe). */
    readonly maxUnitsDrawn: 10000;
    /** Peptides in one blend vial. */
    readonly maxBlendComponents: 12;
};
export declare const MASS_UNITS: readonly ["mg", "mcg"];
export type MassUnit = (typeof MASS_UNITS)[number];
export declare function isMassUnit(value: unknown): value is MassUnit;
export declare const MAX_BY_UNIT: Readonly<Record<MassUnit, number>>;
/**
 * Collects issues for one input object, then throws them all at once so a
 * form can flag every bad field in one pass.
 */
export declare class Validator {
    private readonly context;
    readonly issues: InputIssue[];
    constructor(context: string);
    /** Rejects keys the function does not take (a typo like `watterMl` would otherwise be ignored). */
    object(value: unknown, allowed: readonly string[], path?: string): value is Record<string, unknown>;
    /** A positive, finite number within [min, max]. */
    positive(value: unknown, path: string, max: number, min?: number): value is number;
    /** An amount in mg or mcg; the ceiling depends on the unit (100,000 mg = 100,000,000 mcg). */
    amount(value: unknown, unit: unknown, valuePath: string, unitPath: string): void;
    water(value: unknown, path?: string): void;
    syringe(value: unknown, allowed: readonly string[], path?: string): void;
    custom(path: string, code: InputIssue["code"], message: string): void;
    /** Throws if anything was collected. */
    done(): void;
}
