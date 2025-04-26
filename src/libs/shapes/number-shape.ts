import type { TshOptions } from "../types";
import { AbstractShape } from "./abstract-shape";

export class NumberShape<Type extends number = number> extends AbstractShape<Type> {
  public readonly _type = "number";

  public _min?: number;
  public _max?: number;
  public _int = false;
  public _positive = false;
  public _negative = false;
  public _finite = true;
  public _safe = false;
  public _multipleOf?: number;
  public _coerce = false;
  public _decimalPlaces?: number;
  public _precision?: number;

  coerce(): this {
    this._coerce = true;
    return this;
  }

  parse(value: unknown, opts?: TshOptions): Type {
    if (typeof value === "undefined" && typeof this._default !== "undefined") value = this._default;
    if (typeof value === "undefined" && this._optional) return undefined as never;
    if (value === null && this._nullable) return null as never;

    if (this._coerce) {
      if (value === null || value === undefined || value === '') {
        value = 0;
      } else if (typeof value === 'boolean') {
        value = value ? 1 : 0;
      } else if (typeof value === 'string') {
        value = Number(value);
        if (isNaN(value as number)) {
          this.createError((value: unknown) => ({
            code: opts?.code ?? 'NOT_NUMBER',
            message: opts?.message ?? 'Expected a number',
            value,
            shape: this,
            extra: { ...opts?.extra ?? {} },
          }), value);
        }
      } else if (typeof value === 'number') {
        value = value;
      } else {
        this.createError((value: unknown) => ({
          code: opts?.code ?? 'NOT_NUMBER',
          message: opts?.message ?? 'Expected a number',
          value,
          shape: this,
          extra: { ...opts?.extra ?? {} },
        }), value);
      }
    }

    if (typeof value !== 'number') {
      this.createError((value: unknown) => ({
        code: opts?.code ?? 'NOT_NUMBER',
        message: opts?.message ?? 'Expected a number',
        value,
        shape: this,
        extra: { ...opts?.extra ?? {} },
      }), value);
    }

    let result = value as number;

    return this._operate(result);
  }

  min(value: number, opts: TshOptions = {}): this {
    this._min = value;
    return this.refine(
      (val) => val >= value,
      opts.message ?? `Number must be at least ${value}`,
      opts.code ?? 'NUMBER_TOO_SMALL',
      { ...opts?.extra ?? {}, min: value },
    );
  }

  max(value: number, opts: TshOptions = {}): this {
    this._max = value;
    return this.refine(
      (val) => val <= value,
      opts.message ?? `Number must be at most ${value}`,
      opts.code ?? 'NUMBER_TOO_LARGE',
      { ...opts?.extra ?? {}, max: value },
    );
  }

  range(min: number, max: number, opts: TshOptions = {}): this {
    this._min = min;
    this._max = max;
    return this.refine(
      (val) => val >= min && val <= max,
      opts.message ?? `Number must be between ${min} and ${max}`,
      opts.code ?? 'NOT_IN_RANGE',
      { ...opts?.extra ?? {}, min, max },
    );
  }

  int(opts: TshOptions = {}): this {
    this._int = true;
    return this.refine(
      Number.isInteger,
      opts.message ?? 'Number must be an integer',
      opts.code ?? 'NOT_INTEGER',
      { ...opts?.extra ?? {} },
    );
  }

  positive(opts: TshOptions = {}): this {
    this._positive = true;
    return this.refine(
      (val) => val > 0,
      opts.message ?? 'Number must be positive',
      opts.code ?? 'NOT_POSITIVE',
      { ...opts?.extra ?? {} },
    );
  }

  nonNegative(opts: TshOptions = {}): this {
    return this.min(0, opts);
  }

  negative(opts: TshOptions = {}): this {
    this._negative = true;
    return this.refine(
      (val) => val < 0,
      opts.message ?? 'Number must be negative',
      opts.code ?? 'NOT_NEGATIVE',
      { ...opts?.extra ?? {} },
    );
  }

  nonPositive(opts: TshOptions = {}): this {
    return this.max(0, opts);
  }

  finite(opts: TshOptions = {}): this {
    this._finite = true;
    return this.refine(
      Number.isFinite,
      opts.message ?? 'Number must be finite',
      opts.code ?? 'NOT_FINITE',
      { ...opts?.extra ?? {} },
    );
  }

  safe(opts: TshOptions = {}): this {
    this._safe = true;
    return this.refine(
      Number.isSafeInteger,
      opts.message ?? 'Number must be a safe integer',
      opts.code ?? 'NOT_SAFE_INTEGER',
      { ...opts?.extra ?? {} },
    );
  }

  multipleOf(value: number, opts: TshOptions = {}): this {
    this._multipleOf = value;
    return this.refine(
      (val) => val % value === 0,
      opts.message ?? `Number must be a multiple of ${value}`,
      opts.code ?? 'NOT_MULTIPLE_OF',
      { ...opts?.extra ?? {}, multiple: value },
    );
  }

  decimal(places: number, opts: TshOptions = {}): this {
    this._decimalPlaces = places;
    return this.refine(
      (val) => {
        const str = val.toString();
        const decimalIndex = str.indexOf('.');
        return decimalIndex === -1 ? true : str.length - decimalIndex - 1 <= places;
      },
      opts.message ?? `Number must have at most ${places} decimal places`,
      opts.code ?? 'TOO_MANY_DECIMALS',
      { ...opts?.extra ?? {}, maxDecimalPlaces: places },
    );
  }

  precision(digits: number, opts: TshOptions = {}): this {
    this._precision = digits;
    return this.refine(
      (val) => {
        const str = val.toString().replace(/^0\.?0*|\./, '');
        return str.length <= digits;
      },
      opts.message ?? `Number must have at most ${digits} significant digits`,
      opts.code ?? 'TOO_MANY_DIGITS',
      { ...opts?.extra ?? {}, maxPrecision: digits },
    );
  }

  exactDecimal(places: number, opts: TshOptions = {}): this {
    return this.refine(
      (val) => {
        const str = val.toString();
        const decimalIndex = str.indexOf('.');
        return decimalIndex !== -1 && str.length - decimalIndex - 1 === places;
      },
      opts.message ?? `Number must have exactly ${places} decimal places`,
      opts.code ?? 'INVALID_DECIMAL_PLACES',
      { ...opts?.extra ?? {}, requiredDecimalPlaces: places },
    );
  }

  equals(value: number, opts: TshOptions = {}): this {
    return this.refine(
      (val) => val === value,
      opts.message ?? `Number must be equal to ${value}`,
      opts.code ?? 'NOT_EQUAL',
      { ...opts?.extra ?? {}, expected: value },
    );
  }

  notEquals(value: number, opts: TshOptions = {}): this {
    return this.refine(
      (val) => val !== value,
      opts.message ?? `Number must not be equal to ${value}`,
      opts.code ?? 'EQUALS_FORBIDDEN_VALUE',
      { ...opts?.extra ?? {}, forbidden: value },
    );
  }

  oneOf(values: number[], opts: TshOptions = {}): this {
    return this.refine(
      (val) => values.includes(val),
      opts.message ?? `Number must be one of: ${values.join(', ')}`,
      opts.code ?? 'NOT_IN_VALUES',
      { ...opts?.extra ?? {}, options: values.join(', ') },
    );
  }

  notOneOf(values: number[], opts: TshOptions = {}): this {
    return this.refine(
      (val) => !values.includes(val),
      opts.message ?? `Number must not be one of: ${values.join(', ')}`,
      opts.code ?? 'IN_FORBIDDEN_VALUES',
      { ...opts?.extra ?? {}, forbidden: values.join(', ') },
    );
  }

  port(opts: TshOptions = {}): this {
    return this.int(opts).min(1, opts).max(65535, opts);
  }

  latitude(opts: TshOptions = {}): this {
    return this.min(-90, opts).max(90, opts);
  }

  longitude(opts: TshOptions = {}): this {
    return this.min(-180, opts).max(180, opts);
  }

  percentage(opts: TshOptions = {}): this {
    return this.min(0, opts).max(100, opts);
  }

  probability(opts: TshOptions = {}): this {
    return this.min(0, opts).max(1, opts);
  }

  byte(opts: TshOptions = {}): this {
    return this.int(opts).min(0, opts).max(255, opts);
  }

  natural(opts: TshOptions = {}): this {
    return this.int(opts).min(0, opts);
  }

  whole(opts: TshOptions = {}): this {
    return this.int(opts).min(1, opts);
  }
}