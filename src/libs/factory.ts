import { StringShape } from './shapes/string-shape';
import { NumberShape } from './shapes/number-shape';
import { BooleanShape } from './shapes/boolean-shape';
import { ObjectShape } from './shapes/object-shape';
import { ArrayShape } from './shapes/array-shape';
import { RecordShape } from './shapes/record-shape';
import { EnumShape } from './shapes/enum-shape';
import { AnyShape } from './shapes/any-shape';
import { UnionShape } from './shapes/union-shape';
import type { BaseShape } from './shapes/base-shape';
import type { InferShapeType, PrimitiveShapes } from "./types";

/**
 * Creates an Enum shape from an array of values or an enum object
 * @template T - The type of enum values (array or object)
 * @param {T} arg - Array of values or enum object
 * @returns {EnumShape} A new Enum shape instance
 */
//@ts-expect-error typed declaration diff
declare function Enum<const T extends readonly (string | number | boolean)[]>(
  keys: T
): EnumShape<T[number]>;

//@ts-expect-error typed declaration diff
declare function Enum<const T extends Record<string, string | number | boolean>>(
  enumObj: T
): EnumShape<T[keyof T]>;

function Enum<T extends object | readonly (string | number)[]>(arg: T) {
  if (Array.isArray(arg)) {
    return new EnumShape(arg);
  } else {
    const values = Object.values(arg)
      .filter((v): v is T[keyof T] => typeof v === 'string' || typeof v === 'number');
    return new EnumShape(values as never);
  }
}

/**
 * Creates a string shape validator
 * @returns {StringShape} A new String shape instance
 */
export function string() { return new StringShape(); }

/**
 * Creates a number shape validator
 * @returns {NumberShape} A new Number shape instance
 */
export function number() { return new NumberShape(); }

/**
 * Creates a boolean shape validator
 * @returns {BooleanShape} A new Boolean shape instance
 */
export function boolean() { return new BooleanShape(); }

/**
 * Creates a shape that accepts any value
 * @returns {AnyShape} A new Any shape instance
 */
export function any() { return new AnyShape(); }

/**
 * Creates an object shape validator
 * @template T - The type of the object shape
 * @param {T} shape - Object shape definition
 * @returns {ObjectShape} A new Object shape instance
 */
export function object<T extends Record<string, any>>(shape: T) { return new ObjectShape(shape); }

/**
 * Creates an array shape validator
 * @template T - The type of array elements
 * @param {T} shape - Shape of array elements
 * @returns {ArrayShape} A new Array shape instance
 */
export function array<T extends BaseShape<any>>(shape: T) { return new ArrayShape(shape); }

/**
 * Creates a record shape validator (dictionary/map)
 * @template K - The type of record keys
 * @template V - The type of record values
 * @param {BaseShape<K>} keyShape - Shape of the keys
 * @param {V} valueShape - Shape of the values
 * @returns {RecordShape} A new Record shape instance
 */
export function record<K extends string | number, V >(
  keyShape: BaseShape<K>,
  valueShape: BaseShape<V>
) { return new RecordShape(keyShape, valueShape as BaseShape<V>); }

export { Enum as enum };

/**
 * Creates a union shape validator (one of several types)
 * @template T - The types in the union
 * @param {T} shapes - Array of shapes to union
 * @returns {UnionShape} A new Union shape instance
 */
export function union<T extends PrimitiveShapes[]>(shapes: T) { return new UnionShape(shapes); }

/**
 * Creates a union shape validator (variadic version)
 * @template T - The types in the union
 * @param {...T} shapes - Shapes to union
 * @returns {UnionShape} A new Union shape instance
 */
export function unionOf<T extends PrimitiveShapes[]>(...shapes: T) { return new UnionShape(shapes); }

/**
 * Makes a shape optional (allows undefined)
 * @template T - The shape type
 * @param {T} shape - Shape to make optional
 * @returns {T} The modified shape
 */
export function optional<T extends PrimitiveShapes>(shape: T) { return shape.optional(); }

/**
 * Makes a shape nullable (allows null)
 * @template T - The shape type
 * @param {T} shape - Shape to make nullable
 * @returns {T} The modified shape
 */
export function nullable<T extends PrimitiveShapes>(shape: T) { return shape.nullable(); }

/**
 * Makes a shape required (disallows undefined and null)
 * @template T - The shape type
 * @param {T} shape - Shape to make required
 * @returns {T} The modified shape
 */
export function required<T extends PrimitiveShapes>(shape: T) { 
  return shape.refine(
    v => v !== undefined && v !== null, 
    'Value is required'
  ); 
}

/**
 * Makes all properties in an object shape optional
 * @template T - The object shape type
 * @param {T} shape - Object shape to make partial
 * @returns {T} The modified shape
 */
export function partial<T extends ObjectShape<any>>(shape: T) { return shape.partial(); }

/**
 * Coercion utilities that automatically convert values to the target type
 */
export const coerce = {
  /** Coerces value to string */
  string: () => new StringShape().coerce(),
  /** Coerces value to number */
  number: () => new NumberShape().coerce(),
  /** Coerces value to boolean */
  boolean: () => new BooleanShape().coerce(),
};

/**
 * Validates a value against a shape
 * @template T - The expected type
 * @param {unknown} value - Value to validate
 * @param {PrimitiveShapes} shape - Shape to validate against
 * @returns {{success: true, data: T} | {success: false, error: Error}} Validation result
 */
export function validate<T extends PrimitiveShapes>(value: unknown, shape: T) {
  try {
    return { success: true, data: shape.parse(value) } as const;
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    } as const;
  }
}

/**
 * Checks if a value is valid against a shape
 * @template T - The expected type
 * @param {unknown} value - Value to check
 * @param {PrimitiveShapes} shape - Shape to validate against
 * @returns {boolean} True if valid, false otherwise
 */
export function isValid<T>(value: unknown, shape: PrimitiveShapes) {
  try {
    shape.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Picks specific properties from an object shape
 * @template T - The object shape type
 * @template K - The keys to pick
 * @param {T} shape - Object shape to pick from
 * @param {K[]} keys - Keys to pick
 * @returns {ObjectShape} A new object shape with only the picked properties
 */
export function pick<T extends ObjectShape<any>, K extends keyof InferShapeType<T>>(shape: T, keys: K[]) {
  return shape.pick(keys);
}

/**
 * Omits specific properties from an object shape
 * @template T - The object shape type
 * @template K - The keys to omit
 * @param {T} shape - Object shape to omit from
 * @param {K[]} keys - Keys to omit
 * @returns {ObjectShape} A new object shape without the omitted properties
 */
export function omit<T extends ObjectShape<any>, K extends keyof InferShapeType<T>>(shape: T, keys: K[]) {
  return shape.omit(keys);
}

/**
 * Merges two object shapes
 * @template T - First object shape type
 * @template U - Second object shape type
 * @param {T} shape1 - First object shape
 * @param {U} shape2 - Second object shape
 * @returns {ObjectShape} A new merged object shape
 */
export function merge<T extends ObjectShape<any>, U extends ObjectShape<any>>(shape1: T, shape2: U) {
  return shape1.merge(shape2);
}

/**
 * Extends an object shape with additional properties
 * @template T - The base object shape type
 * @template U - The extension properties type
 * @param {T} shape - Base object shape
 * @param {U} extensions - Additional properties to add
 * @returns {ObjectShape} A new extended object shape
 */
export function extend<T extends ObjectShape<any>, U extends Record<string, PrimitiveShapes>>(shape: T, extensions: U) {
  return shape.merge(object(extensions));
}

/**
 * Creates an array shape that requires at least one element
 * @template T - The array element shape type
 * @param {T} shape - Element shape
 * @returns {ArrayShape} A new array shape with non-empty constraint
 */
export function nonEmptyArray<T extends BaseShape<any>>(shape: T) { 
  return array(shape).nonEmpty();
}

/**
 * Creates an array shape that requires unique elements
 * @template T - The array element shape type
 * @param {T} shape - Element shape
 * @returns {ArrayShape} A new array shape with unique elements constraint
 */
export function uniqueArray<T extends BaseShape<any>>(shape: T) { 
  return array(shape).unique();
}

/**
 * Creates an array shape with minimum length constraint
 * @template T - The array element shape type
 * @param {T} shape - Element shape
 * @param {number} min - Minimum array length
 * @returns {ArrayShape} A new array shape with length constraint
 */
export function minLength<T extends BaseShape<any>>(shape: T, min: number) { 
  return array(shape).min(min);
}

/**
 * Creates an array shape with maximum length constraint
 * @template T - The array element shape type
 * @param {T} shape - Element shape
 * @param {number} max - Maximum array length
 * @returns {ArrayShape} A new array shape with length constraint
 */
export function maxLength<T extends BaseShape<any>>(shape: T, max: number) { 
  return array(shape).max(max);
}

/**
 * Creates a string shape that validates email format
 * @returns {StringShape} A new string shape with email validation
 */
export function email() { return new StringShape().email(); }

/**
 * Creates a string shape that validates UUID format
 * @returns {StringShape} A new string shape with UUID validation
 */
export function uuid() { return new StringShape().uuid(); }

/**
 * Creates a string shape that validates URL format
 * @returns {StringShape} A new string shape with URL validation
 */
export function url() { return new StringShape().url(); }

/**
 * Creates a string shape that validates IP address format
 * @returns {StringShape} A new string shape with IP validation
 */
export function ip() { return new StringShape().ipAddress(); }

/**
 * Creates a string shape that validates ISO date format
 * @returns {StringShape} A new string shape with date validation
 */
export function dateString() { return new StringShape().isoDate(); }

/**
 * Creates a string shape that validates hex color format
 * @returns {StringShape} A new string shape with hex color validation
 */
export function hexColor() { return new StringShape().hexColor(); }

/**
 * Creates a string shape that validates credit card format
 * @returns {StringShape} A new string shape with credit card validation
 */
export function creditCard() { return new StringShape().creditCard(); }

/**
 * Creates a string shape that validates against a regex pattern
 * @param {RegExp} pattern - Regular expression to match
 * @returns {StringShape} A new string shape with regex validation
 */
export function regex(pattern: RegExp) { return new StringShape().regex(pattern); }

/**
 * Creates a number shape that validates integers
 * @returns {NumberShape} A new number shape with integer validation
 */
export function int() { return new NumberShape().int(); }

/**
 * Creates a number shape that validates floating point numbers
 * @returns {NumberShape} A new number shape
 */
export function float() { return new NumberShape(); }

/**
 * Creates a number shape that validates positive numbers
 * @returns {NumberShape} A new number shape with positive validation
 */
export function positive() { return new NumberShape().positive(); }

/**
 * Creates a number shape that validates negative numbers
 * @returns {NumberShape} A new number shape with negative validation
 */
export function negative() { return new NumberShape().negative(); }

/**
 * Creates a number shape that validates network port numbers (0-65535)
 * @returns {NumberShape} A new number shape with port validation
 */
export function port() { return new NumberShape().port(); }

/**
 * Creates a number shape that validates latitude values (-90 to 90)
 * @returns {NumberShape} A new number shape with latitude validation
 */
export function latitude() { return new NumberShape().latitude(); }

/**
 * Creates a number shape that validates longitude values (-180 to 180)
 * @returns {NumberShape} A new number shape with longitude validation
 */
export function longitude() { return new NumberShape().longitude(); }

/**
 * Creates a number shape that validates percentage values (0-100)
 * @returns {NumberShape} A new number shape with percentage validation
 */
export function percentage() { return new NumberShape().percentage(); }

/**
 * Creates a shape that requires a value to satisfy both shapes (intersection)
 * @template T - First shape type
 * @template U - Second shape type
 * @param {T} shape1 - First shape
 * @param {U} shape2 - Second shape
 * @returns {AnyShape} A new shape that requires both conditions
 */
export function and<T extends PrimitiveShapes, U extends PrimitiveShapes>(shape1: T, shape2: U) { 
  return new AnyShape<InferShapeType<T> & InferShapeType<U>>().refine(
    v => shape1.safeParse(v).success && shape2.safeParse(v).success,
    'Must satisfy both schemas'
  );
}

/**
 * Creates a shape that requires a value to satisfy either shape (union)
 * @template T - First shape type
 * @template U - Second shape type
 * @param {T} shape1 - First shape
 * @param {U} shape2 - Second shape
 * @returns {UnionShape} A new shape that requires either condition
 */
export function or<T extends PrimitiveShapes, U extends PrimitiveShapes>(shape1: T, shape2: U) { 
  return union([shape1, shape2]);
}

/**
 * Creates a shape that requires a value to NOT satisfy the given shape
 * @template T - The shape type to negate
 * @param {T} shape - Shape to negate
 * @returns {AnyShape} A new shape that requires the value to not match
 */
export function not<T extends PrimitiveShapes>(shape: T) { 
  return new AnyShape<unknown>().refine(
    v => !shape.safeParse(v).success,
    'Must not match the schema'
  );
}

/**
 * Generates a random string
 * @param {number} [length=64] - Length of the string
 * @param {boolean} [ext=false] - Include extended characters
 * @returns {string} Random string
 */
export function random(length: number = 64, ext: boolean = false): string {
  let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  if (ext) chars += "!@#$%^&*()_+-={}[]|:;<>,.?/~`";
  
  let result = "";
  const charsLength = chars.length;
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * charsLength));
  }
  
  return result;
}

/**
 * Generates a random integer between min and max (inclusive)
 * @param {number} [min=1] - Minimum value
 * @param {number} [max=1000] - Maximum value
 * @returns {number} Random integer
 */
export function randomInt(min: number = 1, max: number = 1000): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random UUID v4
 * @returns {string} Random UUID
 */
export function randomUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Creates a custom validator shape
 * @template T - The expected type
 * @param {(value: unknown) => value is T} validator - Custom validation function
 * @param {string} [message] - Optional error message
 * @returns {AnyShape} A new shape with custom validation
 */
export function custom<T>(validator: (value: unknown) => value is T, message?: string) { 
  return new AnyShape<T>().refine(validator, message ?? 'Custom validation failed');
}

/**
 * Adds a refinement to an existing shape
 * @template T - The shape type
 * @param {T} shape - Shape to refine
 * @param {(value: InferShapeType<T>) => boolean} predicate - Refinement predicate
 * @param {string} message - Error message if refinement fails
 * @param {string} [code] - Optional error code
 * @returns {T} The refined shape
 */
export function refine<T extends PrimitiveShapes>(
  shape: T,
  predicate: (value: InferShapeType<T>) => boolean,
  message: string,
  code?: string
) { return shape.refine(predicate, message, code); }