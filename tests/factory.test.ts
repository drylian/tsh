import { describe, expect, test } from "bun:test";
import { t, StringShape, NumberShape, BooleanShape, ObjectShape, ArrayShape, RecordShape, EnumShape, AnyShape, UnionShape } from "../src/Tsh";


describe("Shape Factory", () => {
    // =====================
    // BASIC TYPE SHAPES
    // =====================
    describe("Basic Types", () => {
        test("string() creates StringShape", () => {
            const shape = t.string();
            expect(shape).toBeInstanceOf(StringShape);
        });

        test("number() creates NumberShape", () => {
            const shape = t.number();
            expect(shape).toBeInstanceOf(NumberShape);
        });

        test("boolean() creates BooleanShape", () => {
            const shape = t.boolean();
            expect(shape).toBeInstanceOf(BooleanShape);
        });

        test("any() creates AnyShape", () => {
            const shape = t.any();
            expect(shape).toBeInstanceOf(AnyShape);
        });
    });

    // =====================
    // COMPLEX TYPE SHAPES
    // =====================
    describe("Complex Types", () => {
        test("object() creates ObjectShape", () => {
            const shape = t.object({ name: t.string() });
            expect(shape).toBeInstanceOf(ObjectShape);
        });

        test("array() creates ArrayShape", () => {
            const shape = t.array(t.string());
            expect(shape).toBeInstanceOf(ArrayShape);
        });

        test("record() creates RecordShape", () => {
            const shape = t.record(t.string(), t.number());
            expect(shape).toBeInstanceOf(RecordShape);
        });

        test("enum() creates EnumShape from array", () => {
            const shape = t.enum(["a", "b", "c"]);
            expect(shape).toBeInstanceOf(EnumShape);
        });

        test("enum() creates EnumShape from object", () => {
            const shape = t.enum({ A: "a", B: "b", C: "c" });
            expect(shape).toBeInstanceOf(EnumShape);
        });

        test("union() creates UnionShape", () => {
            const shape = t.union([t.string(), t.number()]);
            expect(shape).toBeInstanceOf(UnionShape);
        });

        test("unionOf() creates UnionShape", () => {
            const shape = t.unionOf(t.string(), t.number());
            expect(shape).toBeInstanceOf(UnionShape);
        });
    });

    // =====================
    // TYPE MODIFIERS
    // =====================
    describe("Type Modifiers", () => {
        test("optional() makes shape optional", () => {
            const shape = t.string().optional();
            expect(t.validate(undefined, shape).success).toBe(true);
        });

        test("nullable() makes shape nullable", () => {
            const shape = t.string().nullable();
            expect(t.validate(null, shape).success).toBe(true);
        });

        test("partial() makes object partial", () => {
            const shape = t.object({ name: t.string() }).partial();
            expect(t.validate({}, shape).success).toBe(true);
        });
    });

    // =====================
    // COERCION
    // =====================
    describe("Coercion", () => {
        test("coerce.string() coerces to string", () => {
            const shape = t.coerce.string();
            expect(t.validate(123, shape).data).toBe("123");
        });

        test("coerce.number() coerces to number", () => {
            const shape = t.coerce.number();
            expect(t.validate("123", shape).data).toBe(123);
        });

        test("coerce.boolean() coerces to boolean", () => {
            const shape = t.coerce.boolean();
            expect(t.validate("true", shape).data).toBe(true);
        });
    });

    // =====================
    // VALIDATION UTILITIES
    // =====================
    describe("Validation Utilities", () => {
        test("validate() returns success with valid data", () => {
            const result = t.validate("test", t.string());
            expect(result.success).toBe(true);
            expect(result.data).toBe("test");
        });

        test("validate() returns failure with invalid data", () => {
            const result = t.validate(123, t.string());
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
        });

        test("isValid() returns true for valid data", () => {
            expect(t.isValid("test", t.string())).toBe(true);
        });

        test("isValid() returns false for invalid data", () => {
            expect(t.isValid(123, t.string())).toBe(false);
        });
    });

    // =====================
    // OBJECT UTILITIES
    // =====================
    describe("Object Utilities", () => {
        const userShape = t.object({
            name: t.string(),
            age: t.number(),
        });

        test("pick() creates shape with picked properties", () => {
            const nameOnly = t.pick(userShape, ["name"]);
            expect(t.validate({ name: "test" }, nameOnly).success).toBe(true);
            expect(t.validate({ name: "test", age: 30 }, nameOnly).success).toBe(true);
            expect(t.validate({ age: 30 }, nameOnly).success).toBe(false);
        });

        test("omit() creates shape with omitted properties", () => {
            const noAge = t.omit(userShape, ["age"]);
            expect(t.validate({ name: "test" }, noAge).success).toBe(true);
            expect(t.validate({ name: "test", age: 30 }, noAge).success).toBe(true);
            expect(t.validate({ age: 30 }, noAge).success).toBe(false);
        });

        test("merge() combines two object shapes", () => {
            const addressShape = t.object({ street: t.string() });
            const userWithAddress = t.merge(userShape, addressShape);
            expect(t.validate({ name: "test", age: 30, street: "123 Main" }, userWithAddress).success).toBe(true);
        });

        test("extend() adds properties to object shape", () => {
            const extendedUser = t.extend(userShape, { email: t.string().email() });
            expect(t.validate({ name: "test", age: 30, email: "test@example.com" }, extendedUser).success).toBe(true);
        });
    });

    // =====================
    // STRING SPECIALIZATIONS
    // =====================
    describe("String Specializations", () => {
        test("email() validates email format", () => {
            const shape = t.email();
            expect(t.isValid("test@example.com", shape)).toBe(true);
            expect(t.isValid("invalid", shape)).toBe(false);
        });

        test("uuid() validates UUID format", () => {
            const shape = t.uuid();
            expect(t.isValid("123e4567-e89b-12d3-a456-426614174000", shape)).toBe(true);
            expect(t.isValid("invalid", shape)).toBe(false);
        });

        test("url() validates URL format", () => {
            const shape = t.url();
            expect(t.isValid("https://example.com", shape)).toBe(true);
            expect(t.isValid("invalid", shape)).toBe(false);
        });

        test("ip() validates IP address format", () => {
            const shape = t.ip();
            expect(t.isValid("192.168.1.1", shape)).toBe(true);
            expect(t.isValid("invalid", shape)).toBe(false);
        });

        test("dateString() validates ISO date format", () => {
            const shape = t.dateString();
            expect(t.isValid("2023-01-01T00:00:00.000Z", shape)).toBe(true);
            expect(t.isValid("invalid", shape)).toBe(false);
        });

        test("hexColor() validates hex color format", () => {
            const shape = t.hexColor();
            expect(t.isValid("#ffffff", shape)).toBe(true);
            expect(t.isValid("invalid", shape)).toBe(false);
        });

        test("creditCard() validates credit card format", () => {
            const shape = t.creditCard();
            expect(t.isValid("4111111111111111", shape)).toBe(true); // Test Visa
            expect(t.isValid("invalid", shape)).toBe(false);
        });

        test("regex() validates against custom regex", () => {
            const shape = t.regex(/^[A-Z]+$/);
            expect(t.isValid("ABC", shape)).toBe(true);
            expect(t.isValid("abc", shape)).toBe(false);
        });
    });

    // =====================
    // NUMBER SPECIALIZATIONS
    // =====================
    describe("Number Specializations", () => {
        test("int() validates integers", () => {
            const shape = t.int();
            expect(t.isValid(123, shape)).toBe(true);
            expect(t.isValid(123.45, shape)).toBe(false);
        });

        test("positive() validates positive numbers", () => {
            const shape = t.positive();
            expect(t.isValid(123, shape)).toBe(true);
            expect(t.isValid(-123, shape)).toBe(false);
        });

        test("negative() validates negative numbers", () => {
            const shape = t.negative();
            expect(t.isValid(-123, shape)).toBe(true);
            expect(t.isValid(123, shape)).toBe(false);
        });

        test("port() validates port numbers", () => {
            const shape = t.port();
            expect(t.isValid(8080, shape)).toBe(true);
            expect(t.isValid(0, shape)).toBe(false);
            expect(t.isValid(65536, shape)).toBe(false);
        });

        test("latitude() validates latitude values", () => {
            const shape = t.latitude();
            expect(t.isValid(45.123, shape)).toBe(true);
            expect(t.isValid(-91, shape)).toBe(false);
            expect(t.isValid(91, shape)).toBe(false);
        });

        test("longitude() validates longitude values", () => {
            const shape = t.longitude();
            expect(t.isValid(-180, shape)).toBe(true);
            expect(t.isValid(180, shape)).toBe(true);
            expect(t.isValid(-181, shape)).toBe(false);
            expect(t.isValid(181, shape)).toBe(false);
        });

        test("percentage() validates percentage values", () => {
            const shape = t.percentage();
            expect(t.isValid(50, shape)).toBe(true);
            expect(t.isValid(0, shape)).toBe(true);
            expect(t.isValid(100, shape)).toBe(true);
            expect(t.isValid(-1, shape)).toBe(false);
            expect(t.isValid(101, shape)).toBe(false);
        });
    });

    // =====================
    // LOGICAL OPERATORS
    // =====================
    describe("Logical Operators", () => {
        test("and() combines shapes with AND logic", () => {
            const shape = t.and(t.string(), t.regex(/^[A-Z]+$/));
            expect(t.isValid("ABC", shape)).toBe(true);
            expect(t.isValid("abc", shape)).toBe(false);
            expect(t.isValid(123, shape)).toBe(false);
        });

        test("or() combines shapes with OR logic", () => {
            const shape = t.or(t.string(), t.number());
            expect(t.isValid("test", shape)).toBe(true);
            expect(t.isValid(123, shape)).toBe(true);
            expect(t.isValid(true, shape)).toBe(false);
        });

        test("not() negates a shape", () => {
            const shape = t.not(t.number());
            expect(t.isValid("test", shape)).toBe(true);
            expect(t.isValid(123, shape)).toBe(false);
        });
    });

    // =====================
    // RANDOM GENERATORS
    // =====================
    describe("Random Generators", () => {
        test("random() generates string of specified length", () => {
            const str = t.random(10);
            expect(str.length).toBe(10);
        });

        test("randomInt() generates number within range", () => {
            const num = t.randomInt(5, 10);
            expect(num).toBeGreaterThanOrEqual(5);
            expect(num).toBeLessThanOrEqual(10);
        });

        test("randomUuid() generates valid UUID", () => {
            const uuid = t.randomUuid();
            expect(t.isValid(uuid, t.uuid())).toBe(true);
        });
    });

    // =====================
    // CUSTOM VALIDATION
    // =====================
    describe("Custom Validation", () => {
        test("custom() creates shape with custom validator", () => {
            const shape = t.custom((val): val is string => typeof val === "string" && val.length > 5);
            expect(t.isValid("long enough", shape)).toBe(true);
            expect(t.isValid("short", shape)).toBe(false);
        });

        test("refine() adds custom validation to existing shape", () => {
            const shape = t.string().refine(val => val.length > 5, "Must be longer than 5 characters");
            expect(t.isValid("long enough", shape)).toBe(true);
            expect(t.isValid("short", shape)).toBe(false);
        });
    });
});