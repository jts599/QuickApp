/**
 * Error classes used by the migration subsystem.
 */

/**
 * Represents an invalid migration plan or metadata mismatch.
 */
export class MigrationValidationError extends Error {
  /**
   * Creates a validation error for migration planning checks.
   *
   * @param message - Human-readable failure message.
   */
  constructor(message: string) {
    super(message);
    this.name = "MigrationValidationError";
  }
}

/**
 * Represents a migration execution failure for a specific version.
 */
export class MigrationApplyError extends Error {
  /**
   * Version that failed to apply.
   */
  readonly version: string;

  /**
   * Creates an execution error with contextual version metadata.
   *
   * @param version - Migration version that failed.
   * @param cause - Underlying execution error.
   */
  constructor(version: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to apply migration ${version}: ${causeMessage}`);
    this.name = "MigrationApplyError";
    this.version = version;
  }
}
