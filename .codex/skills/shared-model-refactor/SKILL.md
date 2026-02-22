---
name: shared-model-refactor
description: Refactor shared server/client TypeScript contracts into a common models directory and eliminate cross-boundary imports (for example client importing server classes). Use when client code depends on server module exports for types or when generated client code needs DTO/view-data/method contracts without bundling server implementation files.
---

# Shared Model Refactor

Refactor code so server and client both import shared contracts from `sampleImplementation/models/` instead of importing each other.

## Workflow

1. Find boundary violations.
- Run:
  - `rg -n "from ['\"].*server/|from ['\"].*client/" sampleImplementation src test -S`
- Identify client imports from `sampleImplementation/server/*` and server imports from `sampleImplementation/client/*`.

2. Identify movable symbols.
- Move only pure contracts:
  - interfaces
  - type aliases
  - enums/constants used as DTO/schema contracts
- Do not move implementation/runtime code:
  - decorated classes
  - business logic
  - DB/network utilities

3. Create model files.
- Place extracted contracts in `sampleImplementation/models/`.
- Use feature-based files (for example `sampleImplementation/models/sampleView.ts`).
- Keep files side-effect free.

4. Update imports.
- Update server and client to import contracts from `sampleImplementation/models/*`.
- For NodeNext, use explicit `.js` extensions in TS imports.
- Prefer `import type` for type-only imports.

5. Update client generation templates/runtime.
- Ensure generated client code imports contracts from `models/`, not server class modules.
- If generator currently infers types via server class imports, switch generation to explicit model imports per controller.

6. Regenerate generated client files.
- Run generation command(s) after template changes.

7. Validate.
- Run:
  - `npm run typecheck`
  - `npm test`
  - `cd sampleImplementation && npm run build`
- Confirm no client file imports from `sampleImplementation/server/*`.

## File Organization Rules

- `sampleImplementation/models/` is the only shared contract boundary.
- Server code may import from `models/` and `src/`.
- Client code may import from `models/` and `src/client` runtime APIs.
- Client code must not import from `sampleImplementation/server/`.

## Refactor Heuristics

- Keep model names aligned with domain language.
- Split large contract files by feature, not by type-kind.
- Do not duplicate contracts in both server and client.
- If a contract is only used on one side, keep it local.

## Acceptance Criteria

- Zero cross-boundary implementation imports between `server/` and `client/`.
- Shared DTO/view-data/method contracts live under `sampleImplementation/models/`.
- Generated client output compiles and no longer depends on server class imports.
- Full typecheck/tests/build pass.
