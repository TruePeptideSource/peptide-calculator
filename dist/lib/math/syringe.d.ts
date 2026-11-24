import { Rational } from "./rational.js";
/**
 * Insulin syringes as people use them for peptides.
 *
 * Read this before changing anything: "U-50" and "U-30" are NOT 50 or 30
 * units-per-mL scales. They are the names labels and calculators use for
 * 0.5 mL and 0.3 mL U-100 syringes (50 and 30 units of capacity). Every one of
 * them is printed on the U-100 scale, so the same dose is the same number of
 * units on a U-100, "U-50" or "U-30" barrel. Treating "U-50" as 50 units/mL
 * would show half the correct units and double a dose.
 *
 * U-40 is a real different scale (40 units per mL, made for U-40 insulin and
 * veterinary use). Its units are not interchangeable with U-100 units.
 *
 * Mark spacing is what most barrels of that size print; brands vary, so the
 * note tells the reader to check their own barrel.
 */
export declare const SYRINGE_IDS: readonly ["U-100", "U-50", "U-40", "U-30"];
export type SyringeId = (typeof SYRINGE_IDS)[number];
export declare function isSyringeId(value: unknown): value is SyringeId;
export interface SyringeSpec {
    readonly id: SyringeId;
    /** Display name. */
    readonly label: string;
    /** Printed scale: units per 1 mL of liquid. */
    readonly unitsPerMl: number;
    readonly capacityMl: number;
    /** capacityMl * unitsPerMl. */
    readonly capacityUnits: number;
    /** Spacing of the printed marks, in units. */
    readonly markUnits: number;
    /** Plain-language resolution note for the reader. */
    readonly note: string;
}
export declare const SYRINGES: Readonly<Record<SyringeId, SyringeSpec>>;
export declare function syringeUnitsPerMl(id: SyringeId): Rational;
export declare function syringeCapacityUnits(id: SyringeId): Rational;
export declare function syringeMarkUnits(id: SyringeId): Rational;
