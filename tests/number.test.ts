import { describe, expect, test } from "bun:test";
import { t } from "../src/Tsh";

describe("NumberShape", () => {
  test("basic number validation", () => {
    const schema = t.number();
    expect(schema.parse(42)).toBe(42);
    expect(() => schema.parse("42")).toThrow();
    expect(() => schema.parse(null)).toThrow();
    expect(() => schema.parse(undefined)).toThrow();
  });

  test("optional number", () => {
    const schema = t.number().optional();
    expect(schema.parse(42)).toBe(42);
    expect(schema.parse(undefined)).toBeUndefined();
    expect(() => schema.parse(null)).toThrow();
  });

  test("nullable number", () => {
    const schema = t.number().nullable();
    expect(schema.parse(42)).toBe(42);
    expect(schema.parse(null)).toBeNull();
    expect(() => schema.parse(undefined)).toThrow();
  });

  test("number with default", () => {
    const schema = t.number().default(42);
    expect(schema.parse(10)).toBe(10);
    expect(() => schema.parse(undefined)).toThrow('Expected a number')
    expect(() => schema.parse(null)).toThrow();
  });

  test("coercion", () => {
    const schema = t.number().coerce();
    expect(schema.parse("42")).toBe(42);
    expect(schema.parse(true)).toBe(1);
    expect(schema.parse(false)).toBe(0);
    expect(schema.parse(null)).toBe(0);
    expect(schema.parse(undefined)).toBe(0);
    expect(schema.parse("not a number")).toBe(0);
  });

  test("min value", () => {
    const schema = t.number().min(10);
    expect(schema.parse(10)).toBe(10);
    expect(schema.parse(11)).toBe(11);
    expect(() => schema.parse(9)).toThrow();
  });

  test("max value", () => {
    const schema = t.number().max(10);
    expect(schema.parse(10)).toBe(10);
    expect(schema.parse(9)).toBe(9);
    expect(() => schema.parse(11)).toThrow();
  });

  test("range", () => {
    const schema = t.number().range(10, 20);
    expect(schema.parse(10)).toBe(10);
    expect(schema.parse(15)).toBe(15);
    expect(schema.parse(20)).toBe(20);
    expect(() => schema.parse(9)).toThrow();
    expect(() => schema.parse(21)).toThrow();
  });

  test("integer", () => {
    const schema = t.number().int();
    expect(schema.parse(42)).toBe(42);
    expect(() => schema.parse(42.5)).toThrow();
  });

  test("positive", () => {
    const schema = t.number().positive();
    expect(schema.parse(1)).toBe(1);
    expect(() => schema.parse(0)).toThrow();
    expect(() => schema.parse(-1)).toThrow();
  });

  test("nonNegative", () => {
    const schema = t.number().nonNegative();
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(1)).toBe(1);
    expect(() => schema.parse(-1)).toThrow();
  });

  test("negative", () => {
    const schema = t.number().negative();
    expect(schema.parse(-1)).toBe(-1);
    expect(() => schema.parse(0)).toThrow();
    expect(() => schema.parse(1)).toThrow();
  });

  test("nonPositive", () => {
    const schema = t.number().nonPositive();
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(-1)).toBe(-1);
    expect(() => schema.parse(1)).toThrow();
  });

  test("finite", () => {
    const schema = t.number().finite();
    expect(schema.parse(42)).toBe(42);
    expect(() => schema.parse(Infinity)).toThrow();
    expect(() => schema.parse(-Infinity)).toThrow();
    expect(() => schema.parse(NaN)).toThrow();
  });

  test("safe integer", () => {
    const schema = t.number().safe();
    expect(schema.parse(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
    expect(schema.parse(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER);
    expect(() => schema.parse(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(() => schema.parse(Number.MIN_SAFE_INTEGER - 1)).toThrow();
  });

  test("multipleOf", () => {
    const schema = t.number().multipleOf(5);
    expect(schema.parse(10)).toBe(10);
    expect(schema.parse(15)).toBe(15);
    expect(() => schema.parse(11)).toThrow();
  });

  test("decimal places", () => {
    const schema = t.number().decimal(2);
    expect(schema.parse(1.23)).toBe(1.23);
    expect(schema.parse(1)).toBe(1);
    expect(() => schema.parse(1.234)).toThrow();
  });

  test("exact decimal places", () => {
    const schema = t.number().exactDecimal(2);
    expect(schema.parse(1.23)).toBe(1.23);
    expect(() => schema.parse(1)).toThrow();
    expect(() => schema.parse(1.2)).toThrow();
    expect(() => schema.parse(1.234)).toThrow();
  });

  test("precision", () => {
    const schema = t.number().precision(4);
    expect(schema.parse(1234)).toBe(1234);
    expect(schema.parse(1.234)).toBe(1.234);
    expect(() => schema.parse(12345)).toThrow();
    expect(() => schema.parse(1.2345)).toThrow();
  });

  test("equals", () => {
    const schema = t.number().equals(42);
    expect(schema.parse(42)).toBe(42);
    expect(() => schema.parse(41)).toThrow();
    expect(() => schema.parse(43)).toThrow();
  });

  test("notEquals", () => {
    const schema = t.number().notEquals(42);
    expect(schema.parse(41)).toBe(41);
    expect(schema.parse(43)).toBe(43);
    expect(() => schema.parse(42)).toThrow();
  });

  test("oneOf", () => {
    const schema = t.number().oneOf([1, 2, 3]);
    expect(schema.parse(1)).toBe(1);
    expect(schema.parse(2)).toBe(2);
    expect(schema.parse(3)).toBe(3);
    expect(() => schema.parse(4)).toThrow();
  });

  test("notOneOf", () => {
    const schema = t.number().notOneOf([1, 2, 3]);
    expect(schema.parse(4)).toBe(4);
    expect(schema.parse(5)).toBe(5);
    expect(() => schema.parse(1)).toThrow();
    expect(() => schema.parse(2)).toThrow();
    expect(() => schema.parse(3)).toThrow();
  });

  test("port number", () => {
    const schema = t.number().port();
    expect(schema.parse(1)).toBe(1);
    expect(schema.parse(8080)).toBe(8080);
    expect(schema.parse(65535)).toBe(65535);
    expect(() => schema.parse(-1)).toThrow();
    expect(() => schema.parse(65536)).toThrow();
    expect(() => schema.parse(80.5)).toThrow();
  });

  test("latitude", () => {
    const schema = t.number().latitude();
    expect(schema.parse(-90)).toBe(-90);
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(90)).toBe(90);
    expect(() => schema.parse(-91)).toThrow();
    expect(() => schema.parse(91)).toThrow();
  });

  test("longitude", () => {
    const schema = t.number().longitude();
    expect(schema.parse(-180)).toBe(-180);
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(180)).toBe(180);
    expect(() => schema.parse(-181)).toThrow();
    expect(() => schema.parse(181)).toThrow();
  });

  test("percentage", () => {
    const schema = t.number().percentage();
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(50)).toBe(50);
    expect(schema.parse(100)).toBe(100);
    expect(() => schema.parse(-1)).toThrow();
    expect(() => schema.parse(101)).toThrow();
  });

  test("probability", () => {
    const schema = t.number().probability();
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(0.5)).toBe(0.5);
    expect(schema.parse(1)).toBe(1);
    expect(() => schema.parse(-0.1)).toThrow();
    expect(() => schema.parse(1.1)).toThrow();
  });

  test("byte", () => {
    const schema = t.number().byte();
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(128)).toBe(128);
    expect(schema.parse(255)).toBe(255);
    expect(() => schema.parse(-1)).toThrow();
    expect(() => schema.parse(256)).toThrow();
    expect(() => schema.parse(1.5)).toThrow();
  });

  test("natural number", () => {
    const schema = t.number().natural();
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(1)).toBe(1);
    expect(() => schema.parse(-1)).toThrow();
    expect(() => schema.parse(1.5)).toThrow();
  });

  test("whole number", () => {
    const schema = t.number().whole();
    expect(schema.parse(1)).toBe(1);
    expect(schema.parse(2)).toBe(2);
    expect(() => schema.parse(0)).toThrow();
    expect(() => schema.parse(-1)).toThrow();
    expect(() => schema.parse(1.5)).toThrow();
  });

  test("chained validations", () => {
    const schema = t.number()
      .int()
      .positive()
      .max(100)
      .multipleOf(5);
    
    expect(schema.parse(5)).toBe(5);
    expect(schema.parse(100)).toBe(100);
    expect(() => schema.parse(3)).toThrow(); // not multiple of 5
    expect(() => schema.parse(101)).toThrow(); // exceeds max
    expect(() => schema.parse(-5)).toThrow(); // not positive
    expect(() => schema.parse(5.5)).toThrow(); // not integer
  });
});