# Repository Guidelines

## Overview
This repository contains a web framework implementation focused on ViewControllers, RPC, and persisted ViewData. The goal is to let app developers define controller classes with callable methods, while the framework handles session-aware state, persistence, and request orchestration.

## Current Status
Implemented core pieces:
- ViewController decorators and registry (`src/viewController/`).
- `BaseViewController<T>` lifecycle hooks, including `createViewData`.
- Context split (`IContextBase`, `IContext<T>`).
- SQLite-backed ViewData store (`SqliteViewDataStore`).
- Per-session view lock manager.
- RPC handler for `POST /rpc/view/:key` with `{ method, args }`.
- Sample controller in `sampleImplementation/server/sample.ts`.

Missing pieces:
- SQLite schema/migration for `view_data` table.
- JWT-based `ISessionManager` implementation.
- Express adapter that maps requests/responses to the framework handler.
- Client generator for typed ViewController calls + per-view mutex.
- Tests, build tooling, and runtime configuration docs.

## Directory Layout
- `src/` framework runtime (controllers, RPC handler, persistence, types).
- `sampleImplementation/` demo usage (currently server-only sample).
- `.codex/` contributor guidance and status tracking.

## RPC Shape
- Route: `POST /rpc/view/:key`
- Body: `{ method: string, args: unknown }`
- Response: `{ result, viewData }`

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
- No build/test commands are configured yet.
- All code must follow `/.codex/instructions/CodeStyle.md` (mandatory documentation + low complexity).

