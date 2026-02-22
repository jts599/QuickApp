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
- Sample controller is updated in `sampleImplementation/server/sample.ts`.

## What Still Needs To Be Done
- Add actual SQLite schema/migration for `view_data` table.
- Implement a concrete `ISessionManager` for JWT-based sessions (extract `sessionId`, refresh TTL).
- Provide an Express adapter (route wiring and request/response mapping to `IHttpRequest`/`IHttpResponse`).
- Implement client generation for typed ViewController methods + per-view mutex.
- Add React integration guidance or helper for `static Component` usage.
- Add tests (unit: registry/decorators/store; integration: RPC flow with persistence).
- Add build tooling (TypeScript config, package.json, lint/test scripts).
- Document runtime configuration (database connection, session settings, logger).

## Implementation Notes
- ViewData is persisted by `session_id + view_key` and hydrated into `ctx.viewData` before each call.
- ViewData lifetime follows session TTL (no separate ViewData TTL).
- Server serializes concurrent calls per session/view using `ViewLockManager`.
- Client should enforce a per-view mutex to prevent concurrent in-flight calls.
