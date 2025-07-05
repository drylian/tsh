import { TshShapeError } from '../error';
import type { TshOptions } from '../types';
import { AbstractShape } from './abstract-shape';

export class EnumShape<T extends (string | number | boolean)> extends AbstractShape<T> {
  public readonly _type = "enum";
  private readonly _values: readonly T[];

  constructor(values: readonly T[]) {
    super({
      type:"enum",
      primitiveFn: (value) => {
        if (values.includes(value as T)) {
          return { success: true };
        }

        return {
          success: false,
          error: new TshShapeError({
            code: 'INVALID_ENUM_VALUE',
            message: `Value must be one of: ${values.join(', ')}`,
            value,
            shape: this,
            extra: { validValues: values.join(', ') }
          })
        };
      }
    });

    this._values = values;
  }

  hasValue(value: T, opts: TshOptions = {}): this {
    return this.refine(
      (val) => val === value,
      opts.message ?? `Value must be ${value}`,
      opts.code ?? 'HAS_ENUM_VALUE',
      { ...opts?.extra ?? {},expected: value }
    );
  }

  notValue(value: T, opts: TshOptions = {}): this {
    return this.refine(
      (val) => val !== value,
      opts.message ?? `Value must not be ${value}`,
      opts.code ?? 'NOTHAS_ENUM_VALUE',
      { ...opts?.extra ?? {},forbidden: value }
    );
  }

  oneOf(values: T[], opts: TshOptions = {}): this {
    return this.refine(
      (val) => values.includes(val),
      opts.message ?? `Value must be one of: ${values.join(', ')}`,
      opts.code ?? 'INVALID_ENUM_VALUE',
      { ...opts?.extra ?? {},forbidden: values.join(', ') }
    );
  }

  notOneOf(values: T[], opts: TshOptions = {}): this {
    return this.refine(
      (val) => !values.includes(val),
      opts.message ?? `Value must not be one of: ${values.join(', ')}`,
      opts.code ?? 'NOTONE_ENUM_VALUE',
      { ...opts?.extra ?? {},forbiddenValues: values.join(', ') }
    );
  }
}