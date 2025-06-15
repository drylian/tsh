import { TshShapeError } from "../error";
import type { TshOptions, TshViewer, PrimitiveShapes, PartialObjShape, DeepPartialObjShape, InferShapeType } from "../types";
import { AbstractShape } from "./abstract-shape";

export class ObjectShape<T extends Record<string, PrimitiveShapes>> extends AbstractShape<InferShapeType<T>> {
    public readonly _type = 'object';
    public _minProperties?: number;
    public _maxProperties?: number;
    public _partial = false;
    private readonly _shape: T;

    default(value: InferShapeType<T>): this {
        const clone = new ObjectShape(this._shape);
        clone._default = value as never;
        return clone as never;
    }

    constructor(_shape: T) {
        super({
            sync: (value) => {
              const isNullable = this._nullable;
              const isOptional = this._optional;
              const isPartial = this._partial;
          
              if (value === undefined) {
                return isOptional
                  ? { success: true, value: this._default }
                  : {
                      success: false,
                      error: new Error(`${this._key || 'root'} - Value is required`),
                      errors: [new Error(`${this._key || 'root'} - Value is required`)],
                    };
              }
          
              if (value === null) {
                return isNullable
                  ? { success: true, value: null }
                  : {
                      success: false,
                      error: new Error(`${this._key || 'root'} - Value cannot be null`),
                      errors: [new Error(`${this._key || 'root'} - Value cannot be null`)],
                    };
              }
          
              if (typeof value !== 'object' || Array.isArray(value) || value === null) {
                return {
                  success: false,
                  error: new Error(`${this._key || 'root'} - Expected object`),
                  errors: [new Error(`${this._key || 'root'} - Expected object`)],
                };
              }
          
              const input = value as Record<string, unknown>;
              const defaults = this.getDefaults();
              const result: Record<string, unknown> = {};
              const errors: Error[] = [];
          
              Object.keys(this._shape).forEach((key) => {
                const shape = this._shape[key];
                const path = this._key ? `${this._key}.${key}` : key;
                shape._key = path;
          
                if (isPartial && !(key in input)) return;
          
                let val = input[key];
          
                if (val && typeof val === "object" && !Array.isArray(val) && defaults[key]) {
                  val = { ...defaults[key], ...val };
                }
          
                if (val === undefined) {
                  if (shape._optional) return;
                  errors.push(new Error(`${path} - Missing required value for`));
                  return;
                }
          
                if (val === null) {
                  if (shape._nullable) {
                    result[key] = null;
                    return;
                  }
                  errors.push(new Error(`${path} - Cannot be null`));
                  return;
                }
          
                const parsed = shape instanceof AbstractShape
                  ? shape.withPath(path, () => shape.safeParse(val))
                  : { success: val === shape, value: val };
          
                if (!parsed.success) {
                  errors.push(new Error(`${path} - ${parsed.error?.message ?? 'Invalid value'}`));
                  return;
                }
          
                result[key] = parsed.value;
              });
          
              if (errors.length > 0) {
                const aggregate = new AggregateError(errors, `${this._key || 'root'} - Multiple validation errors`);
                return { success: false, error: aggregate, errors };
              }
          
              const resultKeys = Object.keys(result);
              const minProps = this._minProperties;
              const maxProps = this._maxProperties;
          
              if (minProps !== undefined && resultKeys.length < minProps) {
                const e = new Error(`${this._key || 'root'} - Object must have at least ${minProps} properties`);
                return { success: false, error: e, errors: [e] };
              }
          
              if (maxProps !== undefined && resultKeys.length > maxProps) {
                const e = new Error(`${this._key || 'root'} - Object must have at most ${maxProps} properties`);
                return { success: false, error: e, errors: [e] };
              }
          
              return { success: true, value: result as InferShapeType<T> };
            }
          });
          

        this._shape = _shape;
    }

    private copyMetadata<U extends AbstractShape<any>>(newShape: U): U {
        const exclude = ['_type', '_shape'];
        const keys = Object.keys(this) as (keyof this)[];
        let ckey: keyof this | undefined = keys[0];

        while (ckey) {
            if (ckey == '_default') {
                newShape.default(this._default);
            } else if (!exclude.includes(ckey as string) && ckey in newShape) {
                const value = this[ckey];
                if (typeof value !== "function") {
                    (newShape as any)[ckey] = value;
                }
            }
            ckey = keys[keys.indexOf(ckey) + 1];
        }

        return newShape;
    }

    getDefaults(): InferShapeType<T> {
        const result: Record<string, unknown> = {};
        const keys = Object.keys(this._shape) as (keyof T)[];

        for (const key of keys) {
            const shape = this._shape[key];

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
                // Para shapes primitivos (não AbstractShape)
                result[key as string] = shape;
            }
        }

        // Se houver um default no próprio ObjectShape, mesclar com os defaults das propriedades
        if (this._default) {
            return { ...result, ...this._default };
        }

        return result as InferShapeType<T>;
    }

    //@ts-expect-error recursive ignore
    partial(): ObjectShape<PartialObjShape<T>> {
        this._partial = true;
        const extended = Object.keys(this._shape).reduce((acc, key) => {
            const shape = this._shape[key];
            return {
                ...acc,
                [key]: shape instanceof AbstractShape ? shape.optional() : shape,
            };
        }, {} as PartialObjShape<T>);

        return this.copyMetadata(new ObjectShape(extended as never)) as never;
    }

    //@ts-expect-error recursive
    deepPartial(): ObjectShape<DeepPartialObjShape<T>> {
        this._partial = true;
        const extended = Object.keys(this._shape).reduce((acc, key) => {
            const shape = this._shape[key];
            let value;

            if (shape instanceof ObjectShape) {
                value = shape.partial();
            } else if (shape instanceof AbstractShape) {
                value = shape.optional();
            } else {
                value = shape;
            }

            return { ...acc, [key]: value };
        }, {} as DeepPartialObjShape<T>);

        return this.copyMetadata(new ObjectShape(extended as never)) as never;
    }

    merge<U extends Record<string, PrimitiveShapes>>(shape: ObjectShape<U>): ObjectShape<T & U> {
        const newShape = {} as Record<string, PrimitiveShapes>;

        const this_keys = Object.keys(this._shape) as (keyof T)[];
        let ckey: keyof T | undefined = this_keys[0] as string;
        while (ckey) {
            newShape[ckey as string] = this._shape[ckey];
            ckey = this_keys[this_keys.indexOf(ckey) + 1];
        }

        const mergeKeys = Object.keys(shape._shape) as (keyof U)[];
        ckey = mergeKeys[0] as keyof T;
        while (ckey) {
            newShape[ckey as string] = shape._shape[ckey];
            ckey = mergeKeys[mergeKeys.indexOf(ckey as string) + 1] as keyof T;
        }

        const clone = new ObjectShape(newShape as T & U);
        return this.copyMetadata(clone);
    }


    pick<K extends keyof T>(keys: K[]): ObjectShape<Pick<T, K>> {
        const newShape = {} as Record<string, PrimitiveShapes>;
        let ckey: K | undefined = keys[0];
        let i = 0;

        while (ckey) {
            newShape[ckey as string] = this._shape[ckey];
            i++;
            ckey = keys[i];
        }

        const clone = new ObjectShape(newShape as Pick<T, K>);
        return this.copyMetadata(clone);
    }

    omit<K extends keyof T>(keys: K[]): ObjectShape<Omit<T, K>> {
        const newShape = {} as Record<string, PrimitiveShapes>;
        const this_keys = Object.keys(this._shape) as (keyof T)[];
        let ckey: keyof T | undefined = this_keys[0];

        while (ckey) {
            if (!keys.includes(ckey as K)) {
                newShape[ckey as string] = this._shape[ckey];
            }
            ckey = this_keys[this_keys.indexOf(ckey) + 1];
        }

        const clone = new ObjectShape(newShape as Omit<T, K>);
        return this.copyMetadata(clone);
    }

    hasProperty<K extends keyof T>(key: K, opts: TshOptions = {}): this {
        return this.refine(
            (val) => key in val,
            opts.message ?? `Object must have property "${String(key)}"`,
            opts.code ?? 'MISSING_PROPERTY',
            { ...opts?.extra ?? {} },
        );
    }

    forbiddenProperty<K extends keyof T>(key: K, opts: TshOptions = {}): this {
        return this.refine(
            (val) => !(key in val),
            opts.message ?? `Object must not have property "${String(key)}"`,
            opts.code ?? 'FORBIDDEN_PROPERTY',
            { ...opts?.extra ?? {} },
        );
    }

    exactProperties(count: number, opts: TshOptions = {}): this {
        return this.refine(
            (val) => Object.keys(val).length === count,
            opts.message ?? `Object must have exactly ${count} properties`,
            opts.code ?? 'INVALID_PROPERTY_COUNT',
            { ...opts?.extra ?? {}, count },
        );
    }

    minProperties(min: number): this {
        this._minProperties = min;
        this.partial();
        return this;
    }

    maxProperties(max: number): this {
        this._maxProperties = max;
        this.partial();
        return this;
    }

    propertyValue<K extends keyof T>(
        key: K,
        validator: (value: any) => boolean,
        opts: TshOptions = {}
    ): this {
        return this.refine(
            (val) => key in val && validator(val[key as never] as never),
            opts.message ?? `Property "${String(key)}" is invalid`,
            opts.code ?? 'INVALID_PROPERTY_VALUE',
            { ...opts?.extra ?? {} },
        );
    }

    nonEmpty(): this {
        return this.minProperties(1);
    }

    private _createAggregatedError(errors: TshShapeError[], value: unknown) {
        return new AggregateError(errors, errors.map((err) => `${err.path} - ${err.message}`).join(", "));
    }

}