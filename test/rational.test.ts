import { describe, expect, it } from "vitest";
import { Rational, formatMeasured, measure, roundRational } from "../src/index.js";

const r = (text: string) => Rational.fromDecimalString(text);

describe("Rational", () => {
  it("reads typed decimals exactly", () => {
    expect(Rational.fromNumber(0.1).toString()).toBe("1/10");
    expect(Rational.fromNumber(0.1).add(Rational.fromNumber(0.2)).eq(Rational.fromNumber(0.3))).toBe(true);
    expect(Rational.fromNumber(1e-7).toString()).toBe("1/10000000");
    expect(Rational.fromNumber(-0.25).toString()).toBe("-1/4");
  });

  it("normalises sign and gcd", () => {
    expect(Rational.of(2n, -4n).toString()).toBe("-1/2");
    expect(Rational.of(0n, -7n).toString()).toBe("0");
  });

  it("refuses division by zero and non-finite numbers", () => {
    expect(() => Rational.ONE.div(Rational.ZERO)).toThrow(RangeError);
    expect(() => Rational.fromNumber(Number.NaN)).toThrow(RangeError);
  });

  it("rounds half away from zero, once, on the exact value", () => {
    expect(r("2.25").toDecimalString(1)).toBe("2.3");
    expect(r("-2.25").toDecimalString(1)).toBe("-2.3");
    expect(r("2.24999").toDecimalString(1)).toBe("2.2");
    expect(Rational.of(100n, 3n).toDecimalString(1)).toBe("33.3");
    expect(roundRational(Rational.of(2n, 3n), 3).toString()).toBe("667/1000");
  });

  it("floor and ceil handle negatives", () => {
    expect(r("-1.5").floor()).toBe(-2n);
    expect(r("-1.5").ceil()).toBe(-1n);
    expect(r("1.5").floor()).toBe(1n);
  });
});

describe("measure and formatMeasured", () => {
  it("rounds per unit and trims zeros", () => {
    expect(measure(Rational.of(100n, 3n), "units").value).toBe(33.3);
    expect(formatMeasured(measure(r("250"), "mcg"))).toBe("250 mcg");
    expect(formatMeasured(measure(r("0.05"), "mL"))).toBe("0.05 mL");
    expect(formatMeasured(measure(r("2.5"), "%"))).toBe("2.5%");
  });
});
