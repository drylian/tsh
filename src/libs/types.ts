import type { TshShapeErrorConstructor } from "./error";
import type { AbstractShape } from "./shapes/abstract-shape";
import type { AnyShape } from "./shapes/any-shape";
import type { ArrayShape } from "./shapes/array-shape";
import type { BaseShape } from "./shapes/base-shape";
import type { BooleanShape } from "./shapes/boolean-shape";
import type { EnumShape } from "./shapes/enum-shape";
import type { NumberShape } from "./shapes/number-shape";
import type { ObjectShape } from "./shapes/object-shape";
import type { RecordShape } from "./shapes/record-shape";
import type { StringShape } from "./shapes/string-shape";
import type { UnionShape } from "./shapes/union-shape";

export type TshViewer<T> =
  T extends null | undefined ? T :
  T extends Array<infer E> ? Array<TshViewer<E>> :
  T extends object ? { [K in keyof T]: TshViewer<T[K]> } : T;

export type ObjShape<T extends Record<string, PrimitiveShapes>> = {
  [K in keyof T]?: InferShapeType<T[K]>;
};

export type PartialObjShape<T extends Record<string, PrimitiveShapes>> = {
  [K in keyof T]?: T[K] extends PrimitiveShapes ? T[K] : never
};

export type DeepPartialObjShape<T extends Record<string, PrimitiveShapes>> = {
  [K in keyof T]?: T[K] extends Record<string, PrimitiveShapes>
  ? DeepPartialObjShape<T[K]>
  : T[K] extends PrimitiveShapes
  ? T[K]
  : never
};

export type PrimitiveShapes =
  | StringShape
  | NumberShape
  | BooleanShape
  | AnyShape<any>
  | EnumShape<any>
  | ArrayShape<any>
  | ObjectShape<any>
  | RecordShape<any, any>
  | UnionShape<any>
  | BaseShape<any>
  | AbstractShape<any>;
export type primitives = PrimitiveShapes;

export type TshOptions = Partial<TshShapeErrorConstructor>;
export type options = TshOptions;

export type TshConfig<T> = {
  [K in keyof T as
  K extends `_${infer P}`
  ? T[K] extends (...args: any[]) => any
  ? never
  : P
  : K extends string
  ? T[K] extends (...args: any[]) => any
  ? never
  : K
  : never
  ]: T[K]
};

export type InferShapeType<T> =
  T extends StringShape ? string :
  T extends NumberShape ? number :
  T extends BooleanShape ? boolean :
  T extends AnyShape ? any :
  T extends EnumShape<infer U> ? U :
  T extends BaseShape<infer U> ? U :
  T extends AbstractShape<infer U> ? U :
  T extends ArrayShape<infer U> ? Array<InferShapeType<U>> :
  T extends ObjectShape<infer U> ? { [K in keyof U]: InferShapeType<U[K]> } :
  T extends RecordShape<string, infer V> ? Record<string, InferShapeType<V>> :
  T extends RecordShape<infer K, infer V> ? Record<K, InferShapeType<V>> :
  T extends UnionShape<infer U> ? InferUnionType<U> :
  T extends readonly (infer U)[] ? ReadonlyArray<InferShapeType<U>> :
  T extends (infer U)[] ? Array<InferShapeType<U>> :
  T;

export type inferType<T> = TshViewer<InferShapeType<T>>;
export type infer<T> = TshViewer<InferShapeType<T>>;
export type InferUnionType<T extends PrimitiveShapes[]> =
  T extends [infer First, ...infer Rest]
  ? First extends PrimitiveShapes
  ? InferShapeType<First> | (Rest extends PrimitiveShapes[] ? InferUnionType<Rest> : never)
  : never
  : never;