/**
 * Public framework migration entrypoints.
 */

import { ILogger } from "../context/types.js";
import { runMigrationPlan } from "./runner.js";
import {
  createSqliteMigrationAdapter,
  ISqliteMigrationDatabase,
  loadSqliteMigrations,
} from "./sqlite/adapter.js";
import { IMigrationReport } from "./types.js";

/**
 * Migration dialect keys currently supported by the framework runtime.
 */
export type FrameworkMigrationDialect = "sqlite";

/**
 * Options for executing framework migrations.
 */
export interface IRunFrameworkMigrationsOptions {
  /**
   * SQL dialect to run.
   */
  dialect: FrameworkMigrationDialect;

  /**
   * Database connection compatible with the chosen dialect.
   */
  database: ISqliteMigrationDatabase;

  /**
   * Optional upper bound version to apply.
   */
  targetVersion?: string;

  /**
   * Optional logger for migration diagnostics.
   */
  logger?: ILogger;
}

/**
 * Runs framework schema migrations for the selected dialect.
 *
 * @param options - Migration execution options.
 * @returns Report describing applied and skipped migrations.
 */
export async function runFrameworkMigrations(
  options: IRunFrameworkMigrationsOptions
): Promise<IMigrationReport> {
  if (options.dialect !== "sqlite") {
    throw new Error(`Unsupported migration dialect: ${options.dialect}`);
  }

  const migrations = await loadSqliteMigrations();
  return runMigrationPlan({
    migrations,
    adapter: createSqliteMigrationAdapter(options.database),
    targetVersion: options.targetVersion,
    logger: options.logger,
  });
}

export * from "./types.js";
export * from "./errors.js";
export * from "./sqlite/adapter.js";
