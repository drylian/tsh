import { AbstractShape } from "./abstract-shape";
import { TshShapeError, type ErrorCreator } from "../error";
import type { TshOptions } from "../types";

export abstract class BaseShape<T> extends AbstractShape<T> {
  readonly _type: string = "base";
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
}