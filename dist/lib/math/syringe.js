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
export const SYRINGE_IDS = ["U-100", "U-50", "U-40", "U-30"];
export function isSyringeId(value) {
    return typeof value === "string" && SYRINGE_IDS.includes(value);
}
export const SYRINGES = {
    "U-100": {
        id: "U-100",
        label: "U-100 insulin syringe, 1 mL (100 units)",
        unitsPerMl: 100,
        capacityMl: 1,
        capacityUnits: 100,
        markUnits: 2,
        note: "1 mL U-100 barrels are usually marked every 2 units (0.02 mL). Odd-unit doses sit between two marks.",
    },
    "U-50": {
        id: "U-50",
        label: "U-100 insulin syringe, 0.5 mL (50 units, sold as U-50)",
        unitsPerMl: 100,
        capacityMl: 0.5,
        capacityUnits: 50,
        markUnits: 1,
        note: "A 0.5 mL barrel on the U-100 scale, usually marked every 1 unit (0.01 mL). Same units as a 1 mL U-100.",
    },
    "U-40": {
        id: "U-40",
        label: "U-40 syringe, 1 mL (40 units)",
        unitsPerMl: 40,
        capacityMl: 1,
        capacityUnits: 40,
        markUnits: 1,
        note: "U-40 is a different scale: 40 units per mL, usually marked every 1 unit (0.025 mL). Never read U-100 units on it.",
    },
    "U-30": {
        id: "U-30",
        label: "U-100 insulin syringe, 0.3 mL (30 units, sold as U-30)",
        unitsPerMl: 100,
        capacityMl: 0.3,
        capacityUnits: 30,
        markUnits: 1,
        note: "A 0.3 mL barrel on the U-100 scale, marked every 1 unit (0.01 mL); some brands add half-unit marks. Same units as a 1 mL U-100.",
    },
};
export function syringeUnitsPerMl(id) {
    return Rational.int(SYRINGES[id].unitsPerMl);
}
export function syringeCapacityUnits(id) {
    return Rational.int(SYRINGES[id].capacityUnits);
}
export function syringeMarkUnits(id) {
    return Rational.int(SYRINGES[id].markUnits);
}
