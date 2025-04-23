import { TshShapeError } from '../error';
import type { TshOptions, TshViewer, TshConfig } from '../types';

export abstract class AbstractShape<T> {
    readonly _type: string = "abstract";
    public defKey() { return this._type };
    public _default?: T;
    public _pretransforms: any[] = [];
    public _key = this.defKey();  
    public _important = false;
    public _save_default = false;
    public _optional = false;
    public _nullable = false;
    public _commit?: string;

    protected _operations: Array<
        | {
            type: 'transform';
            fn: (value: any) => any;
            message: string;
            code?: string;
            extra?: object;
            opts?: TshOptions;
        }
        | {
            type: 'refine';
            fn: (value: any) => boolean;
            message: string;
            code?: string;
            extra?: object;
            opts?: TshOptions;
        }
    > = [];

    abstract parse(value: unknown): T;

    public safeParse(value: unknown): { value: T, success: boolean, error: TshShapeError | undefined } {
        try {
            const result = this.parse(value);
            return {
                value: result,
                success: true,
                error: undefined
            };
        } catch (e) {
            return {
                success: false,
                value: undefined as T,
                error: e as TshShapeError
            };
        }
    }

    default(value: T): this {
        if (this._operations.length === 0 || this._operations.every(op => op.type !== 'transform')) {
            this._default = value;
        } else {
            this._pretransforms.push(value);
        }
        return this;
    }

    important(): this {
        this._important = true;
        return this;
    }

    optional(): AbstractShape<T | undefined> & Omit<this, keyof AbstractShape<any>> {
        this._optional = true;
        return this as never;
    }

    nullable(): AbstractShape<T | undefined> & Omit<this, keyof AbstractShape<any>> {
        this._nullable = true;
        return this as never;
    }

    transform<U>(
        fn: (value: T) => U,
        opts: TshOptions = {}
    ): AbstractShape<T | undefined> & Omit<this, keyof AbstractShape<any>> {
        const newShape = this._clone();

        newShape._operations.unshift({
            type: 'transform',
            fn: fn as any,
            message: opts.message ?? "Invalid transform",
            code: opts.code ?? 'TRANSFORM_ERROR',
            extra: {
                ...opts?.extra,
            },
            opts
        });

        newShape._pretransforms = [...this._pretransforms];

        return newShape as never;
    }

    refine(
        predicate: (value: T) => boolean,
        message: string,
        code: string = 'VALIDATION_ERROR',
        extra?: Record<string, unknown>,
        opts?: TshOptions
    ): this {
        this._operations.push({
            type: 'refine',
            fn: predicate as any,
            message: opts?.message ?? message,
            code: opts?.code ?? code,
            extra: opts?.extra ?? extra,
            opts
        });
        return this;
    }

    commit(commit: string): this {
        this._commit = commit;
        return this;
    }

    protected _clone(): this {
        const clone = Object.create(Object.getPrototypeOf(this));
        Object.assign(clone, this);
        clone._operations = [...this._operations];
        clone._pretransforms = [...this._pretransforms];
        return clone;
    }

    protected _operate(value: any): any {
        let currentValue = value;

        for (const op of this._operations) {
            const op_opts = op.opts;

            if (op.type === 'transform') {
                try {
                    currentValue = op.fn(currentValue);
                } catch (e) {
                    const err = e as Error | string;
                    throw new TshShapeError({
                        code: op_opts?.code ?? op.code ?? (typeof err == "object" ? (err as Error).name : 'TRANSFORM_ERROR'),
                        message: op_opts?.message ?? op.message ?? (typeof err == "string" ? err as string : err.message),
                        value: currentValue,
                        shape:this,
                        extra: {
                            ...op.extra ?? {},
                            ...op_opts?.extra ?? {}
                        }
                    });
                }
            } else if (op.type === 'refine') {
                if (!op.fn(currentValue)) {
                    throw new TshShapeError({
                        code: op_opts?.code ?? op.code ?? 'VALIDATION_ERROR',
                        message: op_opts?.message ?? op.message,
                        value: currentValue,
                        shape:this,
                        extra: {
                            ...op.extra ?? {},
                            ...op_opts?.extra ?? {}
                        }
                    });
                }
            }
        }

        // reset key to common key
        this.defKey();
        return currentValue;
    }

    public conf(): TshViewer<TshConfig<this>> {
        const config = {} as TshConfig<this>;

        for (const key in this) {
            if (!this.hasOwnProperty(key)) continue;
            if (typeof this[key] === 'function' || key.startsWith('__')) continue;
            const ckey = key.startsWith('_') ? key.substring(1) : key;
            config[ckey as never] = this[key as never];
        }

        return config as never;
    }
}