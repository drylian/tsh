import { TshShapeError, type ErrorCreator } from "../error";
import type { TshOptions, TshViewer, TshConfig, TshOperation } from "../types";

type OperationChain = {
  first: TshOperation<any> | null;
  last: TshOperation<any> | null;
};

export class AbstractShape<T> {
  readonly _type: string = "abstract";
  protected _shapeValidator?: (value: unknown) => { success: boolean; error?: TshShapeError };
  protected _asyncShapeValidator?: (value: unknown) => Promise<{ success: boolean; error?: TshShapeError }>;
  protected _coerceFn?: (value: unknown) => unknown;
  public _default?: T;
  public _key: string;
  public _optional = false;
  public _nullable = false;
  public _commit?: string;
  public _operations: OperationChain = { first: null, last: null };

  constructor(validators?: {
    sync?: (value: unknown) => { success: boolean; error?: TshShapeError };
    async?: (value: unknown) => Promise<{ success: boolean; error?: TshShapeError }>;
    coerceFn?: (value: unknown) => unknown;
  }) {
    this._shapeValidator = validators?.sync;
    this._asyncShapeValidator = validators?.async;
    this._coerceFn = validators?.coerceFn;
    this._key = this.defKey();
  }

  defKey(): string {
    return this._type;
  }

  protected _clone(): this {
    const clone = new (this.constructor as any)();
    Object.assign(clone, this);
    clone._operations = { ...this._operations };
    return clone;
  }

  parse(value: unknown): T {
    const result = this._preValidate(value);
    return result.value;
  }

  async parseAsync(value: unknown): Promise<T> {
    const result = await this._preValidateAsync(value);
    return result.value;
  }

  safeParse(value: unknown) {
    try {
      const result = this._preValidate(value);
      return { ...result, success: true };
    } catch (error) {
      return this._handleError(error, value);
    }
  }

  async safeParseAsync(value: unknown) {
    try {
      const result = await this._preValidateAsync(value);
      return { ...result, success: true };
    } catch (error) {
      return this._handleError(error, value);
    }
  }

  default(value: T): this {
    const clone = this._clone();
    clone._default = value;
    return clone;
  }

  optional(): AbstractShape<T | undefined> {
    const clone = this._clone();
    clone._optional = true;
    return clone as never;
  }

  nullable(): AbstractShape<T | null> {
    const clone = this._clone();
    clone._nullable = true;
    return clone as never;
  }

  transform<U>(fn: (value: T) => U, opts: TshOptions = {}): AbstractShape<U> {
    return this._addOperation({
      type: "transform",
      fn,
      message: opts.message ?? "Invalid transform",
      code: opts.code ?? "TRANSFORM_ERROR",
      extra: opts?.extra,
      opts,
    }) as never;
  }

  transformAsync<U>(fn: (value: T) => Promise<U>, opts: TshOptions = {}): AbstractShape<U> {
    return this._addOperation({
      type: "transformAsync",
      fn,
      message: opts.message ?? "Invalid async transform",
      code: opts.code ?? "ASYNC_TRANSFORM_ERROR",
      extra: opts?.extra,
      opts,
    }) as never;
  }

  refine(
    predicate: (value: T) => boolean,
    message: string,
    code: string = "VALIDATION_ERROR",
    extra?: Record<string, unknown>,
    opts?: TshOptions,
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

  refineAsync(
    predicate: (value: T) => Promise<boolean>,
    message: string,
    code: string = "ASYNC_VALIDATION_ERROR",
    extra?: Record<string, unknown>,
    opts?: TshOptions,
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

  commit(commit: string): this {
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

  // --- VALIDADORES PRIVADOS ---

  protected _preValidate(value: unknown): { value: T; errors: [] } {
    const coerced = this._coerceValue(value);
    if ('error' in coerced) throw coerced.error;

    value = coerced.value;
    if (value === undefined) {
      if (this._optional) return { value: (this._default ?? undefined) as T, errors: [] };
      throw this._createMissingError(value);
    }

    if (value === null && this._nullable) return { value: null as T, errors: [] };

    const basicError = this._validateSync(value);
    if (basicError) throw basicError;

    const result = this._executeOperations(value);
    return { value: result.value, errors: [] };
  }

  protected async _preValidateAsync(value: unknown): Promise<{ value: T; errors: [] }> {
    const coerced = this._coerceValue(value);
    if ('error' in coerced) throw coerced.error;

    value = coerced.value;
    if (value === undefined) {
      if (this._optional) return { value: (this._default ?? undefined) as T, errors: [] };
      throw this._createMissingError(value);
    }

    if (value === null && this._nullable) return { value: null as T, errors: [] };

    const basicError = await this._validateAsync(value);
    if (basicError) throw basicError;

    const result = await this._executeOperationsAsync(value);
    return { value: result.value, errors: [] };
  }

  protected _executeOperations(value: any): { value: T } {
    let currentValue = value;
    let op = this._operations.first;

    while (op) {
      const result = this._executeOperation(op, currentValue);
      if ('error' in result) throw result.error;
      if ('value' in result) currentValue = result.value;
      op = op.next;
    }

    return { value: currentValue };
  }

  protected async _executeOperationsAsync(value: any): Promise<{ value: T }> {
    let currentValue = value;
    let op = this._operations.first;

    while (op) {
      const result = op.type.includes("Async")
        ? await this._executeAsyncOperation(op, currentValue)
        : this._executeOperation(op, currentValue);

      if ('error' in result) throw result.error;
      if ('value' in result) currentValue = result.value;
      op = op.next;
    }

    return { value: currentValue };
  }

  protected _executeOperation(op: TshOperation<any>, value: any): { value?: any; error?: TshShapeError } {
    try {
      switch (op.type) {
        case "transform":
          return { value: op.fn(value) };
        case "refine":
          if (!op.fn(value)) {
            return { error: new TshShapeError(this._createError(op, value)) };
          }
          return {};
        default:
          return {};
      }
    } catch (error) {
      return { error: this._createUnexpectedError(error, value) };
    }
  }

  protected async _executeAsyncOperation(op: TshOperation<any>, value: any): Promise<{ value?: any; error?: TshShapeError }> {
    try {
      switch (op.type) {
        case "transformAsync":
          return { value: await op.fn(value) };
        case "refineAsync":
          if (!(await op.fn(value))) {
            return { error: new TshShapeError(this._createError(op, value)) };
          }
          return {};
        default:
          return {};
      }
    } catch (error) {
      return { error: this._createUnexpectedError(error, value) };
    }
  }

  protected _handleError(error: unknown, value: unknown) {
    if (error instanceof TshShapeError) {
      return { value: undefined, success: false, error, errors: [error] };
    }

    const unexpectedError = this._createUnexpectedError(error, value);
    return { value: undefined, success: false, error: unexpectedError, errors: [unexpectedError] };
  }

  protected _createMissingError(value: unknown): TshShapeError {
    return new TshShapeError({
      code: "REQUIRED",
      message: `Missing required value for ${this.defKey()}`,
      value,
      shape: this,
    });
  }

  private _coerceValue(value: unknown): { value: unknown } | { error: TshShapeError } {
    if (!this._coerceFn) return { value };
    try {
      return { value: this._coerceFn(value) };
    } catch (err) {
      return { error: this._createUnexpectedError(err, value) };
    }
  }

  private _validateSync(value: unknown): TshShapeError | null {
    if (!this._shapeValidator) return null;
    const result = this._shapeValidator(value);
    return result.success ? null : result.error ?? null;
  }

  private async _validateAsync(value: unknown): Promise<TshShapeError | null> {
    if (!this._asyncShapeValidator) return null;
    const result = await this._asyncShapeValidator(value);
    return result.success ? null : result.error ?? null;
  }

  protected _addOperation(op: TshOperation<any>): this {
    const clone = this._clone();
    const newOp = { ...op };

    if (!clone._operations.first) {
      clone._operations = { first: newOp, last: newOp };
    } else {
      clone._operations.last!.next = newOp;
      clone._operations.last = newOp;
    }

    return clone;
  }

  protected _createError(op: TshOperation<any>, value: any, originalError?: any) {
    const opts = op.opts;
    return {
      code: opts?.code ?? op.code ?? "VALIDATION_ERROR",
      message: opts?.message ?? op.message ?? "Validation failed",
      value,
      shape: this,
      extra: { ...(op.extra ?? {}), ...(opts?.extra ?? {}) },
    };
  }

  protected _createUnexpectedError(error: unknown, value: any): TshShapeError {
    return new TshShapeError({
      code: "UNEXPECTED_ERROR",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
      value,
      shape: this,
      extra: { originalError: error },
    });
  }

  public withPath<Related extends () => any>(subkey: string, cb: Related) {
    const prev = this._key;
    this._key = subkey;
    const result = cb();
    if (result instanceof Promise) result.finally(() => (this._key = prev));
    else this._key = prev;
    return result;
  }

  protected createError(creator: ErrorCreator, value: unknown, opts?: TshOptions): never {
    const data = creator(value);
    throw new TshShapeError({
      ...data,
      code: opts?.code ?? data.code,
      message: opts?.message ?? data.message,
      shape: data.shape ?? this,
      extra: { ...data.extra ?? {}, ...opts?.extra ?? {} },
    });
  }
}
