import type { TshOptions, InferShapeType } from "../types";
import { AbstractShape } from "./abstract-shape";

export class ArrayShape<T extends AbstractShape<any>> extends AbstractShape<InferShapeType<T>[]> {
  public readonly _type = "array";
  public _minLength?: number;
  public _maxLength?: number;
  public _exactLength?: number;
  public _nonEmpty = false;

  constructor(public readonly _shape: T) {
    super({
      type:"array",
      //@ts-expect-error Async declarations
      primitiveFn: (value) => {
        const path = this._key !== "abstract" ? this._key : this._type || 'array';

        if (!Array.isArray(value)) {
          const e = new Error(`${path} - Expected an array`);
          return { success: false, error: e, errors: [e] };
        }

        const errors: Error[] = [];
        const output: InferShapeType<T>[] = [];

        value.forEach((item, index) => {
          const itemPath = `${path}[${index}]`;
          const result = this._shape.withPath(itemPath, () => this._shape.safeParse(item));

          if (!result.success) {
            const msg = result.error?.message || 'Invalid array item';
            errors.push(new Error(`${itemPath} - ${msg}`));
          } else {
            output.push(result.value);
          }
        });

        if (errors.length > 0) {
          const agg = new AggregateError(errors, `Invalid array elements`);
          return { success: false, error: agg, errors };
        }

        // Check length constraints (min, max, exact)
        const len = value.length;

        if (this._exactLength !== undefined && len !== this._exactLength) {
          const e = new Error(`${path} - Must contain exactly ${this._exactLength} elements`);
          return { success: false, error: e, errors: [e] };
        }

        if (this._minLength !== undefined && len < this._minLength) {
          const e = new Error(`${path} - Must contain at least ${this._minLength} elements`);
          return { success: false, error: e, errors: [e] };
        }

        if (this._maxLength !== undefined && len > this._maxLength) {
          const e = new Error(`${path} - Must contain at most ${this._maxLength} elements`);
          return { success: false, error: e, errors: [e] };
        }

        return { success: true, value: output as InferShapeType<T>[] };
      }
    });
  }

  min(min: number, opts: TshOptions = {}): this {
    this._minLength = min;
    return this.refine(
      (arr) => arr.length >= min,
      opts.message ?? `Array must contain at least ${min} elements`,
      opts.code ?? 'ARRAY_TOO_SHORT',
      { ...opts.extra, min }
    );
  }

  max(max: number, opts: TshOptions = {}): this {
    this._maxLength = max;
    return this.refine(
      (arr) => arr.length <= max,
      opts.message ?? `Array must contain at most ${max} elements`,
      opts.code ?? 'ARRAY_TOO_LONG',
      { ...opts.extra, max }
    );
  }

  length(length: number, opts: TshOptions = {}): this {
    this._exactLength = length;
    return this.refine(
      (arr) => arr.length === length,
      opts.message ?? `Array must contain exactly ${length} elements`,
      opts.code ?? 'INVALID_ARRAY_LENGTH',
      { ...opts.extra, length }
    );
  }

  nonEmpty(opts: TshOptions = {}): this {
    this._nonEmpty = true;
    return this.refine(
      (arr) => arr.length > 0,
      opts.message ?? 'Array must not be empty',
      opts.code ?? 'EMPTY_ARRAY',
      opts.extra
    );
  }

  unique(opts: TshOptions = {}): this {
    return this.refine(
      (arr) => new Set(arr).size === arr.length,
      opts.message ?? 'Array must contain unique elements',
      opts.code ?? 'DUPLICATE_ITEMS',
      opts.extra
    );
  }

  includes(element: InferShapeType<T>, opts: TshOptions = {}): this {
    return this.refine(
      (arr) => arr.includes(element),
      opts.message ?? `Array must include ${JSON.stringify(element)}`,
      opts.code ?? 'MISSING_ELEMENT',
      { ...opts.extra, element }
    );
  }

  excludes(element: InferShapeType<T>, opts: TshOptions = {}): this {
    return this.refine(
      (arr) => !arr.includes(element),
      opts.message ?? `Array must not include ${JSON.stringify(element)}`,
      opts.code ?? 'FORBIDDEN_ELEMENT',
      { ...opts.extra, element }
    );
  }

  onion<U extends AbstractShape<any>>(shape: U): ArrayShape<U> {
    return new ArrayShape(shape);
  }
}
