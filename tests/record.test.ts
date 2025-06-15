import { describe, expect, test } from "bun:test";
import { t } from "../src/Tsh";

describe("RecordShape", () => {
    test("basic record validation", () => {
        const schema = t.record(t.string(), t.number());
        const validRecord = { a: 1, b: 2 };
        const invalidRecord = { a: "one", b: 2 };

        expect(schema.parse(validRecord)).toEqual(validRecord);
        expect(() => schema.parse(invalidRecord)).toThrow();
        expect(() => schema.parse("not an object")).toThrow();
    });

    test("optional record", () => {
        const schema = t.record(t.string(), t.number()).optional();
        expect(schema.parse({ a: 1 })).toEqual({ a: 1 });
        expect(schema.parse(undefined)).toBeUndefined();
        expect(() => schema.parse(null)).toThrow();
    });

    test("nullable record", () => {
        const schema = t.record(t.string(), t.number()).nullable();
        expect(schema.parse({ a: 1 })).toEqual({ a: 1 });
        expect(schema.parse(null)).toBeNull();
        expect(() => schema.parse(undefined)).toThrow();
    });

    test("record with default", () => {
        const schema = t.record(t.string(), t.number()).default({ default: 0 });
        expect(schema.parse({ a: 1 })).toEqual({ a: 1 });
        expect(() => schema.parse(undefined)).toThrow('Value is required')
        expect(() => schema.parse(null)).toThrow();
    });

    test("minProperties", () => {
        const schema = t.record(t.string(), t.number()).minProperties(2);
        expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
        expect(() => schema.parse({ a: 1 })).toThrow();
    });

    test("maxProperties", () => {
        const schema = t.record(t.string(), t.number()).maxProperties(2);
        expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
        expect(() => schema.parse({ a: 1, b: 2, c: 3 })).toThrow();
    });

    test("exactProperties", () => {
        const schema = t.record(t.string(), t.number()).exactProperties(2);
        expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
        expect(() => schema.parse({ a: 1 })).toThrow();
        expect(() => schema.parse({ a: 1, b: 2, c: 3 })).toThrow();
    });

    test("hasProperty", () => {
        const schema = t.record(t.string(), t.number()).hasProperty("required");
        expect(schema.parse({ required: 1 })).toEqual({ required: 1 });
        expect(() => schema.parse({ other: 1 })).toThrow();
    });

    test("forbiddenProperty", () => {
        const schema = t.record(t.string(), t.number()).forbiddenProperty("secret");
        expect(schema.parse({ public: 1 })).toEqual({ public: 1 });
        expect(() => schema.parse({ secret: 1 })).toThrow();
    });

    test("propertyValue", () => {
        const schema = t.record(t.string(), t.number())
            .propertyValue("age", (val) => val >= 18);

        expect(schema.parse({ age: 20 })).toEqual({ age: 20 });
        expect(() => schema.parse({ age: 15 })).toThrow();
    });

    test("propertyShape", () => {
        const schema = t.record(t.string(), t.number())
            .propertyShape("age", t.number().min(18));

        expect(schema.parse({ age: 20 })).toEqual({ age: 20 });
        expect(() => schema.parse({ age: 15 })).toThrow();
    });

    test("nonEmpty", () => {
        const schema = t.record(t.string(), t.number()).nonEmpty();
        expect(schema.parse({ a: 1 })).toEqual({ a: 1 });
        expect(() => schema.parse({})).toThrow();
    });

    test("propertyNames", () => {
        const schema = t.record(t.string(), t.number())
            .propertyNames((key) => key.length <= 3);

        expect(schema.parse({ abc: 1 })).toEqual({ abc: 1 });
        expect(() => schema.parse({ longKey: 1 })).toThrow();
    });

    test("propertyValues", () => {
        const schema = t.record(t.string(), t.number())
            .propertyValues((val) => val > 0);

        expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
        expect(() => schema.parse({ a: 1, b: 0 })).toThrow();
    });

    test("exactPropertiesShape", () => {
        const schema = t.record(t.string(), t.any())
            .exactPropertiesShape({
                name: t.string(),
                age: t.number().min(18)
            });

        const valid = { name: "John", age: 30 };
        const invalid1 = { name: "John" };
        const invalid2 = { name: "John", age: 15 };
        const invalid3 = { name: "John", age: 30, extra: "field" };

        expect(schema.parse(valid)).toEqual(valid as any);
        expect(() => schema.parse(invalid1)).toThrow();
        expect(() => schema.parse(invalid2)).toThrow();
        expect(() => schema.parse(invalid3)).toThrow();
    });

    test("complex key types", () => {
        const schema = t.record(t.enum(["a", "b"] as const), t.number());
        expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
        expect(() => schema.parse({ c: 3 })).toThrow();
    });

    test("nested records", () => {
        const schema = t.record(
            t.string(),
            t.record(t.string(), t.number())
        );

        const valid = { user: { age: 30 } };
        const invalid = { user: { age: "thirty" } };

        expect(schema.parse(valid)).toEqual(valid);
        expect(() => schema.parse(invalid)).toThrow();
    });

    test("chained validations", () => {
        const schema = t.record(t.string(), t.number())
            .minProperties(1)
            .maxProperties(3)
            .hasProperty("required")
            .forbiddenProperty("secret");

        const valid1 = { required: 1 };
        const valid2 = { required: 1, a: 2, b: 3 };
        const invalid1 = {};
        const invalid2 = { required: 1, a: 2, b: 3, c: 4 };
        const invalid3 = { a: 1 };
        const invalid4 = { required: 1, secret: 0 };

        expect(schema.parse(valid1)).toEqual(valid1);
        expect(schema.parse(valid2)).toEqual(valid2);
        expect(() => schema.parse(invalid1)).toThrow();
        expect(() => schema.parse(invalid2)).toThrow();
        expect(() => schema.parse(invalid3)).toThrow();
        expect(() => schema.parse(invalid4)).toThrow();
    });
})
