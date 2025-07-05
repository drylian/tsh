import type { TshOptions, InferUnionType, PrimitiveShapes } from '../types';
import { TshShapeError } from '../error';
import { AbstractShape } from './abstract-shape';

export class UnionShape<T extends PrimitiveShapes[]> extends AbstractShape<InferUnionType<T>> {
  public readonly _type = "union";

  constructor(private readonly shapes: T) {
    super({
      type:"union",
      primitiveFn: (value) => {
        const errors: TshShapeError[] = [];

        for (const shape of this.shapes) {
          const result = shape.safeParse(value);
          if (result.success) {
            return { success: true, value: result.value };
          }
          if (result.errors) {
            errors.push(...result.errors);
          }
        }

        return {
          success: false,
          error: new TshShapeError({
            code: 'NO_MATCHING_UNION_MEMBER',
            message: 'Value did not match any union member',
            value,
            shape: this,
            extra: {
              errors: errors.map(err => ({
                code: err.code,
                message: err.message,
                path: err.shape._key
              }))
            }
          })
        };
      }
    });
  }

  refine(
    predicate: (value: InferUnionType<T>) => boolean,
    message: string,
    code: string = "VALIDATION_ERROR",
    extra?: Record<string, unknown>,
    opts?: TshOptions,
  ): this {
    return super.refine(predicate, message, code, extra, opts);
  }
}