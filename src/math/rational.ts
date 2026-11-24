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

const DECIMAL_PATTERN = /^(-)?(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i;

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

export class Rational {
  readonly num: bigint;
  readonly den: bigint;

  private constructor(num: bigint, den: bigint) {
    this.num = num;
    this.den = den;
  }

  /** Builds a normalised rational. Throws RangeError on a zero denominator. */
  static of(num: bigint, den: bigint = 1n): Rational {
    if (den === 0n) throw new RangeError("Rational denominator must not be zero");
    if (num === 0n) return new Rational(0n, 1n);
    const sign = den < 0n ? -1n : 1n;
    const g = gcd(num, den);
    return new Rational((sign * num) / g, (sign * den) / g);
  }

  static readonly ZERO = Rational.of(0n);
  static readonly ONE = Rational.of(1n);

  static int(n: number | bigint): Rational {
    if (typeof n === "number" && !Number.isSafeInteger(n)) {
      throw new RangeError(`Rational.int expects a safe integer, got ${n}`);
    }
    return Rational.of(BigInt(n));
  }

  /**
   * The exact value of the decimal a person typed.
   *
   * JavaScript prints a double with the shortest digits that round-trip, so
   * `0.1` becomes "0.1" and is read here as exactly 1/10, not as the binary
   * double 0.1000000000000000055... That is the value the person meant.
   */
  static fromNumber(value: number): Rational {
    if (!Number.isFinite(value)) {
      throw new RangeError(`Rational.fromNumber expects a finite number, got ${value}`);
    }
    return Rational.fromDecimalString(String(value));
  }

  /** Parses "12", "-0.25", "1e-7", "2.5E+3". */
  static fromDecimalString(text: string): Rational {
    const match = DECIMAL_PATTERN.exec(text.trim());
    if (!match) throw new RangeError(`Not a decimal number: "${text}"`);
    const [, minus, whole = "0", fraction = "", exponentText] = match;
    const exponent = exponentText === undefined ? 0 : Number.parseInt(exponentText, 10);
    let num = BigInt(whole + fraction);
    let den = 10n ** BigInt(fraction.length);
    if (exponent > 0) num *= 10n ** BigInt(exponent);
    if (exponent < 0) den *= 10n ** BigInt(-exponent);
    return Rational.of(minus ? -num : num, den);
  }

  add(other: Rational): Rational {
    return Rational.of(this.num * other.den + other.num * this.den, this.den * other.den);
  }

  sub(other: Rational): Rational {
    return Rational.of(this.num * other.den - other.num * this.den, this.den * other.den);
  }

  mul(other: Rational): Rational {
    return Rational.of(this.num * other.num, this.den * other.den);
  }

  /** Throws RangeError when dividing by zero. */
  div(other: Rational): Rational {
    if (other.num === 0n) throw new RangeError("Rational division by zero");
    return Rational.of(this.num * other.den, this.den * other.num);
  }

  neg(): Rational {
    return Rational.of(-this.num, this.den);
  }

  abs(): Rational {
    return this.num < 0n ? this.neg() : this;
  }

  /** -1, 0 or 1. */
  sign(): -1 | 0 | 1 {
    if (this.num === 0n) return 0;
    return this.num < 0n ? -1 : 1;
  }

  cmp(other: Rational): -1 | 0 | 1 {
    const left = this.num * other.den;
    const right = other.num * this.den;
    if (left === right) return 0;
    return left < right ? -1 : 1;
  }

  eq(other: Rational): boolean {
    return this.num === other.num && this.den === other.den;
  }
  lt(other: Rational): boolean {
    return this.cmp(other) < 0;
  }
  lte(other: Rational): boolean {
    return this.cmp(other) <= 0;
  }
  gt(other: Rational): boolean {
    return this.cmp(other) > 0;
  }
  gte(other: Rational): boolean {
    return this.cmp(other) >= 0;
  }

  isZero(): boolean {
    return this.num === 0n;
  }

  isInteger(): boolean {
    return this.den === 1n;
  }

  /** Largest integer <= this. */
  floor(): bigint {
    const q = this.num / this.den;
    return this.num < 0n && q * this.den !== this.num ? q - 1n : q;
  }

  /** Smallest integer >= this. */
  ceil(): bigint {
    const q = this.num / this.den;
    return this.num > 0n && q * this.den !== this.num ? q + 1n : q;
  }

  static min(a: Rational, b: Rational): Rational {
    return a.lte(b) ? a : b;
  }

  static max(a: Rational, b: Rational): Rational {
    return a.gte(b) ? a : b;
  }

  /**
   * Nearest double. Exact for every value this package produces from bounded
   * inputs; never use the result to continue a calculation.
   */
  toNumber(): number {
    const limit = 2n ** 53n;
    const absNum = this.num < 0n ? -this.num : this.num;
    if (absNum <= limit && this.den <= limit) return Number(this.num) / Number(this.den);
    if (absNum === 0n) return 0;
    // Large terms: take ~25 significant digits of the quotient in BigInt and
    // let Number() parse them in scientific notation, so neither huge nor
    // tiny magnitudes lose precision converting each BigInt separately.
    const shift = 25 - (absNum.toString().length - this.den.toString().length);
    const scaledNum = shift >= 0 ? absNum * 10n ** BigInt(shift) : absNum;
    const scaledDen = shift >= 0 ? this.den : this.den * 10n ** BigInt(-shift);
    const digits = (scaledNum / scaledDen).toString();
    return Number(`${this.num < 0n ? "-" : ""}${digits}e${-shift}`);
  }

  /**
   * Fixed-point decimal text rounded to `decimals` places. Exact: the rounding
   * decision is made on the rational, never on a float.
   */
  toDecimalString(decimals: number, mode: RoundingMode = "half-up"): string {
    if (!Number.isInteger(decimals) || decimals < 0) {
      throw new RangeError(`decimals must be a non-negative integer, got ${decimals}`);
    }
    const scale = 10n ** BigInt(decimals);
    const scaled = roundScaled(this.mul(Rational.of(scale)), mode);
    const negative = scaled < 0n;
    const digits = (negative ? -scaled : scaled).toString().padStart(decimals + 1, "0");
    const whole = digits.slice(0, digits.length - decimals);
    const fraction = decimals > 0 ? `.${digits.slice(digits.length - decimals)}` : "";
    return `${negative ? "-" : ""}${whole}${fraction}`;
  }

  /** "num/den", or "num" for integers. Stable and lossless. */
  toString(): string {
    return this.den === 1n ? this.num.toString() : `${this.num}/${this.den}`;
  }

  /** JSON.stringify would throw on BigInt fields; serialise as "num/den". */
  toJSON(): string {
    return this.toString();
  }
}

/**
 * - `half-up`: halves round away from zero (2.25 -> 2.3, -2.25 -> -2.3). The
 *   presentation default: it is what people expect from a calculator.
 * - `floor` / `ceil`: toward negative / positive infinity.
 * - `trunc`: toward zero.
 */
export type RoundingMode = "half-up" | "floor" | "ceil" | "trunc";

function roundScaled(value: Rational, mode: RoundingMode): bigint {
  switch (mode) {
    case "floor":
      return value.floor();
    case "ceil":
      return value.ceil();
    case "trunc":
      return value.sign() < 0 ? value.ceil() : value.floor();
    case "half-up": {
      const magnitude = value.abs();
      const whole = magnitude.floor();
      const remainder = magnitude.sub(Rational.of(whole));
      const rounded = remainder.mul(Rational.of(2n)).gte(Rational.ONE) ? whole + 1n : whole;
      return value.sign() < 0 ? -rounded : rounded;
    }
  }
}

/** Rounds a rational to `decimals` places and returns it as a rational. */
export function roundRational(value: Rational, decimals: number, mode: RoundingMode = "half-up"): Rational {
  return Rational.fromDecimalString(value.toDecimalString(decimals, mode));
}
