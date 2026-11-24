import { type Measured } from "./measure.js";
import { Rational } from "./rational.js";
import { type SyringeId } from "./syringe.js";
import type { SyringeWarning } from "./warnings.js";
/** Concentration per mL in each reachable dimension. */
export interface PerMl {
    /** mcg per mL, or null when unknown (IU vial without factor). */
    readonly mcg: Rational | null;
    /** IU per mL, or null when unknown (mass vial without factor). */
    readonly iu: Rational | null;
}
/** What one syringe shows for a given liquid volume. */
export interface SyringeReading {
    readonly syringe: SyringeId;
    readonly label: string;
    readonly unitsPerMl: number;
    readonly capacityUnits: number;
    readonly markUnits: number;
    /** Mark resolution note for this barrel. */
    readonly note: string;
    /** Units to draw, to 0.1. */
    readonly units: Measured<"units">;
    /** Syringes needed: 1 when it fits, more when it exceeds capacity. */
    readonly draws: number;
    /**
     * The printed mark nearest to `units`. A dose exactly halfway between two
     * marks goes to the LOWER mark: rounding a tie up would add a dose's worth
     * of error on the side that hurts (3 units on 2-unit marks -> 2, never 4).
     */
    readonly nearestMark: Measured<"units">;
    /** How much the dose changes if drawn to `nearestMark` instead of `units`. */
    readonly nearestMarkDeviation: Measured<"%">;
    /** Amount of compound in one unit on this syringe. */
    readonly perUnit: {
        readonly mcg?: Measured<"mcg/unit">;
        readonly iu?: Measured<"IU/unit">;
    };
    readonly warnings: readonly SyringeWarning[];
}
/**
 * Above this |% change| between the true dose and the nearest mark, a reading
 * warns and points to a finer barrel. 5% is inside the fill variance people
 * already accept from a vial; past it the mark, not the vial, decides the dose.
 */
export declare const MARK_DEVIATION_WARN_PERCENT = 5;
/**
 * Nearest printed mark to `units`; exact ties go to the lower mark. Below
 * the first mark the answer is the first mark, never 0: 0 is not a dose, and
 * the reading's `below_smallest_mark` / `sub_one_unit` warning says why that
 * draw is a problem.
 */
export declare function nearestMarkTo(units: Rational, mark: Rational): Rational;
/** Reads one syringe for `volumeMl` of liquid at concentration `perMl`. */
export declare function readSyringe(id: SyringeId, volumeMl: Rational, perMl: PerMl): SyringeReading;
/** Readings for every supported syringe, keyed by id. */
export declare function readAllSyringes(volumeMl: Rational, perMl: PerMl): Readonly<Record<SyringeId, SyringeReading>>;
/** Concentration views for a PerMl. */
export interface ConcentrationViews {
    readonly mgPerMl?: Measured<"mg/mL">;
    readonly mcgPerMl?: Measured<"mcg/mL">;
    readonly iuPerMl?: Measured<"IU/mL">;
}
export declare function concentrationViews(perMl: PerMl): ConcentrationViews;
