/**
 * Generic migration runner that validates, applies, and records migrations.
 */

import { MigrationApplyError, MigrationValidationError } from "./errors.js";
import {
  IMigration,
  IMigrationReport,
  IRunMigrationPlanOptions,
} from "./types.js";

/**
 * Compares two version strings lexicographically.
 *
 * @param left - Left version value.
 * @param right - Right version value.
 * @returns Negative when left < right, positive when left > right, zero when equal.
 */
function compareVersions(left: string, right: string): number {
  return left.localeCompare(right);
}

/**
 * Validates migration version uniqueness and ordering.
 *
 * @param migrations - Migrations to validate.
 * @throws {MigrationValidationError} When duplicate or out-of-order versions are found.
 */
function validateMigrationOrdering(migrations: IMigration[]): void {
  const seenVersions = new Set<string>();
  for (let index = 0; index < migrations.length; index += 1) {
    const current = migrations[index];
    if (seenVersions.has(current.version)) {
      throw new MigrationValidationError(
        `Duplicate migration version detected: ${current.version}`
      );
    }
    if (index > 0 && compareVersions(migrations[index - 1].version, current.version) >= 0) {
      throw new MigrationValidationError(
        "Migrations must be provided in strictly ascending version order."
      );
    }
    seenVersions.add(current.version);
  }
}

/**
 * Applies pending migrations using a dialect adapter.
 *
 * @param options - Migration execution options.
 * @returns Execution report containing applied and skipped versions.
 * @throws {MigrationValidationError} When migration metadata is invalid.
 * @throws {MigrationApplyError} When execution of a pending migration fails.
 */
export async function runMigrationPlan(
  options: IRunMigrationPlanOptions
): Promise<IMigrationReport> {
  validateMigrationOrdering(options.migrations);
  await options.adapter.ensureMetadataTable();

  const applied = await options.adapter.listAppliedMigrations();
  const appliedVersions: string[] = [];
  const skippedVersions: string[] = [];

  for (const migration of options.migrations) {
    if (options.targetVersion && compareVersions(migration.version, options.targetVersion) > 0) {
      break;
    }

    const existing = applied.get(migration.version);
    if (existing) {
      if (existing.checksum !== migration.checksum) {
        throw new MigrationValidationError(
          `Checksum mismatch for applied migration ${migration.version}.`
        );
      }
      skippedVersions.push(migration.version);
      continue;
    }

    options.logger?.info("Applying framework migration.", {
      version: migration.version,
      name: migration.name,
    });

    try {
      await options.adapter.applyMigrationSql(migration);
      await options.adapter.recordAppliedMigration(migration);
    } catch (error: unknown) {
      throw new MigrationApplyError(migration.version, error);
    }

    appliedVersions.push(migration.version);
  }

  const currentVersion =
    options.targetVersion ??
    options.migrations[options.migrations.length - 1]?.version ??
    "0";

  return { appliedVersions, skippedVersions, currentVersion };
}
