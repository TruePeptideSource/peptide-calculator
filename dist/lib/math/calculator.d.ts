import { type MassUnit } from "./errors.js";
import { type Measured } from "./measure.js";
import { type SyringeReading } from "./readings.js";
import { type SyringeId } from "./syringe.js";
import type { GlobalWarning } from "./warnings.js";
/** Concentrations outside these bounds are almost always a typo (mcg typed as mg, water in L). */
export declare const DEFAULT_CONCENTRATION_THRESHOLDS: {
    readonly lowMgPerMl: 0.1;
    readonly highMgPerMl: 100;
};
/** One amount in both mass units. */
export interface MassViews {
    readonly mg: Measured<"mg">;
    readonly mcg: Measured<"mcg">;
}
export interface ConcentrationViews {
    readonly mgPerMl: Measured<"mg/mL">;
    readonly mcgPerMl: Measured<"mcg/mL">;
}
export interface ReconstituteInput {
    /** Peptide in the vial, in mg (the number on the label). */
    readonly vialMg: number;
    /** Bacteriostatic water added, in mL. */
    readonly waterMl: number;
    /** The dose to draw. */
    readonly dose: number;
    readonly doseUnit: MassUnit;
    /** Syringe you draw with. Default "U-100". */
    readonly syringe?: SyringeId;
    /** Override the unusual-concentration bounds (mg/mL). */
    readonly thresholds?: {
        readonly lowMgPerMl: number;
        readonly highMgPerMl: number;
    };
}
export interface ReconstituteResult {
    readonly concentration: ConcentrationViews;
    /** The requested dose in mg and mcg. */
    readonly dose: MassViews;
    /** Liquid to draw per dose. */
    readonly volumeMl: Measured<"mL">;
    /** Units to draw on the chosen syringe (display rounded to 0.1; `.exact` keeps full precision). */
    readonly units: Measured<"units">;
    readonly syringe: SyringeId;
    /** Full reading on the chosen syringe: nearest printed mark, draws needed, warnings. */
    readonly reading: SyringeReading;
    /** The same draw read on every supported syringe. */
    readonly syringes: Readonly<Record<SyringeId, SyringeReading>>;
    /** Vial content / dose. May be fractional. */
    readonly dosesPerVial: Measured<"doses">;
    /** Whole doses one vial supplies (floor). */
    readonly fullDosesPerVial: number;
    /** Warnings not tied to one syringe. Per-syringe warnings live on each reading. */
    readonly warnings: readonly GlobalWarning[];
}
/**
 * Units to draw for a dose from a reconstituted vial.
 *
 * @example
 * reconstitute({ vialMg: 10, waterMl: 2, dose: 2, doseUnit: "mg" }).units.value // 40
 * @throws InputError on NaN, zero, negative, out-of-range or unknown input.
 */
export declare function reconstitute(input: ReconstituteInput): ReconstituteResult;
export interface UnitsToDoseInput {
    readonly vialMg: number;
    readonly waterMl: number;
    /** Units drawn, read off the syringe's own scale. */
    readonly units: number;
    /** Default "U-100". */
    readonly syringe?: SyringeId;
}
export interface UnitsToDoseResult {
    readonly volumeMl: Measured<"mL">;
    /** The dose drawn, in mg and mcg. */
    readonly dose: MassViews;
    readonly concentration: ConcentrationViews;
    /** Share of the vial this draw uses. */
    readonly fractionOfVial: Measured<"%">;
    /** The reading on the syringe used, including capacity and mark warnings. */
    readonly reading: SyringeReading;
    readonly warnings: readonly GlobalWarning[];
}
/**
 * "I drew N units on this syringe. How much did I take?"
 *
 *   volume (mL) = units / syringe units-per-mL
 *   dose        = volume * vial content / water
 *
 * @example
 * unitsToDose({ vialMg: 10, waterMl: 2, units: 5 }).dose.mcg.value // 250
 */
export declare function unitsToDose(input: UnitsToDoseInput): UnitsToDoseResult;
export interface DosesPerVialInput {
    readonly vialMg: number;
    readonly dose: number;
    readonly doseUnit: MassUnit;
}
export interface DosesPerVialResult {
    /** Vial content / dose, may be fractional. */
    readonly dosesPerVial: Measured<"doses">;
    /** Whole doses (floor). */
    readonly fullDoses: number;
    readonly warnings: readonly GlobalWarning[];
}
/**
 * @example dosesPerVial({ vialMg: 10, dose: 250, doseUnit: "mcg" }).fullDoses // 40
 */
export declare function dosesPerVial(input: DosesPerVialInput): DosesPerVialResult;
/**
 * Blends: one vial holding several peptides, e.g. BPC-157 5 mg + TB-500 5 mg,
 * or KLOW (GHK-Cu 50 mg + BPC-157 10 mg + TB-500 10 mg + KPV 10 mg).
 * Every draw takes every peptide in the vial's fixed ratio.
 */
export interface BlendPeptide {
    /** Display name, e.g. "BPC-157". Must be unique within the blend. */
    readonly name: string;
    /** Peptide in the vial, in mg. */
    readonly mg: number;
}
export interface BlendPeptideResult {
    readonly name: string;
    /** Amount of this peptide in the draw. */
    readonly delivered: MassViews;
    readonly concentration: ConcentrationViews;
    /** This peptide's share of the vial's total content. */
    readonly shareOfVial: Measured<"%">;
}
export interface BlendTotals {
    /** Sum of every peptide: the vial's label total. */
    readonly vialTotal: MassViews;
    /** The whole blend in the drawn volume. */
    readonly drawnTotal: MassViews;
}
export interface BlendInput {
    readonly peptides: readonly BlendPeptide[];
    readonly waterMl: number;
    /** Units drawn, on the syringe's own scale. */
    readonly units: number;
    /** Default "U-100". */
    readonly syringe?: SyringeId;
}
export interface BlendResult extends BlendTotals {
    readonly volumeMl: Measured<"mL">;
    /** What each peptide in the vial delivers in this draw. */
    readonly peptides: readonly BlendPeptideResult[];
    readonly reading: SyringeReading;
    readonly warnings: readonly GlobalWarning[];
}
/**
 * How much of EACH peptide one draw of `units` delivers.
 *
 * @example
 * blend({ peptides: [{ name: "BPC-157", mg: 5 }, { name: "TB-500", mg: 5 }], waterMl: 2, units: 10 })
 * // 0.1 mL: BPC-157 250 mcg, TB-500 250 mcg
 */
export declare function blend(input: BlendInput): BlendResult;
export interface BlendDoseInput {
    readonly peptides: readonly BlendPeptide[];
    readonly waterMl: number;
    /**
     * The dose to hit. With `target`, the dose of that one peptide (the others
     * ride along). Without it, the dose of the whole blend ("2 mg of KLOW"),
     * the way most blend protocols are written.
     */
    readonly dose: number;
    readonly doseUnit: MassUnit;
    /** Name of the peptide `dose` refers to. Omit for a whole-blend dose. */
    readonly target?: string;
    /** Default "U-100". */
    readonly syringe?: SyringeId;
}
export interface BlendDoseResult extends BlendTotals {
    readonly volumeMl: Measured<"mL">;
    readonly units: Measured<"units">;
    readonly syringe: SyringeId;
    readonly reading: SyringeReading;
    readonly syringes: Readonly<Record<SyringeId, SyringeReading>>;
    /** Vial / dose (for the target peptide, or for the whole blend). */
    readonly dosesPerVial: Measured<"doses">;
    readonly fullDosesPerVial: number;
    readonly peptides: readonly BlendPeptideResult[];
    readonly warnings: readonly GlobalWarning[];
}
/**
 * Units to draw for a blend dose, plus what every peptide delivers.
 *
 * @example
 * blendDose({ peptides: KLOW, waterMl: 4, dose: 2, doseUnit: "mg" })
 * // 80 mg in 4 mL = 20 mg/mL; 2 mg = 0.1 mL = 10 units:
 * // GHK-Cu 1.25 mg, BPC-157 250 mcg, TB-500 250 mcg, KPV 250 mcg
 * @throws InputError `unknown_component` when `target` is not in the blend.
 */
export declare function blendDose(input: BlendDoseInput): BlendDoseResult;
