import { describe, expect, test } from "bun:test";
import { t } from "../src/Tsh";

describe("ObjectShape", () => {
  test("basic object validation", () => {
    const schema = t.object({
      name: t.string(),
      age: t.number()
    });

    const valid = { name: "John", age: 30 };
    const invalid1 = { name: "John" }; // missing age
    const invalid2 = { name: "John", age: "30" }; // wrong type
    const invalid3 = "not an object";

    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse(invalid1)).toThrow('Missing required value for "age"');
    expect(() => schema.parse(invalid2)).toThrow('Expected a number');
    expect(() => schema.parse(invalid3)).toThrow('Expected object');
  });

  test("optional object", () => {
    const schema = t.object({
      name: t.string()
    }).optional();

    expect(schema.parse({ name: "John" })).toEqual({ name: "John" });
    expect(schema.parse(undefined)).toBeUndefined();
    expect(() => schema.parse(null)).toThrow('Value cannot be null');
  });

  test("nullable object", () => {
    const schema = t.object({
      name: t.string()
    }).nullable();

    expect(schema.parse({ name: "John" })).toEqual({ name: "John" });
    console.log(schema.parse(null));
    expect(schema.parse(null)).toBeNull();
    expect(() => schema.parse(undefined)).toThrow('expected a object');
  });

  test("object with default", () => {
    const schema = t.object({
      name: t.string()
    }).default({ name: "Default" });

    expect(schema.parse({ name: "John" })).toEqual({ name: "John" });
    expect(() => schema.parse(undefined)).toThrow('expected a object');
    expect(() => schema.parse(null)).toThrow();
  });

  test("nested objects", () => {
    const schema = t.object({
      user: t.object({
        name: t.string(),
        age: t.number()
      })
    });

    const valid = { user: { name: "John", age: 30 } };
    const invalid = { user: { name: "John", age: "30" } };

    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse(invalid)).toThrow('Expected a number');
  });

  test("object with arrays", () => {
    const schema = t.object({
      tags: t.array(t.string())
    });

    const valid = { tags: ["a", "b"] };
    const invalid = { tags: "not an array" };

    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse(invalid)).toThrow('Expected a array');
  });

  test("partial object", () => {
    const schema = t.object({
      name: t.string(),
      age: t.number()
    }).partial();

    const valid1 = { name: "John", age: 30 };
    const valid2 = { name: "John" };
    const valid3 = { age: 30 };
    const valid4 = {};

    expect(schema.parse(valid1)).toEqual(valid1);
    expect(schema.parse(valid2)).toEqual(valid2 as never);
    expect(schema.parse(valid3)).toEqual(valid3 as never);
    expect(schema.parse(valid4)).toEqual(valid4 as never);

    // Should still validate types for provided properties
    expect(() => schema.parse({ name: 123 })).toThrow('Expected a string');
  });

  test("merge objects", () => {
    const schema1 = t.object({ name: t.string() });
    const schema2 = t.object({ age: t.number() });
    const merged = schema1.merge(schema2);

    const valid = { name: "John", age: 30 };
    const invalid = { name: "John" }; // missing age

    expect(merged.parse(valid)).toEqual(valid);
    expect(() => merged.parse(invalid)).toThrow('Missing required value for "age"');
  });

  test("pick properties", () => {
    const schema = t.object({
      name: t.string(),
      age: t.number(),
      email: t.string().email()
    }).pick(["name", "age"]);

    const valid = { name: "John", age: 30 };
    const invalid1 = { name: "John" }; // missing age
    const valid2 = { name: "John", age: 30, email: "john@example.com" }; // extra property

    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse(invalid1)).toThrow('Missing required value for "age"');
    expect(schema.parse(valid2)).toEqual(valid2); // Extra properties should be stripped
  });

  test("omit properties", () => {
    const schema = t.object({
      name: t.string(),
      age: t.number(),
      email: t.string().email()
    }).omit(["email"]);

    const valid = { name: "John", age: 30 };
    const invalid1 = { name: "John" }; // missing age
    const valid2 = { name: "John", age: 30, email: "john@example.com" }; // extra property

    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse(invalid1)).toThrow('Missing required value for "age"');
    expect(schema.parse(valid2)).toEqual(valid2); // Extra properties should be stripped
  });

  test("hasProperty", () => {
    const schema = t.object({
      name: t.string()
    }).hasProperty("name");

    expect(schema.parse({ name: "John" })).toEqual({ name: "John" });
    expect(() => schema.parse({})).toThrow('Missing required value for "name"');
  });

  test("forbiddenProperty", () => {
    const schema = t.object({
      name: t.string()
    }).forbiddenProperty("secret" as never);

    expect(schema.parse({ name: "John" })).toEqual({ name: "John" });
    expect(() => schema.parse({ name: "John", secret: "data" })).toThrow('Object must not have property "secret"');
  });

  test("exactProperties", () => {
    const schema = t.object({
      name: t.string(),
      age: t.number()
    }).exactProperties(2);

    const valid = { name: "John", age: 30 };
    const invalid1 = { name: "John" };
    const invalid2 = { name: "John", age: 30, extra: "field" };

    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse(invalid1)).toThrow('Missing required value for \"age\"');
    expect(() => schema.parse(invalid2)).toThrow('Object must have exactly 2 properties');
  });

  test("minProperties", () => {
    const schema = t.object({
      name: t.string(),
      age: t.number()
    }).minProperties(1);

    const valid1 = { name: "John" };
    const valid2 = { name: "John", age: 30 };
    const invalid = {};

    expect(schema.parse(valid1)).toEqual(valid1 as never);
    expect(schema.parse(valid2)).toEqual(valid2);
    expect(() => schema.parse(invalid)).toThrow('Object must have at least 1 properties');
  });

  test("maxProperties", () => {
    const schema = t.object({
      name: t.string(),
      age: t.number(),
      extra: t.string().optional(),
    }).minProperties(1).maxProperties(2);

    const valid1 = { name: "John" };
    const valid2 = { name: "John", age: 30 };
    const invalid = { name: "John", age: 30, extra: "field" };
    expect(schema.parse(valid1)).toEqual(valid1 as never);
    expect(schema.parse(valid2)).toEqual(valid2 as never);
    expect(() => schema.parse(invalid)).toThrow('Object must have at most 2 properties');
  });

  test("propertyValue", () => {
    const schema = t.object({
      age: t.number()
    }).propertyValue("age", (age) => age >= 18);

    const valid = { age: 20 };
    const invalid = { age: 15 };

    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse(invalid)).toThrow('Property "age" is invalid');
  });

  test("nonEmpty", () => {
    const schema = t.object({
      name: t.string()
    }).nonEmpty();

    const valid = { name: "John" };
    const invalid = {};

    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse(invalid)).toThrow('Object must have at least 1 properties');
  });

  test("complex nested structure", () => {
    const schema = t.object({
      id: t.string().uuid(),
      user: t.object({
        name: t.string(),
        age: t.number().min(18),
        contacts: t.array(t.object({
          type: t.enum(["email", "phone"]),
          value: t.string()
        }))
      }),
      metadata: t.object({}).partial()
    });

    const valid = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      user: {
        name: "John",
        age: 30,
        contacts: [
          { type: "email", value: "john@example.com" },
          { type: "phone", value: "123456789" }
        ]
      },
      metadata: {}
    };

    const invalid = {
      id: "invalid-uuid",
      user: {
        name: "John",
        age: 15,
        contacts: [
          { type: "invalid", value: "john@example.com" }
        ]
      },
      metadata: "not an object"
    };

    expect(schema.parse(valid)).toEqual(valid as never);
    expect(() => schema.parse(invalid)).toThrow();
  });

  test("partial with nested objects", () => {
    const schema = t.object({
      user: t.object({
        name: t.string(),
        age: t.number()
      }),
      valor:t.string()
    }).partial();

    const valid1 = { user: { name: "John", age: 30 } };
    const valid2 = { user: { name: "John", age: 30 } };
    const valid3 = { user: {} };
    const valid4 = {};
    expect(schema.parse(valid1)).toEqual(valid1 as never);
    expect(schema.parse(valid2)).toEqual(valid2 as never);
    expect(() => schema.parse(valid3)).toThrow();
    expect(schema.parse(valid4)).toEqual(valid4 as never);
  });

  test("deepPartial with nested objects", () => {
    const schema = t.object({
      user: t.object({
        name: t.string(),
        age: t.number()
      })
    }).deepPartial();

    const valid1 = { user: { name: "John", age: 30 } };
    const valid2 = { user: { name: "John" } };
    const valid3 = { user: {} };
    const valid4 = {};
    expect(schema.parse(valid1)).toEqual(valid1);
    expect(schema.parse(valid2)).toEqual(valid2);
    expect(schema.parse(valid3)).toEqual(valid3);
    expect(schema.parse(valid4)).toEqual(valid4);
  });

  test("default with partial", () => {
    const schema = t.object({
      name: t.string(),
      age: t.number()
    })
      .partial()
      .default({ name: "Default" });
      console.log(schema._default);
    expect(() => schema.parse(undefined)).toThrow('Missing required value for "object"');
    expect(schema.parse({})).toEqual({ name: "Default" });
    expect(schema.parse({ age: 30 })).toEqual({ name: "Default", age: 30 });
  });
});