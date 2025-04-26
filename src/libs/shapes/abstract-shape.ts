import { TshShapeError, type ErrorCreator } from "../error";
import type { TshOptions, TshViewer, TshConfig, TshOperation } from "../types";

export abstract class AbstractShape<T> {
  readonly _type: string = "abstract";
  public defKey() {
    return this._type;
  }
  public _default?: T;
  public _key = this.defKey();
  public _optional = false;
  public _nullable = false;
  public _commit?: string;
  public __op_first: TshOperation<any> | null = null;
  public __op_last: TshOperation<any> | null = null;

  abstract parse(value: unknown): T;

  public safeParse(value: unknown): {
    value: T;
    success: boolean;
    error: TshShapeError | undefined;
  } {
    try {
      const result = this.parse(value);
      return { value: result, success: true, error: undefined };
    } catch (e) {
      return {
        success: false,
        value: undefined as T,
        error: e as TshShapeError,
      };
    }
  }

  default(value: T){
    this._default = value as T;
    return this;
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

  commit(commit: string): this {
    this._commit = commit;
    return this;
  }

  protected _clone(): this {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    return clone;
  }

  protected _addOperation(op: TshOperation<any>): this {
    const clone = this._clone();

    if (!clone.__op_first) {
      clone.__op_first = op;
      clone.__op_last = op;
    } else {
      clone.__op_last!.next = op;
      clone.__op_last = op;
    }

    return clone;
  }

  protected _operate(value: any): any {
    let crt_value = value;
    let crt_op:TshOperation<any, any> | null | undefined = this.__op_first;

    while (crt_op) {
      try {
        if (crt_op.type === "transform") {
          crt_value = crt_op.fn(crt_value);
        } else if (crt_op.type === "refine") {
          if (!crt_op.fn(crt_value)) {
            throw new TshShapeError(this._createError(crt_op, crt_value));
          }
        }
      } catch (e) {
        if (e instanceof TshShapeError) throw e;
        throw new TshShapeError(this._createError(crt_op, crt_value, e));
      }

      crt_op = crt_op.next;
    }

    return crt_value;
  }

  private _createError(op: TshOperation<any>, value: any, originalError?: any) {
    const opts = op.opts;
    const err = originalError as Error | string | undefined;

    return {
      code:
        opts?.code ??
        op.code ??
        (err && typeof err === "object"
          ? (err as Error).name
          : op.type === "transform"
            ? "TRANSFORM_ERROR"
            : "VALIDATION_ERROR"),
      message:
        opts?.message ??
        op.message ??
        (typeof err === "string" ? err : (err?.message ?? op.message)),
      value,
      shape: this,
      extra: { ...(op.extra ?? {}), ...(opts?.extra ?? {}) },
    };
  }

  public conf(): TshViewer<TshConfig<this>> {
    const config: any = {};
    const keys = Object.keys(this) as string[];

    keys.forEach((key) => {
      if (typeof this[key as keyof this] === "function" || key.startsWith("__")) return;
      const ckey = key.startsWith("_") ? key.substring(1) : key;
      config[ckey] = this[key as keyof this];
    });

    return config as never;
  }

  parseWithDefault(value: unknown): T {
    if (typeof value === "undefined" && typeof this._default !== "undefined") {
      return this._operate(this._default) as T;
    }
    return this.parse(value);
  }

  parseWithPath(value: unknown, subkey: string): T {
    try {
      this._key = subkey;
      const parsed = this.parseWithDefault(value);
      return this._operate(parsed) as T;
    } catch (error) {
      if (error instanceof TshShapeError) {
        throw error;
      }
      throw new TshShapeError({
        code: 'PARSE_ERROR',
        message: (error instanceof Error ? error.message : 'Unknown error'),
        value,
        shape: this,
      });
    }
  }
  protected createError(creator: ErrorCreator, value: unknown, opts?: TshOptions): never {
    const data = creator(value);
    throw new TshShapeError({
      ...data,
      code: opts?.code ?? data.code,
      message: opts?.message ?? data.message,
      shape: data.shape ? data.shape : this,
      extra: {
        ...data.extra ?? {},
        ...opts?.extra ?? {},
      }
    });
  }
}
