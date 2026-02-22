import test from "node:test";
import assert from "node:assert/strict";
import { runFrameworkMigrations } from "../../src/migrations/index.ts";

/**
 * In-memory SQLite-like database used to validate migration integration flow.
 */
class FakeSqliteDatabase {
  constructor() {
    this.createdTables = new Set();
    this.migrationRows = [];
  }

  /**
   * Executes raw SQL batches for table creation and transaction boundaries.
   *
   * @param sql - SQL batch string.
   */
  exec(sql) {
    const normalized = sql.replace(/\s+/g, " ").trim().toUpperCase();
    if (
      normalized === "BEGIN" ||
      normalized === "COMMIT" ||
      normalized === "ROLLBACK"
    ) {
      return;
    }

    if (normalized.includes("CREATE TABLE IF NOT EXISTS FRAMEWORK_MIGRATIONS")) {
      this.createdTables.add("framework_migrations");
      return;
    }

    if (normalized.includes("CREATE TABLE IF NOT EXISTS VIEW_DATA")) {
      this.createdTables.add("view_data");
      return;
    }

    throw new Error(`Unexpected SQL in fake database: ${sql}`);
  }

  /**
   * Prepares a statement object for query and write operations.
   *
   * @param sql - Statement SQL.
   * @returns Statement shim implementing all/get/run.
   */
  prepare(sql) {
    const normalized = sql.replace(/\s+/g, " ").trim().toUpperCase();

    return {
      all: () => {
        if (normalized.includes("SELECT VERSION, CHECKSUM, APPLIED_AT FROM FRAMEWORK_MIGRATIONS")) {
          return this.migrationRows.map((row) => ({ ...row }));
        }
        throw new Error(`Unexpected all() SQL: ${sql}`);
      },
      get: () => undefined,
      run: (version, name, checksum) => {
        if (normalized.includes("INSERT INTO FRAMEWORK_MIGRATIONS")) {
          this.migrationRows.push({
            version,
            name,
            checksum,
            applied_at: new Date().toISOString(),
          });
          return;
        }
        throw new Error(`Unexpected run() SQL: ${sql}`);
      },
    };
  }
}

test("runFrameworkMigrations applies sqlite migrations and is idempotent", async () => {
  const database = new FakeSqliteDatabase();

  const firstRun = await runFrameworkMigrations({
    dialect: "sqlite",
    database,
    logger: console,
  });

  assert.equal(database.createdTables.has("framework_migrations"), true);
  assert.equal(database.createdTables.has("view_data"), true);
  assert.deepEqual(firstRun.appliedVersions, ["0001"]);
  assert.deepEqual(firstRun.skippedVersions, []);

  const secondRun = await runFrameworkMigrations({
    dialect: "sqlite",
    database,
  });

  assert.deepEqual(secondRun.appliedVersions, []);
  assert.deepEqual(secondRun.skippedVersions, ["0001"]);
});

test("runFrameworkMigrations respects targetVersion", async () => {
  const database = new FakeSqliteDatabase();

  const report = await runFrameworkMigrations({
    dialect: "sqlite",
    database,
    targetVersion: "0001",
  });

  assert.deepEqual(report.appliedVersions, ["0001"]);
  assert.equal(report.currentVersion, "0001");
});

test("runFrameworkMigrations rejects unsupported dialect", async () => {
  const database = new FakeSqliteDatabase();

  await assert.rejects(
    async () => {
      await runFrameworkMigrations({
        dialect: /** @type {any} */ ("postgres"),
        database,
      });
    },
    /Unsupported migration dialect/
  );
});
