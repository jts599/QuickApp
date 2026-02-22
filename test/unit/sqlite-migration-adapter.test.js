import test from "node:test";
import assert from "node:assert/strict";
import {
  createSqliteMigrationAdapter,
  loadSqliteMigrations,
} from "../../src/migrations/sqlite/adapter.ts";

/**
 * In-memory SQLite-like test double for adapter-level tests.
 */
class FakeSqliteDatabase {
  constructor() {
    this.execCalls = [];
    this.rows = [];
  }

  /**
   * Executes raw SQL and optionally simulates failure.
   *
   * @param sql - SQL text.
   */
  exec(sql) {
    this.execCalls.push(sql);
    if (sql === "BAD SQL") {
      throw new Error("sql-failure");
    }
  }

  /**
   * Prepares statement handlers for select and insert operations.
   *
   * @param sql - SQL text.
   * @returns Statement-like object.
   */
  prepare(sql) {
    const normalized = sql.replace(/\s+/g, " ").trim().toUpperCase();

    return {
      all: () => {
        if (normalized.includes("SELECT VERSION, CHECKSUM, APPLIED_AT FROM FRAMEWORK_MIGRATIONS")) {
          return this.rows.map((row) => ({ ...row }));
        }
        throw new Error(`Unexpected all SQL: ${sql}`);
      },
      get: () => undefined,
      run: (version, name, checksum) => {
        if (normalized.includes("INSERT INTO FRAMEWORK_MIGRATIONS")) {
          this.rows.push({
            version,
            name,
            checksum,
            applied_at: "2026-01-01T00:00:00.000Z",
          });
          return;
        }
        throw new Error(`Unexpected run SQL: ${sql}`);
      },
    };
  }
}

test("createSqliteMigrationAdapter creates metadata table and records migrations", async () => {
  const database = new FakeSqliteDatabase();
  const adapter = createSqliteMigrationAdapter(database);

  await adapter.ensureMetadataTable();
  await adapter.recordAppliedMigration({
    version: "0001",
    name: "create_view_data",
    sql: "CREATE TABLE view_data (...)",
    checksum: "abc123",
  });

  const applied = await adapter.listAppliedMigrations();

  assert.equal(database.execCalls.some((sql) => sql.includes("framework_migrations")), true);
  assert.equal(applied.get("0001")?.checksum, "abc123");
});

test("createSqliteMigrationAdapter wraps SQL in transaction and rolls back on failure", async () => {
  const database = new FakeSqliteDatabase();
  const adapter = createSqliteMigrationAdapter(database);

  await assert.rejects(async () => {
    await adapter.applyMigrationSql({
      version: "0009",
      name: "broken",
      sql: "BAD SQL",
      checksum: "broken",
    });
  });

  assert.deepEqual(database.execCalls, ["BEGIN", "BAD SQL", "ROLLBACK"]);
});

test("loadSqliteMigrations reads ordered migration files with checksums", async () => {
  const migrations = await loadSqliteMigrations();

  assert.equal(migrations.length > 0, true);
  assert.equal(migrations[0].version, "0001");
  assert.equal(typeof migrations[0].checksum, "string");
  assert.equal(migrations[0].checksum.length > 0, true);
  assert.match(migrations[0].sql.toUpperCase(), /CREATE TABLE IF NOT EXISTS VIEW_DATA/);
});
