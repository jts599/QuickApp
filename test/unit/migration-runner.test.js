import test from "node:test";
import assert from "node:assert/strict";
import { runMigrationPlan } from "../../src/migrations/runner.ts";
import {
  MigrationApplyError,
  MigrationValidationError,
} from "../../src/migrations/errors.ts";

/**
 * Creates a static migration object for tests.
 *
 * @param version - Migration version.
 * @returns Migration object.
 */
function createMigration(version) {
  return {
    version,
    name: `migration-${version}`,
    sql: `-- ${version}`,
    checksum: `checksum-${version}`,
  };
}

/**
 * Creates a test adapter with in-memory applied metadata tracking.
 *
 * @param initialApplied - Optional initial applied map.
 * @returns Adapter and call tracking state.
 */
function createAdapter(initialApplied = new Map()) {
  const state = {
    ensured: false,
    applied: new Map(initialApplied),
    executed: [],
  };

  const adapter = {
    async ensureMetadataTable() {
      state.ensured = true;
    },
    async listAppliedMigrations() {
      return new Map(state.applied);
    },
    async applyMigrationSql(migration) {
      state.executed.push(migration.version);
    },
    async recordAppliedMigration(migration) {
      state.applied.set(migration.version, {
        version: migration.version,
        checksum: migration.checksum,
        appliedAt: "now",
      });
    },
  };

  return { adapter, state };
}

test("runMigrationPlan applies only pending versions", async () => {
  const migrations = [createMigration("0001"), createMigration("0002")];
  const { adapter, state } = createAdapter(
    new Map([
      ["0001", { version: "0001", checksum: "checksum-0001", appliedAt: "earlier" }],
    ])
  );

  const report = await runMigrationPlan({ migrations, adapter, logger: console });

  assert.equal(state.ensured, true);
  assert.deepEqual(state.executed, ["0002"]);
  assert.deepEqual(report.appliedVersions, ["0002"]);
  assert.deepEqual(report.skippedVersions, ["0001"]);
  assert.equal(report.currentVersion, "0002");
});

test("runMigrationPlan fails on checksum mismatch", async () => {
  const migrations = [createMigration("0001")];
  const { adapter } = createAdapter(
    new Map([
      ["0001", { version: "0001", checksum: "unexpected", appliedAt: "earlier" }],
    ])
  );

  await assert.rejects(
    async () => {
      await runMigrationPlan({ migrations, adapter });
    },
    (error) => {
      assert.equal(error instanceof MigrationValidationError, true);
      return true;
    }
  );
});

test("runMigrationPlan fails on duplicate versions", async () => {
  const migrations = [createMigration("0001"), createMigration("0001")];
  const { adapter } = createAdapter();

  await assert.rejects(
    async () => {
      await runMigrationPlan({ migrations, adapter });
    },
    (error) => {
      assert.equal(error instanceof MigrationValidationError, true);
      assert.match(error.message, /Duplicate migration version/);
      return true;
    }
  );
});

test("runMigrationPlan fails when migrations are out of order", async () => {
  const migrations = [createMigration("0002"), createMigration("0001")];
  const { adapter } = createAdapter();

  await assert.rejects(
    async () => {
      await runMigrationPlan({ migrations, adapter });
    },
    (error) => {
      assert.equal(error instanceof MigrationValidationError, true);
      assert.match(error.message, /strictly ascending/);
      return true;
    }
  );
});

test("runMigrationPlan applies only versions up to targetVersion", async () => {
  const migrations = [
    createMigration("0001"),
    createMigration("0002"),
    createMigration("0003"),
  ];
  const { adapter, state } = createAdapter();

  const report = await runMigrationPlan({
    migrations,
    adapter,
    targetVersion: "0002",
  });

  assert.deepEqual(state.executed, ["0001", "0002"]);
  assert.deepEqual(report.appliedVersions, ["0001", "0002"]);
  assert.deepEqual(report.skippedVersions, []);
  assert.equal(report.currentVersion, "0002");
});

test("runMigrationPlan wraps apply failures with MigrationApplyError", async () => {
  const migrations = [createMigration("0001"), createMigration("0002")];
  const { state } = createAdapter();
  const adapter = {
    async ensureMetadataTable() {
      state.ensured = true;
    },
    async listAppliedMigrations() {
      return new Map();
    },
    async applyMigrationSql(migration) {
      if (migration.version === "0002") {
        throw new Error("boom");
      }
      state.executed.push(migration.version);
    },
    async recordAppliedMigration(migration) {
      state.applied.set(migration.version, {
        version: migration.version,
        checksum: migration.checksum,
        appliedAt: "now",
      });
    },
  };

  await assert.rejects(
    async () => {
      await runMigrationPlan({ migrations, adapter });
    },
    (error) => {
      assert.equal(error instanceof MigrationApplyError, true);
      assert.equal(error.version, "0002");
      return true;
    }
  );

  assert.deepEqual(state.executed, ["0001"]);
});
