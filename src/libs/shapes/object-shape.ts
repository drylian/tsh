import { TshShapeError } from "../error";
import type { TshOptions, TshViewer, PrimitiveShapes, PartialObjShape, DeepPartialObjShape, InferShapeType } from "../types";
import { AbstractShape } from "./abstract-shape";

export class ObjectShape<T extends Record<string, PrimitiveShapes>> extends AbstractShape<InferShapeType<T>> {
    public readonly _type = 'object';
    public _minProperties?: number;
    public _maxProperties?: number;
    public _partial = false;
    private readonly _shape: T;

    constructor(_shape: T) {
        super();
        this._shape = _shape;
    }

    private copyMetadata<U extends AbstractShape<any>>(newShape: U): U {
        const exclude = ['_type', '_shape'];
        const keys = Object.keys(this) as (keyof this)[];
        let ckey: keyof this | undefined = keys[0];

        while (ckey) {
            if (
                !exclude.includes(ckey as string) &&
                ckey in newShape
            ) {
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
        const result: Record<string, unknown> = this._default as any ?? {};
        const keys = Object.keys(this._shape) as (keyof T)[];
        let ckey: keyof T | undefined = keys[0];

        while (ckey) {
            const shape = this._shape[ckey];
            if (shape instanceof ObjectShape) {
                const resulted = shape.getDefaults();
                if (Object.keys(resulted).length > 0) result[ckey as string] = resulted;
            } else if (shape instanceof AbstractShape) {
                if (typeof shape._default !== "undefined") result[ckey as string] = shape._default;
            } else {
                result[ckey as string] = shape;
            }

            ckey = keys[keys.indexOf(ckey) + 1];
        }


        return result as InferShapeType<T>;
    }

    parse(
        value: unknown,
        rootpath: string = "",
    ): InferShapeType<T> {
        const defaults = this.getDefaults();
        const input = value as Record<string, unknown>;
        const hasOwn = Object.prototype.hasOwnProperty;
        const isPartial = this._partial;
        const isOptional = this._optional;
        const isNullable = this._nullable;

        if (typeof value === "undefined") {
            if (isOptional) return undefined as never;
        }

        if (value === null) {
            if (isNullable) return null as never;
        }

        this._key = rootpath;
        if (typeof input !== 'object' || input === null || Array.isArray(value)) {
            throw new TshShapeError({
                code: 'NOT_OBJECT',
                message: 'Expected object',
                value: input,
                shape: this as any,
            });
        }

        const result: Record<string, unknown> = defaults as Record<string, unknown>;
        const errors: TshShapeError[] = [];
        const keys = Object.keys(this._shape);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const shape = this._shape[key];
            shape._key = this._key ? `${this._key}.${key}` : key;

            if (isPartial && !(key in input)) continue;

            const value = hasOwn.call(input, key) ? input[key] : defaults[key as keyof typeof defaults];

            if (typeof value === "undefined") {
                if (shape._optional) continue;
                errors.push(new TshShapeError({
                    code: "MISSING_PROPERTY",
                    message: `Missing required property "${shape._key}"`,
                    value: undefined,
                    shape: shape,
                }));
                continue;
            }

            if (value === null) {
                if (shape._nullable) {
                    result[key] = null;
                    continue;
                }
                errors.push(new TshShapeError({
                    code: "NULL_VALUE",
                    message: `Property "${shape._key}" cannot be null`,
                    value: null,
                    shape: shape,
                }));
                continue;
            }

            try {
                const sresult = shape instanceof AbstractShape
                    //@ts-expect-error more declarations
                    ? shape.parse(value, shape._key)
                    : value === shape ? value : (() => {
                        throw new TshShapeError({
                            code: 'INVALID_LITERAL',
                            message: `Expected literal: ${JSON.stringify(shape)}`,
                            value,
                            shape: shape,
                        });
                    })();
                result[key] = sresult;
            } catch (err) {
                if (err instanceof AggregateError) {
                    errors.push(...err.errors);
                } else if (err instanceof TshShapeError) {
                    errors.push(err);
                } else {
                    errors.push(new TshShapeError({
                        code: 'INVALID_PROPERTY',
                        message: `Invalid property "${key}"`,
                        value,
                        shape: shape,
                    }));
                }
            }
        }

        if (Object.keys(result).length === 0 && this._default !== undefined) {
            return { ...defaults, ...this._default } as never;
        }

        const resultKeys = Object.keys(result);
        const minProps = this._minProperties;
        if (minProps !== undefined && resultKeys.length < minProps) {
            throw new TshShapeError({
                code: 'TOO_FEW_PROPERTIES',
                message: `Object must have at least ${minProps} properties`,
                value,
                shape: this as never,
            });
        }

        const maxProps = this._maxProperties;
        if (maxProps !== undefined && resultKeys.length > maxProps) {
            throw new TshShapeError({
                code: 'TOO_MANY_PROPERTIES',
                message: `Object must have at most ${maxProps} properties`,
                value,
                shape: this as never,
            });
        }

        if (errors.length > 0) {
            throw errors.length === 1 ? errors[0] : new AggregateError(errors, 'Multiple validation errors');
        }

        return this._operate(result) as never;
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
}