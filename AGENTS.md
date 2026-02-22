# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the core web framework implementation (Auth, RPC, view management, shared utilities, and types). Keep this code framework-level and reusable across applications.
- `sampleImplementation/` is a full sample app that exercises the framework. Use it as an integration test bed and reference usage.
- `.codex/` contains contributor guidance and current status. `/.codex/instructions/CodeStyle.md` is mandatory for any code changes. Current status lives in `/.codex/AGENTS.md`.
- `README.md` summarizes the current runtime, missing pieces, and the RPC shape.

## Build, Test, and Development Commands
- Root commands:
  - `npm run typecheck`
  - `npm run build`
  - `npm test`
- Sample implementation commands:
  - `cd sampleImplementation && npm run build`
  - `cd sampleImplementation && npm run migrate`
  - `cd sampleImplementation && npm test` (placeholder command today).
  - Use `sampleImplementation/` as the primary place to wire additional end-to-end coverage.

## Coding Style & Naming Conventions
- Follow `/.codex/instructions/CodeStyle.md` strictly. It requires comprehensive docs for every function/class/module and small, low-complexity functions.
- Prefer descriptive, domain-focused names (e.g., `RpcTransport`, `AuthSessionStore`, `ViewRouteRegistry`).
- Avoid deep nesting and magic values; use constants and guard clauses.

## Testing Guidelines
- Existing tests currently live in `test/unit/` and `test/integration/` and run via root `npm test`.
- Place additional end-to-end integration coverage in `sampleImplementation/` as runtime paths expand.
- Name tests after the feature under test (e.g., `auth-session-refresh`, `rpc-timeout-retry`) once a framework is introduced.
- Keep test commands in sync in this file and in `README.md` when scripts change.

## Commit & Pull Request Guidelines
- This repository has no commit history yet, so there is no established message convention. Use short, imperative summaries and include scope when helpful (e.g., `auth: add token refresh guard`).
- PRs should describe the framework impact, list updated modules, and note any sample implementation changes. Include screenshots only when UI behavior changes.

## Security & Configuration Tips
- Keep framework code generic and avoid embedding application secrets in `src/` or `sampleImplementation/`.
- When adding configuration, prefer environment-based defaults and document required variables.
