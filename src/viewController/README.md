# src/viewController
ViewController registration and runtime support.

- `types.ts`: Metadata and callable result types.
- `decorators.ts`: `@ViewController` and `@Callable`.
- `registry.ts`: Controller/callable registry.
- `BaseViewController.ts`: Base lifecycle hooks.
- `lockManager.ts`: Per-session/view call serialization.
- `viewDataStore.ts`: View data persistence abstractions + SQLite store.
