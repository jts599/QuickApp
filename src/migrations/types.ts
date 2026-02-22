/**
 * Shared types for framework database migration execution.
 */

import { ILogger } from "../context/types.js";

/**
 * Represents a single framework migration.
 */
export interface IMigration {
  /**
   * Monotonic migration version identifier (for example: 0001).
   */
  version: string;

  /**
   * Human-readable migration name.
   */
  name: string;

  /**
   * Raw SQL text to execute.
   */
  sql: string;

  /**
   * SHA-256 checksum for drift detection.
   */
  checksum: string;
}

/**
 * Represents an already-applied migration row.
 */
export interface IAppliedMigration {
  /**
   * Version identifier that was applied.
   */
  version: string;

  /**
   * Stored checksum from application time.
   */
  checksum: string;

  /**
   * UTC timestamp recorded when applied.
   */
  appliedAt: string;
}

/**
 * Describes a database adapter that can execute and track migrations.
 */
export interface IMigrationDialectAdapter {
  /**
   * Ensures the migration metadata table exists.
   *
   * @returns Promise that resolves when the metadata table is available.
   */
  ensureMetadataTable(): Promise<void>;

  /**
   * Reads applied migration metadata keyed by version.
   *
   * @returns Map of version to applied migration details.
   */
  listAppliedMigrations(): Promise<Map<string, IAppliedMigration>>;

  /**
   * Executes migration SQL against the target database.
   *
   * @param migration - Migration to execute.
   * @returns Promise that resolves when execution completes.
   */
  applyMigrationSql(migration: IMigration): Promise<void>;

  /**
   * Records a migration as successfully applied.
   *
   * @param migration - Migration that was just applied.
   * @returns Promise that resolves when metadata is persisted.
   */
  recordAppliedMigration(migration: IMigration): Promise<void>;
}

/**
 * Report produced after running framework migrations.
 */
export interface IMigrationReport {
  /**
   * Versions newly applied during this execution.
   */
  appliedVersions: string[];

  /**
   * Versions that were already applied and therefore skipped.
   */
  skippedVersions: string[];

  /**
   * Highest migration version available after execution.
   */
  currentVersion: string;
}

/**
 * Options for the generic migration runner.
 */
export interface IRunMigrationPlanOptions {
  /**
   * Ordered migration list to execute.
   */
  migrations: IMigration[];

  /**
   * Adapter used to run and track migrations.
   */
  adapter: IMigrationDialectAdapter;

  /**
   * Optional upper bound version to apply.
   */
  targetVersion?: string;

  /**
   * Optional logger for migration diagnostics.
   */
  logger?: ILogger;
}
