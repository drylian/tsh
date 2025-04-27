import { type TshOptions, type InferShapeType, type TshViewer } from '../types';
import { TshShapeError } from '../error';
import { AbstractShape } from './abstract-shape';

export class RecordShape<K extends string | number | symbol, V extends AbstractShape<any>>
  extends AbstractShape<Record<K, InferShapeType<V>>> {
    public readonly _type = "record";

    constructor(
      private readonly _keyShape: AbstractShape<K>,
      private readonly _valueShape: V
    ) {
      super();
    }
  
    getDefaults(): TshViewer<Record<K, InferShapeType<V>>> {
      if (typeof this._default !== 'undefined') {
        return this._default as never;
      }
  
      const result: Record<any, any> = {};
      const key: K = this._keyShape._default as K;
      let value: InferShapeType<V>;
  
      if (this._valueShape instanceof AbstractShape) {
        value = typeof this._valueShape._default !== 'undefined'
          ? this._valueShape._default
          : 'getDefaults' in this._valueShape
            ? (this._valueShape as any).getDefaults()
            : {} as InferShapeType<V>;
      } else {
        value = this._valueShape;
      }
  
      if (key) result[key] = value;
      return result as never;
    }
  
    //@ts-expect-error more declarations
    parse(value: unknown, opts?: TshOptions): InferShapeType<Record<K, InferShapeType<V>>> {
      // Early returns for default/optional/nullable cases
      if (typeof value === "undefined") {
        if (typeof this._default !== "undefined") return this._default as never;
        if (this._optional) return undefined as never;
      }
      if (value === null) {
        if (this._nullable) return null as never;
      }
  
      // Fast object check
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        this.createError((value: unknown) => ({
          code: opts?.code ?? 'NOT_OBJECT',
          message: opts?.message ?? 'Expected an object',
          value,
          shape: this as never,
          extra: { ...opts?.extra ?? {} },
        }), value);
      }
  
      const result: Record<any, any> = {};
      const input = value as Record<any, unknown>;
      const hasOwn = Object.prototype.hasOwnProperty;
      const keyShape = this._keyShape;
      const valueShape = this._valueShape;
      const currentKey = this._key;
  
      // Optimized for-in loop
      for (const key in input) {
        if (!hasOwn.call(input, key)) continue;
  
        try {
          const parsedKey = keyShape.parseWithPath(key, currentKey ? `${currentKey}[key]` : '[key]');
          result[parsedKey] = valueShape.parseWithPath(
            input[key],
            currentKey ? `${currentKey}.${String(key)}` : String(key)
          );
        } catch (error) {
          if (error instanceof TshShapeError) throw error;
          
          this.createError((value: unknown) => ({
            code: opts?.code ?? 'INVALID_PROPERTY',
            message: opts?.message ?? `Invalid property "${key}"`,
            value,
            shape: this as never,
            extra: { ...opts?.extra ?? {},   },
          }), input[key]);
        }
      }
  
      return this._operate(result) as never;
    }
  
  minProperties(min: number, opts: TshOptions = {}): this {
    return this.refine(
      (val) => Object.keys(val).length >= min,
      opts.message ?? `Record must have at least ${min} properties`,
      opts.code ?? 'TOO_FEW_PROPERTIES',
      { ...opts?.extra ?? {}, min },
    );
  }

  maxProperties(max: number, opts: TshOptions = {}): this {
    return this.refine(
      (val) => Object.keys(val).length <= max,
      opts.message ?? `Record must have at most ${max} properties`,
      opts.code ?? 'TOO_MANY_PROPERTIES',
      { ...opts?.extra ?? {}, max },
    );
  }

  exactProperties(count: number, opts: TshOptions = {}): this {
    return this.refine(
      (val) => Object.keys(val).length === count,
      opts.message ?? `Record must have exactly ${count} properties`,
      opts.code ?? 'INVALID_PROPERTY_COUNT',
      { ...opts?.extra ?? {}, count },
    );
  }

  hasProperty(key: K, opts: TshOptions = {}): this {
    return this.refine(
      (val) => key in val,
      opts.message ?? `Record must have property "${String(key)}"`,
      opts.code ?? 'MISSING_PROPERTY',
      { ...opts?.extra ?? {},   },
    );
  }

  forbiddenProperty(key: K, opts: TshOptions = {}): this {
    return this.refine(
      (val) => !(key in val),
      opts.message ?? `Record must not have property "${String(key)}"`,
      opts.code ?? 'FORBIDDEN_PROPERTY',
      { ...opts?.extra ?? {},   },
    );
  }

  propertyValue(key: K, validator: (value: InferShapeType<V>) => boolean, opts: TshOptions = {}): this {
    return this.refine(
      (val) => key in val && validator(val[key]),
      opts.message ?? `Property "${String(key)}" is invalid`,
      opts.code ?? 'INVALID_PROPERTY_VALUE',
      { ...opts?.extra ?? {},   },
    );
  }

  propertyShape(key: K, shape: AbstractShape<any>, opts: TshOptions = {}): this {
    return this.refine(
      (val) => key in val && shape.parse(val[key]) === val[key],
      opts.message ?? `Property "${String(key)}" has invalid shape`,
      opts.code ?? 'INVALID_PROPERTY_SHAPE',
      { ...opts?.extra ?? {},   },
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
      { ...opts?.extra ?? {} },
    );
  }

  propertyValues(validator: (value: InferShapeType<V>) => boolean, opts: TshOptions = {}): this {
    return this.refine(
      (val) => Object.values(val).every(validator as never),
      opts.message ?? 'Some property values are invalid',
      opts.code ?? 'INVALID_PROPERTY_VALUES',
      { ...opts?.extra ?? {} },
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
      { ...opts?.extra ?? {}, requiredShape: shape  },
    );
  }
}