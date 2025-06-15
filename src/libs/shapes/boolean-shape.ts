import { TshShapeError } from "../error";
import type { TshOptions } from "../types";
import { AbstractShape } from "./abstract-shape";

export class BooleanShape<Type extends boolean = boolean> extends AbstractShape<Type> {
  public readonly _type = "boolean";
  public _coerce = false;

  coerce(): this {
    this._coerce = true;
    return this;
  }
  
  constructor() {
    super({
      sync: (value) => {
        if (typeof value === "boolean") {
          return { success: true };
        }

        return {
          success: false,
          error: new TshShapeError({
            code: 'NOT_BOOLEAN',
            message: 'Expected a boolean',
            value,
            shape: this,
          })
        };
      },
      coerceFn:(value:unknown) => {
        if(!this._coerce) return value;
        if (typeof value === 'string') {
          const normalized = value.toLowerCase().trim();
          // Loose string coercion
          if (['yes', 'y', 's', '1', 'true'].includes(normalized)) {
            return true;
          }
          if (['no', 'n', '0', 'false'].includes(normalized)) {
            return false;
          }
          if (!isNaN(Number(normalized))) {
            return Number(normalized) !== 0;
          }
          return Boolean(value);
        }

        // Numbers: coerce NaN and zero to false
        if (typeof value === "number") {
          return !isNaN(value) && value !== 0;
        }

        // null/undefined -> false
        if (value === null || value === undefined) {
          return false;
        }

        // objects, symbols, other types
        return Boolean(value);
      }
    });
  }

  isTrue(opts: TshOptions = {}): this {
    return this.refine(
      (val) => val === true,
      opts.message ?? 'Value must be true',
      opts.code ?? 'NOT_TRUE',
      { ...opts?.extra ?? {} }
    );
  }

  isFalse(opts: TshOptions = {}): this {
    return this.refine(
      (val) => val === false,
      opts.message ?? 'Value must be false',
      opts.code ?? 'NOT_FALSE',
      { ...opts?.extra ?? {} }
    );
  }

  truthy(opts: TshOptions = {}): this {
    return this.refine(
      (val) => Boolean(val),
      opts.message ?? 'Value must be truthy',
      opts.code ?? 'NOT_TRUTHY',
      { ...opts?.extra ?? {} }
    );
  }

  falsy(opts: TshOptions = {}): this {
    return this.refine(
      (val) => !val,
      opts.message ?? 'Value must be falsy',
      opts.code ?? 'NOT_FALSY',
      { ...opts?.extra ?? {} }
    );
  }
}
