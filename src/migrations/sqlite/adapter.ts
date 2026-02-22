/**
 * SQLite adapter for framework migration execution.
 */

import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { IMigration, IAppliedMigration, IMigrationDialectAdapter } from "../types.js";

/**
 * Metadata table used by the framework migration subsystem.
 */
const METADATA_TABLE_NAME = "framework_migrations";

/**
 * Represents a SQLite statement that returns one row.
 */
interface ISqliteGetStatement<TParams extends unknown[], TResult> {
  /**
   * Executes and returns one row.
   *
   * @param params - SQL bind parameters.
   * @returns Row data or undefined.
   */
  get(...params: TParams): TResult | undefined;
}

/**
 * Represents a SQLite statement that returns many rows.
 */
interface ISqliteAllStatement<TParams extends unknown[], TResult> {
  /**
   * Executes and returns all rows.
   *
   * @param params - SQL bind parameters.
   * @returns Array of rows.
   */
  all(...params: TParams): TResult[];
}

/**
 * Represents a SQLite statement that mutates data.
 */
interface ISqliteRunStatement<TParams extends unknown[]> {
  /**
   * Executes a mutating SQL statement.
   *
   * @param params - SQL bind parameters.
   */
  run(...params: TParams): void;
}

/**
 * Minimal SQLite database surface required for migration execution.
 */
export interface ISqliteMigrationDatabase {
  /**
   * Prepares a SQL statement for read operations.
   *
   * @param sql - SQL statement text.
   * @returns Prepared statement.
   */
  prepare<TParams extends unknown[], TResult>(
    sql: string
  ): ISqliteGetStatement<TParams, TResult> &
    ISqliteAllStatement<TParams, TResult> &
    ISqliteRunStatement<TParams>;

  /**
   * Executes raw SQL text.
   *
   * @param sql - SQL statement batch to execute.
   */
  exec(sql: string): void;
}

/**
 * Computes the SHA-256 checksum for migration SQL.
 *
 * @param sql - SQL text to hash.
 * @returns Hex-encoded checksum.
 */
function computeChecksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

/**
 * Parses migration filename into version and name.
 *
 * @param fileName - Migration filename in `<version>_<name>.sql` format.
 * @returns Parsed version and name.
 * @throws {Error} When filename format is invalid.
 */
function parseMigrationFileName(fileName: string): { version: string; name: string } {
  const match = fileName.match(/^(\d+)_([\w\-]+)\.sql$/);
  if (!match) {
    throw new Error(`Invalid migration filename: ${fileName}`);
  }
  return { version: match[1], name: match[2] };
}

/**
 * Loads SQLite migration SQL files from disk.
 *
 * @returns Ordered migration list.
 */
export async function loadSqliteMigrations(): Promise<IMigration[]> {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const sqlDirectory = path.resolve(moduleDirectory, "./sql");
  const fileNames = (await fs.readdir(sqlDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  const migrations: IMigration[] = [];
  for (const fileName of fileNames) {
    const { version, name } = parseMigrationFileName(fileName);
    const sql = await fs.readFile(path.join(sqlDirectory, fileName), "utf8");
    migrations.push({ version, name, sql, checksum: computeChecksum(sql) });
  }

  return migrations;
}

/**
 * Creates a SQLite migration adapter.
 *
 * @param database - SQLite database instance.
 * @returns Dialect adapter implementation.
 */
export function createSqliteMigrationAdapter(
  database: ISqliteMigrationDatabase
): IMigrationDialectAdapter {
  return {
    async ensureMetadataTable(): Promise<void> {
      database.exec(
        `CREATE TABLE IF NOT EXISTS ${METADATA_TABLE_NAME} (` +
          "version TEXT PRIMARY KEY, " +
          "name TEXT NOT NULL, " +
          "checksum TEXT NOT NULL, " +
          "applied_at TEXT NOT NULL" +
          ")"
      );
    },

    async listAppliedMigrations(): Promise<Map<string, IAppliedMigration>> {
      const statement = database.prepare<
        [],
        { version: string; checksum: string; applied_at: string }
      >(
        `SELECT version, checksum, applied_at FROM ${METADATA_TABLE_NAME} ORDER BY version ASC`
      );
      const rows = statement.all();
      const map = new Map<string, IAppliedMigration>();
      for (const row of rows) {
        map.set(row.version, {
          version: row.version,
          checksum: row.checksum,
          appliedAt: row.applied_at,
        });
      }
      return map;
    },

    async applyMigrationSql(migration: IMigration): Promise<void> {
      database.exec("BEGIN");
      try {
        database.exec(migration.sql);
        database.exec("COMMIT");
      } catch (error: unknown) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    async recordAppliedMigration(migration: IMigration): Promise<void> {
      const statement = database.prepare<[string, string, string], unknown>(
        `INSERT INTO ${METADATA_TABLE_NAME} (version, name, checksum, applied_at) VALUES (?, ?, ?, datetime('now'))`
      );
      statement.run(migration.version, migration.name, migration.checksum);
    },
  };
}
