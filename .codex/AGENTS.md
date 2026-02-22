# Repository Status

## Current State (Framework Core)
- ViewController runtime exists in `src/viewController/` with decorators (`@ViewController`, `@Callable`) and a registry.
- `BaseViewController<T>` provides lifecycle hooks: `createViewData`, `authorize`, `onBeforeCall`.
- Context split is implemented in `src/context/types.ts`:
  - `IContextBase` for request/session/db/logger.
  - `IContext<T>` adds `viewData`.
- ViewData persistence layer exists:
  - `IViewDataStore` abstraction.
  - `SqliteViewDataStore` with JSON storage in `src/viewController/viewDataStore.ts`.
- Per-session ViewController lock is implemented in `src/viewController/lockManager.ts`.
- RPC handler exists in `src/rpc/createViewRpcHandler.ts` for `POST /rpc/view/:key` with `{ method, args }`.
- RPC handler enforces role-based authorization and returns `403` for forbidden requests.
- Framework migration subsystem exists in `src/migrations/`:
  - Generic runner and typed migration interfaces.
  - SQLite adapter and versioned SQL migrations in `src/migrations/sqlite/sql/`.
  - Public entrypoint `runFrameworkMigrations(...)`.
- Sample app includes migration command and scripts in `sampleImplementation/scripts/`.
- Sample controller is updated in `sampleImplementation/server/sample.ts`.
- Build and test tooling is in place:
  - Root: `npm run typecheck`, `npm run build`, `npm test`.
  - Sample: `npm run build`, `npm run migrate`.
- Test coverage includes:
  - Unit: JWT token service, session manager, migration runner, SQLite migration adapter.
  - Integration: RPC handler flow/state/role checks, migration idempotency and dialect checks.

## What Still Needs To Be Done
- Integrate client generation into editor workflows and CI checks (core per-file generation exists).
- Add React integration guidance or helper for `static Component` usage.
- Expand production hardening for session/storage implementations (persistent stores, key rotation, operational settings).
- Document runtime configuration in more detail (framework DB path, app DB separation, session settings, logger conventions).
- Add sample end-to-end tests (current sample `npm test` is a placeholder).

## Implementation Notes
- ViewData is persisted by `session_id + view_key` and hydrated into `ctx.viewData` before each call.
- ViewData lifetime follows session TTL (no separate ViewData TTL).
- Server serializes concurrent calls per session/view using `ViewLockManager`.
- Client should enforce a per-view mutex to prevent concurrent in-flight calls.
- Framework DB migrations are manually invoked (no auto-run on server start by default).
- Framework DB and app DB are treated as separate concerns in sample server wiring.
- Client generation is per-file and explicit via `npm run generate:client -- --controller <server-file>`.
- Generated client files are overwritten in `*.generated.ts`; wrapper `*.ts` files are preserved if already present.
