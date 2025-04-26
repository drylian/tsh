import type { TshOptions, InferShapeType } from "../types";
import { TshShapeError } from "../error";
import { AbstractShape } from "./abstract-shape";

export class ArrayShape<T extends AbstractShape<any>> extends AbstractShape<InferShapeType<T>[]> {
  public readonly _type = "array";
  public _minLength?: number;
  public _maxLength?: number;
  public _exactLength?: number;
  public _nonEmpty = false;

  constructor(public readonly _shape: T) {
    super();
  }

  parse(value: unknown, opts?: TshOptions): Array<InferShapeType<T>> {
    if (typeof value === "undefined" && typeof this._default !== "undefined") value = this._default;
    if (typeof value === "undefined" && this._optional) return undefined as never;
    if (value === null && this._nullable) return null as never;

    if (!Array.isArray(value)) {
      this.createError((value: unknown) => ({
        code: opts?.code ?? 'NOT_ARRAY',
        message: opts?.message ?? 'Expected an array',
        value,
        extra: opts?.extra,
        shape: this,
      }), value);
    }

    const result = value.map((item, index) => {
      try {
        if (this._shape instanceof AbstractShape) {
          const key = this._key;
          const result = this._shape.parseWithPath(item, `${this._key}[${index}]`);
          this._key = key;
          return result;
        } else {
          if (item !== this._shape) {
            throw new TshShapeError({
              ...opts,
              code: 'INVALID_LITERAL',
              message: `Expected ${this._shape}`,
              value: item,
              extra: {
                key: `${this._key}[${index}]`,
                expected: JSON.stringify(this._shape),
                ...opts?.extra ?? {},
              },
              shape: this,
            });
          }
          return item;
        }
      } catch (error) {
        if (error instanceof TshShapeError) {
          throw error;
        }
        this.createError((value: unknown) => ({
          ...opts,
          code: opts?.code ?? 'INVALID_ARRAY_ELEMENT',
          message: opts?.message ?? `Invalid array element at index ${index}`,
          value,
          shape: this,
          extra: {
            key: `${this._key}[${index}]`,
            index,
            ...opts?.extra ?? {},
          },
        }), item);
      }
    });

    return this._operate(result);
  }

  min(min: number, opts: TshOptions = {}): this {
    this._minLength = min;
    return this.refine(
      (arr) => arr.length >= min,
      opts.message ?? `Array must contain at least ${min} elements`,
      opts.code ?? 'ARRAY_TOO_SHORT',
      { ...opts?.extra ?? {}, min }
    );
  }

  max(max: number, opts: TshOptions = {}): this {
    this._maxLength = max;
    return this.refine(
      (arr) => arr.length <= max,
      opts.message ?? `Array must contain at most ${max} elements`,
      opts.code ?? 'ARRAY_TOO_LONG',
      { ...opts?.extra ?? {}, max }
    );
  }

  length(length: number, opts: TshOptions = {}): this {
    this._exactLength = length;
    return this.refine(
      (arr) => arr.length === length,
      opts.message ?? `Array must contain exactly ${length} elements`,
      opts.code ?? 'INVALID_ARRAY_LENGTH',
      { ...opts?.extra ?? {}, length }
    );
  }

  nonEmpty(opts: TshOptions = {}): this {
    this._nonEmpty = true;
    return this.refine(
      (arr) => arr.length > 0,
      opts.message ?? 'Array must not be empty',
      opts.code ?? 'EMPTY_ARRAY',
      { ...opts?.extra ?? {}}
    );
  }

  unique(opts: TshOptions = {}): this {
    return this.refine(
      (arr) => new Set(arr).size === arr.length,
      opts.message ?? 'Array must contain unique elements',
      opts.code ?? 'DUPLICATE_ITEMS',
      { ...opts?.extra ?? {}}
    );
  }

  includes(element: InferShapeType<T>, opts: TshOptions = {}) {
    return this.refine(
      (arr: any[]) => arr.includes(element as never),
      opts.message ?? `Array must include ${JSON.stringify(element)}`,
      opts.code ?? 'MISSING_ELEMENT',
      { ...opts?.extra ?? {}, element }
    );
  }

  excludes(element: InferShapeType<T>, opts: TshOptions = {}): this {
    return this.refine(
      (arr) => !arr.includes(element),
      opts.message ?? `Array must not include ${JSON.stringify(element)}`,
      opts.code ?? 'FORBIDDEN_ELEMENT',
      { ...opts?.extra ?? {}, element }
    );
  }

  onion<U extends AbstractShape<any>>(shape: U): ArrayShape<U> {
    return new ArrayShape(shape);
  }
}