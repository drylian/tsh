import { TshShapeError, type ErrorCreator } from "../error";
import type { TshOptions, TshOperation, TshViewer, TshConfig } from "../types";

type OperationChain = {
    first: TshOperation<any> | null;
    last: TshOperation<any> | null;
};

type AnyFnCallback =
    | { success: boolean; error?: TshShapeError }
    | Promise<{ success: boolean; error?: TshShapeError }>;

export class AbstractShape<T> {
    protected _primitiveFn?: (value: unknown) => AnyFnCallback;
    protected _primitiveSyncFn?: (value: unknown) => Exclude<AnyFnCallback, Promise<any>>;
    protected _coerceFn?: (value: unknown) => unknown;
    public _default?: T;
    public _type: string;
    public _key: string;
    public _optional = false;
    public _nullable = false;
    public _commit?: string;
    public _operations: OperationChain = { first: null, last: null };
    public _path: string[] = [];

    constructor(validators?: {
        primitiveFn?: (value: unknown) => AnyFnCallback;
        primitiveSyncFn?: (value: unknown) => Exclude<AnyFnCallback, Promise<any>>;
        coerceFn?: (value: unknown) => unknown;
        type?: string;
    }) {
        this._primitiveFn = validators?.primitiveFn;
        this._primitiveSyncFn = validators?.primitiveSyncFn;
        this._coerceFn = validators?.coerceFn;
        this._type = validators?.type ?? "abstract";
        this._key = this.defKey();
        this._path = [this._key];
    }

    defKey(): string {
        return this._type;
    }

    // === Public APIs ===

    public parse(value: unknown): T {
        try {
            return this._pipelineSync(value);
        } catch (error) {
            throw this._enhanceError(error as TshShapeError);
        }
    }

    public async parseAsync(value: unknown): Promise<T> {
        try {
            return await this._pipelineAsync(value);
        } catch (error) {
            throw this._enhanceError(error as TshShapeError);
        }
    }

    public safeParse(value: unknown) {
        try {
            const data = this._pipelineSync(value);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: this._enhanceError(error as TshShapeError) };
        }
    }

    public async safeParseAsync(value: unknown) {
        try {
            const data = await this._pipelineAsync(value);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: this._enhanceError(error as TshShapeError) };
        }
    }

    // === Pipelines ===

    private _pipelineSync(value: unknown): T {
        const errors = this._validateBasicConstraints(value);
        if (errors.length > 0) {
            this._throwCollectedErrors(errors);
        }

        let finalValue = this._coerceFn ? this._coerceFn(value) : value;
        if (finalValue === undefined) {
            if (this._optional) return this._mergeWithDefault(undefined);
            throw this._createMissingError(finalValue);
        }
        if (finalValue === null && this._nullable) return this._mergeWithDefault(null);
        if (this._primitiveSyncFn) {
            const result = this._primitiveSyncFn(finalValue);
            if (!result.success && result.error) {
                throw result.error;
            }
        } else if (this._primitiveFn) {
            const result = this._primitiveFn(finalValue);
            if (result instanceof Promise) {
                throw new TshShapeError({
                    code: "SYNC_ASYNC_MISMATCH",
                    message: "Async primitiveFn used inside parse()",
                    path: this._path,
                });
            }
            if (!result.success && result.error) {
                throw result.error;
            }
        }

        let currentValue = finalValue;
        let op: TshOperation<any> | null | undefined = this._operations.first;

        while (op) {
            try {
                switch (op.type) {
                    case "transform":
                        currentValue = op.fn(currentValue);
                        break;
                    case "refine":
                        if (!op.fn(currentValue)) {
                            throw new TshShapeError(this._createOperationError(op, currentValue));
                        }
                        break;
                    case "transformAsync":
                    case "refineAsync":
                        throw new TshShapeError({
                            code: "SYNC_ASYNC_MISMATCH",
                            message: `Cannot run async operation '${op.type}' in parse()`,
                            path: this._path,
                        });
                }
            } catch (error) {
                throw this._enhanceError(error as TshShapeError);
            }
            op = op.next;
        }
        if (currentValue === undefined) {
            if (this._optional) return this._mergeWithDefault(undefined);
            throw this._createMissingError(currentValue);
        }
        if (currentValue === null && this._nullable) return this._mergeWithDefault(null);
        return this._mergeWithDefault(currentValue);
    }

    private async _pipelineAsync(value: unknown): Promise<T> {
        const errors = this._validateBasicConstraints(value);
        if (errors.length > 0) {
            this._throwCollectedErrors(errors);
        }

        let finalValue = this._coerceFn ? this._coerceFn(value) : value;

        if (this._primitiveFn) {
            const result = this._primitiveFn(finalValue);
            const awaited = result instanceof Promise ? await result : result;
            if (!awaited.success && awaited.error) {
                throw awaited.error;
            }
        }

        let currentValue = finalValue;
        let op: TshOperation<any> | null | undefined = this._operations.first;

        while (op) {
            try {
                switch (op.type) {
                    case "transform":
                        currentValue = op.fn(currentValue);
                        break;
                    case "refine":
                        if (!op.fn(currentValue)) {
                            throw new TshShapeError(this._createOperationError(op, currentValue));
                        }
                        break;
                    case "transformAsync":
                        currentValue = await op.fn(currentValue);
                        break;
                    case "refineAsync":
                        if (!(await op.fn(currentValue))) {
                            throw new TshShapeError(this._createOperationError(op, currentValue));
                        }
                        break;
                }
            } catch (error) {
                throw this._enhanceError(error as TshShapeError);
            }
            op = op.next;
        }
        if (currentValue === undefined) {
            if (this._optional) return this._mergeWithDefault(undefined);
            throw this._createMissingError(currentValue);
        }
        if (currentValue === null && this._nullable) return this._mergeWithDefault(null);
        return this._mergeWithDefault(currentValue);
    }

    private _validateBasicConstraints(value: unknown): TshShapeError[] {
        const errors: TshShapeError[] = [];

        if (value === undefined && !this._optional && this._default === undefined) {
            errors.push(this._createMissingError(value));
        }

        if (value === null && !this._nullable) {
            errors.push(this._createMissingError(value));
        }

        return errors;
    }

    private _throwCollectedErrors(errors: TshShapeError[]) {
        if (errors.length === 1) {
            throw errors[0];
        }
        if (errors.length > 1) {
            throw new TshShapeError({
                code: "MULTIPLE_ERRORS",
                message: `Multiple validation errors for "${this._path.join('.')}"`,
                details: errors,
                path: [...this._path],
                shape: this,
            });
        }
    }

    private _mergeWithDefault(value: unknown): T {
        if (this._default === undefined) return value as T;
        if (value === undefined) return this._default as T;

        if (Array.isArray(this._default) && Array.isArray(value)) {
            return [...this._default, ...value] as T;
        }

        if (typeof this._default === 'object' && this._default !== null &&
            typeof value === 'object' && value !== null) {
            return { ...this._default, ...value } as T;
        }

        return value as T;
    }


    // === Modifiers ===

    public default(value: T): this {
        const clone = this._clone();
        clone._default = value;
        return clone;
    }

    public optional(): AbstractShape<T | undefined> {
        const clone = this._clone();
        clone._optional = true;
        return clone as never;
    }

    public nullable(): AbstractShape<T | null> {
        const clone = this._clone();
        clone._nullable = true;
        return clone as never;
    }

    public transform<U>(fn: (value: T) => U, opts: TshOptions = {}): AbstractShape<U> {
        return this._addOperation({
            type: "transform",
            fn,
            message: opts.message ?? "Invalid transform",
            code: opts.code ?? "TRANSFORM_ERROR",
            extra: opts.extra,
            opts,
        }) as never;
    }

    public transformAsync<U>(fn: (value: T) => Promise<U>, opts: TshOptions = {}): AbstractShape<U> {
        return this._addOperation({
            type: "transformAsync",
            fn,
            message: opts.message ?? "Invalid async transform",
            code: opts.code ?? "ASYNC_TRANSFORM_ERROR",
            extra: opts.extra,
            opts,
        }) as never;
    }

    public refine(
        predicate: (value: T) => boolean,
        message: string,
        code: string = "VALIDATION_ERROR",
        extra?: object,
        opts?: TshOptions
    ): this {
        return this._addOperation({
            type: "refine",
            fn: predicate,
            message: opts?.message ?? message,
            code: opts?.code ?? code,
            extra: opts?.extra ?? extra,
            opts,
        });
    }

    public refineAsync(
        predicate: (value: T) => Promise<boolean>,
        message: string,
        code: string = "ASYNC_VALIDATION_ERROR",
        extra?: Record<string, unknown>,
        opts?: TshOptions
    ): this {
        return this._addOperation({
            type: "refineAsync",
            fn: predicate,
            message: opts?.message ?? message,
            code: opts?.code ?? code,
            extra: opts?.extra ?? extra,
            opts,
        });
    }

    public commit(commit: string): this {
        const clone = this._clone();
        clone._commit = commit;
        return clone;
    }

    public conf(): TshViewer<TshConfig<this>> {
        const config: any = {};
        Object.keys(this).forEach((key) => {
            if (typeof (this as any)[key] === "function" || key.startsWith("__")) return;
            const exposedKey = key.startsWith("_") ? key.substring(1) : key;
            config[exposedKey] = (this as any)[key];
        });
        return config as never;
    }

    // === Internals ===

    protected _addOperation(op: TshOperation<any>): this {
        const clone = this._clone();
        const newOp = { ...op };

        if (!clone._operations.first) {
            clone._operations = { first: newOp, last: newOp };
        } else {
            const newOperations = { ...clone._operations };
            newOperations.last!.next = newOp;
            newOperations.last = newOp;
            clone._operations = newOperations;
        }

        return clone;
    }

    protected _clone(): this {
        const clone = Object.create(Object.getPrototypeOf(this)) as this;
        Object.assign(clone, this);

        clone._operations = { ...this._operations };
        clone._path = [...this._path];

        return clone;
    }

    protected _createMissingError(value: unknown): TshShapeError {
        return new TshShapeError({
            code: "REQUIRED",
            message: `Missing required value for "${this._path.join('.')}"`,
            value,
            shape: this,
            path: [...this._path],
        });
    }

    protected _createOperationError(op: TshOperation<any>, value: any) {
        const opts = op.opts;
        return {
            code: opts?.code ?? op.code ?? "VALIDATION_ERROR",
            message: opts?.message ?? op.message ?? `Validation failed for "${this._path.join('.')}"`,
            value,
            path: [...this._path],
            extra: { ...(op.extra ?? {}), ...(opts?.extra ?? {}) },
            shape: this,
        };
    }

    protected _enhanceError(error: TshShapeError): TshShapeError {
        error.path = [...this._path, ...(error.path ?? [])];
        error.message = `${this._path.join('.')} - ${error.message}`;
        return error;
    }

    public withPath<Related extends () => any>(subkey: string, cb: Related) {
        const prevPath = [...this._path];
        this._path.push(subkey);

        try {
            const result = cb();
            if (result instanceof Promise) {
                return result.finally(() => {
                    this._path = prevPath;
                }) as ReturnType<Related>;
            }
            return result;
        } finally {
            this._path = prevPath;
        }
    }

    protected createError(creator: ErrorCreator, value: unknown, opts?: TshOptions): never {
        const data = creator(value);
        throw new TshShapeError({
            ...data,
            code: opts?.code ?? data.code,
            message: opts?.message ?? data.message,
            shape: data.shape ?? this,
            path: [...this._path],
            extra: { ...(data.extra ?? {}), ...(opts?.extra ?? {}) },
        });
    }
}