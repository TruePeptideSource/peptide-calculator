/**
 * Exact rational arithmetic on BigInt.
 *
 * Why: dosing math chains divisions and multiplications (mg -> mcg -> mg/mL ->
 * mL -> syringe units). Doing that in IEEE doubles produces answers like
 * 4.999999999999999 units, and the rounding that follows can land on the wrong
 * side of a tick mark. Every user input is a short decimal, so each one is an
 * exact rational; keeping the whole chain rational means the only rounding is
 * the single, documented presentation step at the end (see rounding.ts).
 *
 * Values are always normalised: the denominator is positive and gcd(num, den)
 * is 1, so structural equality is numeric equality.
 */
export declare class Rational {
    readonly num: bigint;
    readonly den: bigint;
    private constructor();
    /** Builds a normalised rational. Throws RangeError on a zero denominator. */
    static of(num: bigint, den?: bigint): Rational;
    static readonly ZERO: Rational;
    static readonly ONE: Rational;
    static int(n: number | bigint): Rational;
    /**
     * The exact value of the decimal a person typed.
     *
     * JavaScript prints a double with the shortest digits that round-trip, so
     * `0.1` becomes "0.1" and is read here as exactly 1/10, not as the binary
     * double 0.1000000000000000055... That is the value the person meant.
     */
    static fromNumber(value: number): Rational;
    /** Parses "12", "-0.25", "1e-7", "2.5E+3". */
    static fromDecimalString(text: string): Rational;
    add(other: Rational): Rational;
    sub(other: Rational): Rational;
    mul(other: Rational): Rational;
    /** Throws RangeError when dividing by zero. */
    div(other: Rational): Rational;
    neg(): Rational;
    abs(): Rational;
    /** -1, 0 or 1. */
    sign(): -1 | 0 | 1;
    cmp(other: Rational): -1 | 0 | 1;
    eq(other: Rational): boolean;
    lt(other: Rational): boolean;
    lte(other: Rational): boolean;
    gt(other: Rational): boolean;
    gte(other: Rational): boolean;
    isZero(): boolean;
    isInteger(): boolean;
    /** Largest integer <= this. */
    floor(): bigint;
    /** Smallest integer >= this. */
    ceil(): bigint;
    static min(a: Rational, b: Rational): Rational;
    static max(a: Rational, b: Rational): Rational;
    /**
     * Nearest double. Exact for every value this package produces from bounded
     * inputs; never use the result to continue a calculation.
     */
    toNumber(): number;
    /**
     * Fixed-point decimal text rounded to `decimals` places. Exact: the rounding
     * decision is made on the rational, never on a float.
     */
    toDecimalString(decimals: number, mode?: RoundingMode): string;
    /** "num/den", or "num" for integers. Stable and lossless. */
    toString(): string;
    /** JSON.stringify would throw on BigInt fields; serialise as "num/den". */
    toJSON(): string;
}
/**
 * - `half-up`: halves round away from zero (2.25 -> 2.3, -2.25 -> -2.3). The
 *   presentation default: it is what people expect from a calculator.
 * - `floor` / `ceil`: toward negative / positive infinity.
 * - `trunc`: toward zero.
 */
export type RoundingMode = "half-up" | "floor" | "ceil" | "trunc";
/** Rounds a rational to `decimals` places and returns it as a rational. */
export declare function roundRational(value: Rational, decimals: number, mode?: RoundingMode): Rational;
