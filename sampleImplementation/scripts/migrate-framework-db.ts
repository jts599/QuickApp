/**
 * Runs framework database migrations for the sample implementation.
 */

import path from "path";
import { mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { runFrameworkMigrations } from "../../src/migrations/index.js";
import { ISqliteMigrationDatabase } from "../../src/migrations/sqlite/adapter.js";

/**
 * Provides the minimal statement surface expected by the migration adapter.
 */
interface ISqliteStatement {
  /**
   * Executes statement and returns one row.
   *
   * @param params - SQL bind parameters.
   * @returns Single row result.
   */
  get(...params: unknown[]): unknown;

  /**
   * Executes statement and returns all rows.
   *
   * @param params - SQL bind parameters.
   * @returns Result rows.
   */
  all(...params: unknown[]): unknown[];

  /**
   * Executes mutating statement.
   *
   * @param params - SQL bind parameters.
   */
  run(...params: unknown[]): unknown;
}

/**
 * Creates a SQLite migration database adapter using better-sqlite3.
 *
 * @param databaseFilePath - Path to the SQLite database file.
 * @returns Framework-compatible migration database.
 */
async function createNodeSqliteDatabase(
  databaseFilePath: string
): Promise<ISqliteMigrationDatabase> {
  const moduleName: string = "better-sqlite3";
  const importedModule = (await import(moduleName)) as {
    default: new (filePath: string) => {
      exec(sql: string): void;
      prepare(sql: string): ISqliteStatement;
    };
  };
  const database = new importedModule.default(databaseFilePath);
  return {
    exec(sql: string): void {
      database.exec(sql);
    },
    prepare<TParams extends unknown[], TResult>(sql: string) {
      return database.prepare(sql) as {
        get(...params: TParams): TResult | undefined;
        all(...params: TParams): TResult[];
        run(...params: TParams): void;
      };
    },
  };
}

/**
 * Resolves the default framework database path for the sample app.
 *
 * @returns Absolute SQLite path.
 */
function getDefaultDatabasePath(): string {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDirectory, "../data/framework.db");
}

/**
 * Runs migrations for the configured framework database.
 *
 * @returns Process exit code.
 */
async function main(): Promise<number> {
  const databasePath = process.argv[2] ?? getDefaultDatabasePath();

  try {
    await mkdir(path.dirname(databasePath), { recursive: true });
    const database = await createNodeSqliteDatabase(databasePath);
    const report = await runFrameworkMigrations({
      dialect: "sqlite",
      database,
      logger: console,
    });

    console.info("Framework migrations complete.", {
      databasePath,
      appliedVersions: report.appliedVersions,
      skippedVersions: report.skippedVersions,
      currentVersion: report.currentVersion,
    });
    return 0;
  } catch (error: unknown) {
    console.error("Framework migration execution failed.", {
      databasePath,
      error,
    });
    return 1;
  }
}

const exitCode = await main();
process.exit(exitCode);
