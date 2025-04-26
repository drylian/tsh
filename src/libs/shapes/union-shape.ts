import type { TshOptions, InferUnionType, PrimitiveShapes } from '../types';
import { TshShapeError } from '../error';
import { AbstractShape } from './abstract-shape';

export class UnionShape<T extends PrimitiveShapes[]> extends AbstractShape<InferUnionType<T>> {
  public readonly _type = "union";

  constructor(private readonly shapes: T) {
    super();
  }

  parse(value: unknown, opts?: TshOptions): any {
    const errors: TshShapeError[] = [];

    for (const shape of this.shapes) {
      try {
        return shape['parseWithPath' in shape ? "parseWithPath" : "parse"](value, this._key);
      } catch (error) {
        if (error instanceof TshShapeError) {
          errors.push(error);
        } else {
          errors.push(new TshShapeError({
            code: 'UNKNOWN_ERROR',
            message: String(error),
            value,
            shape: this,
            extra: { ...opts?.extra ?? {} },
          }));
        }
      }
    }

    this.createError((value: unknown) => ({
      code: opts?.code ?? 'NO_MATCHING_UNION_MEMBER',
      message: opts?.message ?? 'Value did not match any union member',
      value,
      shape:this,
      extra: {
        ...opts?.extra ?? {},
        errors: errors.map(err => ({
          code: err.code,
          message: err.message,
          path: err.shape._key
        }))
      }
    }), value);
  }
}