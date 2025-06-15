import { describe, expect, test } from "bun:test";
import { t } from "../src/Tsh";

describe("ArrayShape", () => {
  test("basic array validation", () => {
    const schema = t.array(t.string());
    expect(schema.parse(["a", "b"])).toEqual(["a", "b"]);
    expect(() => schema.parse("not an array")).toThrow();
    expect(() => schema.parse([1, 2])).toThrow();
    expect(() => schema.parse(null)).toThrow();
    expect(() => schema.parse(undefined)).toThrow();
  });

  test("optional array", () => {
    const schema = t.array(t.string()).optional();
    expect(schema.parse(["a"])).toEqual(["a"]);
    expect(schema.parse(undefined)).toBeUndefined();
    expect(() => schema.parse(null)).toThrow();
  });

  test("nullable array", () => {
    const schema = t.array(t.string()).nullable();
    expect(schema.parse(["a"])).toEqual(["a"]);
    expect(schema.parse(null)).toBeNull();
    expect(() => schema.parse(undefined)).toThrow();
  });

  test("array with default", () => {
    const schema = t.array(t.string()).default(["default"]);
    expect(schema.parse(["a"])).toEqual(["a"]);
    expect(() => schema.parse(undefined)).toThrow('Missing required value for array');
    expect(() => schema.parse(null)).toThrow();
  });

  test("min length", () => {
    const schema = t.array(t.string()).min(2);
    expect(schema.parse(["a", "b"])).toEqual(["a", "b"]);
    expect(schema.parse(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(() => schema.parse(["a"])).toThrow();
  });

  test("max length", () => {
    const schema = t.array(t.string()).max(2);
    expect(schema.parse(["a"])).toEqual(["a"]);
    expect(schema.parse(["a", "b"])).toEqual(["a", "b"]);
    expect(() => schema.parse(["a", "b", "c"])).toThrow();
  });

  test("exact length", () => {
    const schema = t.array(t.string()).length(2);
    expect(schema.parse(["a", "b"])).toEqual(["a", "b"]);
    expect(() => schema.parse(["a"])).toThrow();
    expect(() => schema.parse(["a", "b", "c"])).toThrow();
  });

  test("nonEmpty", () => {
    const schema = t.array(t.string()).nonEmpty();
    expect(schema.parse(["a"])).toEqual(["a"]);
    expect(() => schema.parse([])).toThrow();
  });

  test("unique", () => {
    const schema = t.array(t.string()).unique();
    expect(schema.parse(["a", "b"])).toEqual(["a", "b"]);
    expect(() => schema.parse(["a", "a"])).toThrow();
  });

  test("includes", () => {
    const schema = t.array(t.string()).includes("a");
    expect(schema.parse(["a", "b"])).toEqual(["a", "b"]);
    expect(() => schema.parse(["b", "c"])).toThrow();
  });

  test("excludes", () => {
    const schema = t.array(t.string()).excludes("a");
    expect(schema.parse(["b", "c"])).toEqual(["b", "c"]);
    expect(() => schema.parse(["a", "b"])).toThrow();
  });

  test("nested arrays", () => {
    const schema = t.array(t.array(t.number()));
    expect(schema.parse([[1], [2, 3]])).toEqual([[1], [2, 3]]);
    expect(() => schema.parse([[1], ["2"]])).toThrow();
  });

  test("complex array elements", () => {
    const schema = t.array(
      t.object({
        id: t.string().uuid(),
        active: t.boolean()
      })
    );
    
    const valid = [{
      id: "123e4567-e89b-12d3-a456-426614174000",
      active: true
    }];
    
    const invalid = [{
      id: "invalid",
      active: "not boolean"
    }];

    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse(invalid)).toThrow();
  });

  test("chained validations", () => {
    const schema = t.array(t.number())
      .min(1)
      .max(3)
      .unique()
      .nonEmpty();
    
    expect(schema.parse([1, 2])).toEqual([1, 2]);
    expect(() => schema.parse([])).toThrow(); // empty
    expect(() => schema.parse([1, 1])).toThrow(); // not unique
    expect(() => schema.parse([1, 2, 3, 4])).toThrow(); // too long
  });

  test("error messages include paths", () => {
    const schema = t.array(
      t.object({
        name: t.string(),
        age: t.number()
      })
    );

    try {
      schema.parse([{ name: "John", age: "30" }]);
    } catch (error) {
      console.log(error.errors);
      expect(error.errors[0].error).toContain("Expected a number");
      expect(error.key).toBe("age");
    }
  });


  test("empty array validation", () => {
    const schema = t.array(t.any());
    expect(schema.parse([])).toEqual([]);
  });

  test("array with mixed types", () => {
    const schema = t.array(t.union([t.string(), t.number()]));
    expect(schema.parse(["a", 1])).toEqual(["a", 1] as never);
    expect(() => schema.parse(["a", true])).toThrow();
  });
});