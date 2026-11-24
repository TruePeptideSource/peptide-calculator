import type { SyringeId } from "./syringe.js";
/**
 * Warnings are data: a stable `code` the UI switches on, the numbers behind
 * it, and a default plain-English `message` the UI may replace with its own
 * copy. A warning never blocks a result; invalid input throws instead.
 */
export type SyringeWarning = {
    readonly code: "exceeds_syringe_capacity";
    readonly syringe: SyringeId;
    readonly units: number;
    readonly capacityUnits: number;
    /** Full or partial syringes needed to draw the dose. */
    readonly draws: number;
    readonly message: string;
} | {
    readonly code: "sub_one_unit";
    readonly syringe: SyringeId;
    readonly units: number;
    readonly message: string;
} | {
    readonly code: "below_smallest_mark";
    readonly syringe: SyringeId;
    readonly units: number;
    readonly markUnits: number;
    readonly message: string;
} | {
    readonly code: "between_marks";
    readonly syringe: SyringeId;
    readonly units: number;
    readonly lowerMark: number;
    readonly upperMark: number;
    readonly message: string;
} | {
    /**
     * Drawing to the nearest printed mark changes the dose by more than
     * MARK_DEVIATION_WARN_PERCENT. Names a finer barrel that resolves the
     * dose, or null when none does (then: draw between the marks).
     */
    readonly code: "nearest_mark_imprecise";
    readonly syringe: SyringeId;
    readonly units: number;
    readonly nearestMark: number;
    /** Signed % change of the dose when drawn to `nearestMark`. */
    readonly deviationPercent: number;
    readonly thresholdPercent: number;
    readonly recommendedSyringe: SyringeId | null;
    /** Units to draw on `recommendedSyringe` (its own scale), or null. */
    readonly recommendedUnits: number | null;
    readonly message: string;
};
export type GlobalWarning = {
    readonly code: "dose_exceeds_vial";
    /** Fraction of a dose the vial holds, e.g. 0.8. */
    readonly dosesPerVial: number;
    readonly message: string;
} | {
    readonly code: "concentration_high" | "concentration_low";
    readonly mgPerMl: number;
    readonly thresholdMgPerMl: number;
    readonly message: string;
} | {
    readonly code: "exceeds_vial_volume";
    readonly volumeMl: number;
    readonly waterMl: number;
    readonly message: string;
};
export type MathWarning = SyringeWarning | GlobalWarning;
export type MathWarningCode = MathWarning["code"];
