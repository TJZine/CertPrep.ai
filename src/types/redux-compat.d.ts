declare module "redux" {
  // Redux v5 removed these helper exports; Recharts types still depend on them.
  export type EmptyObject = Record<string, never>;

  export type CombinedState<S> = S;
}
