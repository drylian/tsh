import type { TshOptions, InferShapeType, TshViewer } from '../types';
import { TshShapeError } from '../error';
import { AbstractShape } from './abstract-shape';

export class RecordShape<K extends string | number | symbol, V extends AbstractShape<any>>
  extends AbstractShape<Record<K, InferShapeType<V>>> {

  public readonly _type = "record";

  constructor(
    private readonly _keyShape: AbstractShape<K>,
    private readonly _valueShape: V
  ) {
    super({
      type: "record",
      primitiveFn: async (value) => {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          return {
            success: false,
            error: new TshShapeError({
              code: 'NOT_OBJECT',
              message: 'Expected an object',
              value,
              shape: this
            })
          };
        }

        const result: Record<any, any> = {};
        const input = value as Record<any, unknown>;
        const errors: TshShapeError[] = [];

        for (const key of Object.keys(input)) {
          const keyResult = await this._keyShape.safeParseAsync(key);
          const valueResult = await this._valueShape.safeParseAsync(input[key]);

          if (!keyResult.success) errors.push(keyResult.error!);
          else if (!valueResult.success) errors.push(valueResult.error!);
          else result[keyResult.data] = valueResult.data;
        }

        if (errors.length > 0) {
          return {
            success: false,
            error: new TshShapeError({
              code: 'RECORD_VALIDATION_ERROR',
              message: 'Validation failed for record properties',
              value,
              shape: this,
              extra: { errors }
            })
          };
        }

        return { success: true };
      }
    });
  }

  // === Extra Modifiers ===

  getDefaults(): TshViewer<Record<K, InferShapeType<V>>> {
    if (this._default !== undefined) return this._default as never;

    const result: Record<any, any> = {};
    const keyDefault = this._keyShape._default as K;

    let valueDefault: InferShapeType<V>;

    if (this._valueShape instanceof AbstractShape) {
      if (this._valueShape._default !== undefined) {
        valueDefault = this._valueShape._default;
      } else if ('getDefaults' in this._valueShape) {
        valueDefault = (this._valueShape as any).getDefaults();
      } else {
        valueDefault = {} as InferShapeType<V>;
      }
    } else {
      valueDefault = this._valueShape;
    }

    if (keyDefault) result[keyDefault] = valueDefault;
    return result as never;
  }

  minProperties(min: number, opts: TshOptions = {}): this {
    return this.refine(
      (val) => Object.keys(val).length >= min,
      opts.message ?? `Record must have at least ${min} properties`,
      opts.code ?? 'TOO_FEW_PROPERTIES',
      { ...opts.extra, min }
    );
  }

  maxProperties(max: number, opts: TshOptions = {}): this {
    return this.refine(
      (val) => Object.keys(val).length <= max,
      opts.message ?? `Record must have at most ${max} properties`,
      opts.code ?? 'TOO_MANY_PROPERTIES',
      { ...opts.extra, max }
    );
  }

  exactProperties(count: number, opts: TshOptions = {}): this {
    return this.refine(
      (val) => Object.keys(val).length === count,
      opts.message ?? `Record must have exactly ${count} properties`,
      opts.code ?? 'INVALID_PROPERTY_COUNT',
      { ...opts.extra, count }
    );
  }

  hasProperty(key: K, opts: TshOptions = {}): this {
    return this.refine(
      (val) => key in val,
      opts.message ?? `Record must have property "${String(key)}"`,
      opts.code ?? 'MISSING_PROPERTY',
      opts.extra
    );
  }

  forbiddenProperty(key: K, opts: TshOptions = {}): this {
    return this.refine(
      (val) => !(key in val),
      opts.message ?? `Record must not have property "${String(key)}"`,
      opts.code ?? 'FORBIDDEN_PROPERTY',
      opts.extra
    );
  }

  propertyValue(key: K, validator: (value: InferShapeType<V>) => boolean, opts: TshOptions = {}): this {
    return this.refine(
      (val) => key in val && validator(val[key]),
      opts.message ?? `Property "${String(key)}" is invalid`,
      opts.code ?? 'INVALID_PROPERTY_VALUE',
      opts.extra
    );
  }

  propertyShape(key: K, shape: AbstractShape<any>, opts: TshOptions = {}): this {
    return this.refine(
      (val) => {
        if (!(key in val)) return false;
        try {
          shape.parse(val[key]);
          return true;
        } catch {
          return false;
        }
      },
      opts.message ?? `Property "${String(key)}" has invalid shape`,
      opts.code ?? 'INVALID_PROPERTY_SHAPE',
      opts.extra
    );
  }

  nonEmpty(opts: TshOptions = {}): this {
    return this.minProperties(1, opts);
  }

  propertyNames(validator: (key: string) => boolean, opts: TshOptions = {}): this {
    return this.refine(
      (val) => Object.keys(val).every(validator),
      opts.message ?? 'Some property names are invalid',
      opts.code ?? 'INVALID_PROPERTY_NAMES',
      opts.extra
    );
  }

  propertyValues(validator: (value: InferShapeType<V>) => boolean, opts: TshOptions = {}): this {
    return this.refine(
      (val) => Object.values(val).every(validator as never),
      opts.message ?? 'Some property values are invalid',
      opts.code ?? 'INVALID_PROPERTY_VALUES',
      opts.extra
    );
  }

  exactPropertiesShape(shape: Record<K, AbstractShape<any>>, opts: TshOptions = {}): this {
    return this.refine(
      (val) => {
        const valKeys = Object.keys(val);
        const shapeKeys = Object.keys(shape);

        if (valKeys.length !== shapeKeys.length) return false;
        if (!valKeys.every(k => shapeKeys.includes(k))) return false;

        return Object.entries(val).every(([key, value]) => {
          try {
            shape[key as K].parse(value);
            return true;
          } catch {
            return false;
          }
        });
      },
      opts.message ?? 'Record shape does not match required structure',
      opts.code ?? 'INVALID_RECORD_SHAPE',
      { ...opts.extra, requiredShape: shape }
    );
  }
}
