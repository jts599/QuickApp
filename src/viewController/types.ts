/**
 * Core metadata types for ViewControllers and callable methods.
 */

/**
 * Configuration for a ViewController class.
 */
export interface IViewControllerConfig {
  /**
   * Unique key used to resolve the controller at runtime.
   */
  key: string;

  /**
   * Roles allowed to access this controller by default.
   */
  roles?: string[];
}

/**
 * Metadata for a callable method.
 */
export interface ICallableConfig {
  /**
   * Unique method key used by RPC calls.
   */
  key: string;

  /**
   * Roles allowed to call this method.
   */
  allowedRoles?: string[];

  /**
   * Whether unauthenticated callers are permitted.
   */
  allowUnauthenticated?: boolean;
}

/**
 * Metadata collected for a callable method.
 */
export interface ICallableMetadata {
  /**
   * Callable configuration supplied by decorators.
   */
  config: ICallableConfig;

  /**
   * Name of the method on the ViewController class.
   */
  methodName: string;
}

/**
 * Standard RPC response shape for view methods.
 *
 * @typeParam TViewData - Type of view data returned.
 * @typeParam TResult - Type of method result.
 */
export interface ICallableResult<TViewData, TResult> {
  /**
   * Result returned by the ViewController method.
   */
  result: TResult;

  /**
   * Current view data persisted for this session.
   */
  viewData: TViewData;
}
