export type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T;
};

export type ArrayElement<ArrayType extends readonly unknown[] | undefined> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
