# Repository Guidelines

## Overview
This repository contains a web framework implementation focused on ViewControllers, RPC, and persisted ViewData. The goal is to let app developers define controller classes with callable methods, while the framework handles session-aware state, persistence, and request orchestration.

## Current Status
Implemented core pieces:
- ViewController decorators and registry (`src/viewController/`).
- `BaseViewController<T>` lifecycle hooks, including `createViewData`.
- Context split (`IContextBase`, `IContext<T>`).
- SQLite-backed ViewData store (`SqliteViewDataStore`).
- Framework migration subsystem with SQLite runner and versioned SQL files (`src/migrations/`).
- Per-session view lock manager.
- RPC handler for `POST /rpc/view/:key` with `{ method, args }`.
- Sample controller in `sampleImplementation/server/sample.ts`.

Missing pieces:
- Client generation integration in editor/CI workflows (core per-file generator exists).
- Runtime configuration docs and production hardening.

## Directory Layout
- `src/` framework runtime (controllers, RPC handler, persistence, types).
- `sampleImplementation/` demo usage (currently server-only sample).
- `.codex/` contributor guidance and status tracking.

## RPC Shape
- Route: `POST /rpc/view/:key`
- Body: `{ method: string, args: unknown }`
- Response: `{ result, viewData }`
- Authorization failures return `403` with `{ error: "Forbidden." }` when session roles do not satisfy controller or callable role constraints.

## ViewData Persistence
ViewData is stored in SQLite by `session_id + view_key` and hydrated before each call. Suggested schema:

```sql
CREATE TABLE IF NOT EXISTS view_data (
  session_id TEXT NOT NULL,
  view_key TEXT NOT NULL,
  data JSON NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (session_id, view_key)
);
```

## Framework DB Migrations
- Framework schema migrations are versioned SQL files under `src/migrations/sqlite/sql/`.
- Run framework migrations manually from sample app:
  - `cd sampleImplementation && npm run migrate`
- Framework DB is intended to be separate from your application DB connection.

## Example ViewController
```ts
@ViewController({ key: "SampleView", roles: ["defaultRole"] })
export class SampleViewController extends BaseViewController<ISampleViewData> {
  static Component = SampleView;

  static async createViewData(ctx: IContextBase): Promise<ISampleViewData> {
    return { counter: 0 };
  }

  @Callable({ key: "SampleViewControllerMethod" })
  static async SampleViewControllerMethod(
    args: ISampleViewControllerMethodArgs,
    ctx: IContext<ISampleViewData>
  ): Promise<ISampleViewControllerMethodReturn> {
    ctx.viewData.counter += args.arg2;
    return { result: `Handled ${args.arg1}` };
  }
}
```

## Development Notes
- Root commands:
  - `npm run typecheck`
  - `npm run generate:client -- --controller sampleImplementation/server/sample.ts`
  - `npm run build`
  - `npm test`
- Sample commands:
  - `cd sampleImplementation && npm run build`
  - `cd sampleImplementation && npm run migrate`
- All code must follow `/.codex/instructions/CodeStyle.md` (mandatory documentation + low complexity).

## Client Generation
- Generator is per-file and explicit:
  - `npm run generate:client -- --controller sampleImplementation/server/sample.ts`
- For each controller file, generation writes:
  - `sampleImplementation/client/<name>.generated.ts` (always overwritten)
  - `sampleImplementation/client/<name>.ts` (created only if missing, preserved afterwards)
- Generated classes extend `ClientViewControllerBase<TViewData>` and call server RPC methods through constructor-injected runtime dependencies.

## Usage Example (Stub Session + RPC)
```ts
import {
  createViewRpcHandler,
  registerViewRpcRoutes,
  runFrameworkMigrations,
  InMemoryRefreshTokenStore,
  InMemorySessionManager,
  JwtTokenService,
  ViewLockManager,
} from "./src/index.js";

const tokenService = new JwtTokenService({
  secret: "dev-secret",
  issuer: "quickapp-local",
  audience: "quickapp-client",
});

const sessionManager = new InMemorySessionManager(
  tokenService,
  new InMemoryRefreshTokenStore(),
  {
    accessTokenTtlSeconds: 1800,
    refreshTokenTtlSeconds: 7200,
    defaultRoles: ["defaultRole"],
  }
);

await runFrameworkMigrations({
  dialect: "sqlite",
  database: /* framework SQLite DB instance */,
  logger: console,
});

const handler = createViewRpcHandler({
  sessionManager,
  viewDataStore: /* SqliteViewDataStore instance */,
  lockManager: new ViewLockManager(),
  databaseConnection: /* application DB connection */,
  logger: console,
  requestIdFactory: () => crypto.randomUUID(),
});

// Auto-register with Express:
// registerViewRpcRoutes(app, { ...same deps as above });
```
