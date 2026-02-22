# test/unit
Unit tests for core runtime components.

- `jwt-token-service.test.js`: JWT signing/verification behavior.
- `session-manager.test.js`: Session issuance/validation and failure cases.
- `migration-runner.test.js`: Generic migration runner behavior.
- `sqlite-migration-adapter.test.js`: SQLite adapter behavior.
- `client-runtime.test.js`: Generated-client runtime behavior (mutex/auth/error paths).
- `client-generator.test.js`: Parser/emitter/orchestration behavior for per-file generation.
