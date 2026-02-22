/**
 * Context definitions for ViewController execution.
 *
 * This module defines the base request context and the typed context
 * that includes per-view state. It is used by ViewController hooks
 * and callable methods during RPC execution.
 */

/**
 * Represents session information extracted from authentication.
 */
export interface ISessionInfo {
  /**
   * Unique identifier for the authenticated user.
   */
  userId: string;

  /**
   * Unique identifier for the active session.
   */
  sessionId: string;

  /**
   * Optional roles associated with the session.
   */
  roles?: string[];
}

/**
 * Base execution context available to all ViewController hooks.
 */
export interface IContextBase {
  /**
   * Unique request identifier for logging and tracing.
   */
  requestId: string;

  /**
   * Database connection or data access client.
   */
  databaseConnection: unknown;

  /**
   * Logger used for request-level diagnostics.
   */
  logger: ILogger;

  /**
   * Active session information for the current request.
   */
  sessionInfo: ISessionInfo;
}

/**
 * Typed execution context that includes ViewData for a ViewController.
 *
 * @typeParam TViewData - Type of the ViewData object attached to the view.
 */
export interface IContext<TViewData> extends IContextBase {
  /**
   * Mutable view state persisted across calls for the current session.
   */
  viewData: TViewData;
}

/**
 * Minimal logger interface used by the framework runtime.
 */
export interface ILogger {
  /**
   * Logs informational messages.
   *
   * @param message - Human-readable log message.
   * @param metadata - Optional structured metadata.
   */
  info(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Logs warning messages.
   *
   * @param message - Human-readable log message.
   * @param metadata - Optional structured metadata.
   */
  warn(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Logs error messages.
   *
   * @param message - Human-readable log message.
   * @param metadata - Optional structured metadata.
   */
  error(message: string, metadata?: Record<string, unknown>): void;
}
