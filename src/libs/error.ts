import type { AbstractShape } from "../Tsh";
import type { PrimitiveShapes, TshConfig } from "./types";

export interface TshShapeErrorConstructor {
    code: string;
    message: string;
    value: unknown;
    shape:PrimitiveShapes;
    extra?:object;
}

export type ErrorCreator = (value: unknown) => TshShapeErrorConstructor;
export class TshShapeError extends Error {
  public readonly code: string;
  public readonly value: unknown;
  public readonly shape: PrimitiveShapes;
  public readonly extra: object = {};
  public readonly params:ReturnType<InstanceType<typeof TshShapeError>['shape']['conf']>;
  public readonly key:string;
  public readonly path:string;
  constructor(options: TshShapeErrorConstructor) {
    super(options.message);
    this.name = 'TshShapeError';
    if(options.extra) this.extra = options.extra;
    this.code = options.code;
    this.value = options.value;
    this.shape = options.shape;
    this.params = this.shape.conf();
    this.key = this.params.key;
    this.path = this.params.key;
  }

  toJSON():Omit<TshShapeErrorConstructor, "extra" | "shape"> & TshConfig<AbstractShape<any>> {
    return {
      code: this.code,
      message: this.message,
      value: this.value,
      ...this.params,
      ...this.extra
    };
  }
}