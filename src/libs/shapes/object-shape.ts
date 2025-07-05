import { TshShapeError } from "../error";
import type { TshOptions, TshViewer, PrimitiveShapes, PartialObjShape, DeepPartialObjShape, InferShapeType, TshConfig } from "../types";
import { AbstractShape } from "./abstract-shape";

export class ObjectShape<T extends Record<string, PrimitiveShapes>> extends AbstractShape<InferShapeType<T>> {
    public readonly _type = 'object';
    public _minProperties?: number;
    public _maxProperties?: number;
    public _partial = false;
    private readonly _shape: T;

    constructor(_shape: T) {
    super({ primitiveFn: () => ({ success: true }) });
    this._shape = _shape;

    this._primitiveFn = (value) => {
      const isNullable = this._nullable;
      const isOptional = this._optional;
      const isPartial = this._partial;

      if (value === undefined) {
        return isOptional
          ? { success: true, value: this._default }
          : {
            success: false,
            error: new TshShapeError({
              code: 'REQUIRED',
              message: `Missing required value`,
              path: this._path,
              value,
              extra: {
                expectedType: 'object'
              }
            })
          };
      }

      if (value === null) {
        return isNullable
          ? { success: true, value: null }
          : {
            success: false,
            error: new TshShapeError({
              code: 'INVALID_TYPE',
              message: `Expected object, got null`,
              path: this._path,
              value,
              extra: {
                expectedType: 'object'
              }
            })
          };
      }

      if (typeof value !== 'object' || Array.isArray(value)) {
        return {
          success: false,
          error: new TshShapeError({
            code: 'INVALID_TYPE',
            message: `Expected object, got ${Array.isArray(value) ? 'array' : typeof value}`,
            path: this._path,
            value,
            extra: {
              expectedType: 'object'
            }
          })
        };
      }

      const input = value as Record<string, unknown>;
      const defaults = this.getDefaults();
      const result: Record<string, unknown> = {};
      const errors: TshShapeError[] = [];

      Object.keys(this._shape).forEach((key) => {
        const shape = this._shape[key];

        shape.withPath(key, () => {
          if (isPartial && !(key in input)) return;

          let val = input[key];

          if (val && typeof val === "object" && !Array.isArray(val) && defaults[key]) {
            val = { ...defaults[key], ...val };
          }

          if (val === undefined) {
            if (shape._optional) return;
            errors.push(new TshShapeError({
              code: 'REQUIRED',
              message: `Missing required value`,
              path: shape._path,
              value: val,
              extra:  {
                expectedType: shape._type
              }
            }));
            return;
          }

          if (val === null) {
            if (shape._nullable) {
              result[key] = null;
              return;
            }
            errors.push(new TshShapeError({
              code: 'INVALID_TYPE',
              message: `Expected ${shape._type}, got null`,
              path: shape._path,
              value: val,
              extra:  {
                expectedType: shape._type
              }
            }));
            return;
          }

          const parsed = shape instanceof AbstractShape
            ? shape.safeParse(val)
            : { success: val === shape, value: val };

          if (!parsed.success) {
            const error = parsed.error instanceof TshShapeError
              ? parsed.error
              : new TshShapeError({
                code: 'VALIDATION_ERROR',
                message: parsed.error?.message || `Invalid value`,
                path: shape._path,
                value: val,
                extra: {
                  expectedType: shape._type
                }
              });
            errors.push(error);
            return;
          }

          result[key] = parsed.value;
        });
      });

      if (errors.length > 0) {
        return {
          success: false,
          error: new TshShapeError({
            code: 'MULTIPLE_ERRORS',
            message: `Validation failed ${errors.map(a => a.message).join("\n")}`,
            path: this._path,
            details: errors,
            value
          })
        };
      }

      const resultKeys = Object.keys(result);
      const minProps = this._minProperties;
      const maxProps = this._maxProperties;

      if (minProps !== undefined && resultKeys.length < minProps) {
        return {
          success: false,
          error: new TshShapeError({
            code: 'MIN_PROPERTIES',
            message: `Must have at least ${minProps} properties`,
            path: this._path,
            value,
            min: minProps,
            actual: resultKeys.length
          })
        };
      }

      if (maxProps !== undefined && resultKeys.length > maxProps) {
        return {
          success: false,
          error: new TshShapeError({
            code: 'MAX_PROPERTIES',
            message: `Must have at most ${maxProps} properties`,
            path: this._path,
            value,
            max: maxProps,
            actual: resultKeys.length
          })
        };
      }

      return { success: true, value: result as InferShapeType<T> };
    };
  }

    default(value: InferShapeType<T>): this {
        const clone = this._clone();
        clone._default = value as never;
        return clone as never;
    }


    private copyMetadata<U extends AbstractShape<any>>(newShape: U): U {
        const exclude = ['_type', '_shape'];
        const keys = Object.keys(this) as (keyof this)[];

        for (const key of keys) {
            if (key === '_default') {
                newShape.default(this._default);
            } else if (!exclude.includes(key as string) && key in newShape) {
                const value = this[key];
                if (typeof value !== "function") {
                    (newShape as any)[key] = value;
                }
            }
        }

        return newShape;
    }

    getDefaults(): InferShapeType<T> {
        const result: Record<string, unknown> = {};
        const keys = Object.keys(this._shape) as (keyof T)[];

        for (const key of keys) {
            const shape = this._shape[key] as AbstractShape<any> | object;

            if (shape instanceof AbstractShape) {
                if (typeof shape._default !== "undefined") {
                    result[key as string] = shape._default;
                } else if (shape instanceof ObjectShape) {
                    const nestedDefaults = shape.getDefaults();
                    if (Object.keys(nestedDefaults).length > 0) {
                        result[key as string] = nestedDefaults;
                    }
                }
            } else {
                result[key as string] = shape;
            }
        }

        if (this._default) {
            return { ...result, ...this._default };
        }

        return result as InferShapeType<T>;
    }

    partial(): ObjectShape<PartialObjShape<T>> {
        const extended = Object.keys(this._shape).reduce((acc, key) => {
            const shape = this._shape[key];
            return {
                ...acc,
                [key]: shape instanceof AbstractShape ? shape.optional() : shape,
            };
        }, {} as PartialObjShape<T>);

        const clone = new ObjectShape(extended as never);
        clone._partial = true;
        return this.copyMetadata(clone as any);
    }

    deepPartial(): ObjectShape<DeepPartialObjShape<T>> {
        const extended = Object.keys(this._shape).reduce((acc, key) => {
            const shape = this._shape[key];
            let value;

            if (shape instanceof ObjectShape) {
                value = shape.deepPartial();
            } else if (shape instanceof AbstractShape) {
                value = shape.optional();
            } else {
                value = shape;
            }

            return { ...acc, [key]: value };
        }, {} as DeepPartialObjShape<T>);

        const clone = new ObjectShape(extended as never);
        clone._partial = true;
        return this.copyMetadata(clone as any);
    }

    merge<U extends Record<string, PrimitiveShapes>>(shape: ObjectShape<U>): ObjectShape<T & U> {
        const newShape = { ...this._shape } as Record<string, PrimitiveShapes>;

        for (const key in shape._shape) {
            newShape[key] = shape._shape[key];
        }

        const clone = new ObjectShape(newShape as T & U);
        return this.copyMetadata(clone as any);
    }

    pick<K extends keyof T>(keys: K[]): ObjectShape<Pick<T, K>> {
        const newShape = {} as Record<string, PrimitiveShapes>;

        for (const key of keys) {
            newShape[key as string] = this._shape[key];
        }

        const clone = new ObjectShape(newShape as Pick<T, K>);
        return this.copyMetadata(clone as any);
    }

    omit<K extends keyof T>(keys: K[]): ObjectShape<Omit<T, K>> {
        const newShape = {} as Record<string, PrimitiveShapes>;

        for (const key in this._shape) {
            if (!keys.includes(key as any)) {
                newShape[key] = this._shape[key];
            }
        }

        const clone = new ObjectShape(newShape as Omit<T, K>);
        return this.copyMetadata(clone as any);
    }

    hasProperty<K extends keyof T>(key: K, opts: TshOptions = {}): this {
        return this.refine(
            (val) => key in val,
            opts.message ?? `Missing property "${String(key)}"`,
            opts.code ?? 'MISSING_PROPERTY',
            { ...opts?.extra ?? {}, property: key }
        );
    }

    forbiddenProperty<K extends keyof T>(key: K, opts: TshOptions = {}): this {
        return this.refine(
            (val) => !(key in val),
            opts.message ?? `Forbidden property "${String(key)}"`,
            opts.code ?? 'FORBIDDEN_PROPERTY',
            { ...opts?.extra ?? {}, property: key }
        );
    }

    exactProperties(count: number, opts: TshOptions = {}): this {
        return this.refine(
            (val) => Object.keys(val).length === count,
            opts.message ?? `Must have exactly ${count} properties`,
            opts.code ?? 'INVALID_PROPERTY_COUNT',
            { ...opts?.extra ?? {}, count }
        );
    }

    minProperties(min: number): this {
        const clone = this._clone();
        clone._minProperties = min;
        return clone;
    }

    maxProperties(max: number): this {
        const clone = this._clone();
        clone._maxProperties = max;
        return clone;
    }

    propertyValue<K extends keyof T>(
        key: K,
        validator: (value: any) => boolean,
        opts: TshOptions = {}
    ): this {
        return this.refine(
            (val) => key in val && validator(val[key]),
            opts.message ?? `Invalid value for property "${String(key)}"`,
            opts.code ?? 'INVALID_PROPERTY_VALUE',
            { ...opts?.extra ?? {}, property: key }
        );
    }

    nonEmpty(): this {
        return this.minProperties(1);
    }

    conf(): TshViewer<TshConfig<this>> {
        const config: any = {
            type: this._type,
            shape: {} as Record<string, unknown>
        };

        for (const key in this._shape) {
            const shape = this._shape[key] as AbstractShape<any>;
            config.shape[key] = shape instanceof AbstractShape ? shape.conf() : shape;
        }

        Object.keys(this).forEach((key) => {
            if (typeof (this as any)[key] === 'function' || key.startsWith('__') || key === '_shape') return;
            const exposedKey = key.startsWith('_') ? key.substring(1) : key;
            config[exposedKey] = (this as any)[key];
        });

        return config as never;
    }
}