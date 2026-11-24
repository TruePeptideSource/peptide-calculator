/** One peptide in a blend preset. */
export interface PresetComponent {
    readonly name: string;
    readonly mg: number;
}
/**
 * A calculator preset, filled the way truepeptidesource.com fills its own
 * calculators. `startingDose` is what the site's default protocol starts at,
 * labelled by where that number comes from: it describes what studies and
 * communities report, not a recommendation.
 */
export interface Preset {
    readonly slug: string;
    readonly name: string;
    readonly isBlend: boolean;
    /** Vial size the calculator starts on (label total for blends). */
    readonly vialMg: number | null;
    /** Vial sizes the site lists, in mg. */
    readonly vialSizesMg: readonly number[];
    readonly waterMl: number | null;
    /** Blend contents; empty for single peptides. */
    readonly components: readonly PresetComponent[];
    readonly startingDose: {
        readonly value: number;
        readonly unit: "mg" | "mcg";
        /** "Clinical study", "FDA / regulator", "Protocol sites" or "Community reported". */
        readonly origin: string;
        readonly goal: string;
    } | null;
    /** The peptide's page, with every dose and its sources. */
    readonly page: string;
}
export declare const PRESETS_SOURCE: {
    readonly url: "https://truepeptidesource.com/calculators/presets";
    readonly synced: "2026-11-24";
};
export declare const PRESETS: Readonly<Record<string, Preset>>;
/** Alternate data-peptide spellings. */
export declare const PRESET_ALIASES: Readonly<Record<string, string>>;
