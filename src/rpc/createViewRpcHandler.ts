/**
 * Creates an RPC handler for ViewController calls.
 */

import { IContext, IContextBase, ILogger } from "../context/types.js";
import { IHttpRequest, IHttpResponse, NextFunction } from "../http/types.js";
import { ISessionManager } from "../session/types.js";
import { resolveViewController } from "../viewController/registry.js";
import { ICallableResult } from "../viewController/types.js";
import { IViewDataStore } from "../viewController/viewDataStore.js";
import { ViewLockManager } from "../viewController/lockManager.js";

/**
 * Non-nullable controller registry entry type.
 */
type ViewControllerEntry = NonNullable<ReturnType<typeof resolveViewController>>;

/**
 * Callable metadata type derived from a controller entry.
 */
type CallableMetadata = ViewControllerEntry["callables"][number];

/**
 * Shape of the RPC request body.
 */
export interface IViewRpcRequestBody {
  /**
   * Key of the callable method to invoke.
   */
  method: string;

  /**
   * Arguments for the callable method.
   */
  args: unknown;
}

/**
 * Dependencies required to create the RPC handler.
 */
export interface IViewRpcHandlerDependencies {
  /**
   * Session manager responsible for JWT validation and refresh.
   */
  sessionManager: ISessionManager;

  /**
   * View data store used for persistence.
   */
  viewDataStore: IViewDataStore;

  /**
   * Lock manager used to serialize calls per session/view.
   */
  lockManager: ViewLockManager;

  /**
   * Database connection passed into contexts.
   */
  databaseConnection: unknown;

  /**
   * Logger used for request-level diagnostics.
   */
  logger: ILogger;

  /**
   * Generates a request identifier for each call.
   */
  requestIdFactory: () => string;
}

/**
 * Represents a resolved controller + method pair.
 */
interface IResolvedCallable {
  /**
   * ViewController key.
   */
  controllerKey: string;

  /**
   * Callable method key.
   */
  methodKey: string;

  /**
   * Registered ViewController entry.
   */
  entry: ViewControllerEntry;

  /**
   * Callable metadata for the method.
   */
  callable: CallableMetadata;
}

/**
 * Extracts and validates the RPC request body.
 *
 * @param request - Incoming request.
 * @returns Parsed request body.
 */
function parseRequestBody(request: IHttpRequest): IViewRpcRequestBody {
  const body = request.body as IViewRpcRequestBody;
  if (!body || !body.method) {
    throw new Error("Missing method in request body.");
  }
  return body;
}

/**
 * Resolves a ViewController entry and callable metadata.
 *
 * @param controllerKey - ViewController key from the route.
 * @param methodKey - Method key from the request.
 * @returns Resolved controller and callable metadata.
 */
function resolveCallable(
  controllerKey: string,
  methodKey: string
): IResolvedCallable {
  const entry = resolveViewController(controllerKey);
  if (!entry) {
    throw new Error("ViewController not found.");
  }

  const callable = entry.callables.find((item) => item.config.key === methodKey);
  if (!callable) {
    throw new Error("Callable method not found.");
  }

  return { controllerKey, methodKey, entry, callable };
}

/**
 * Checks whether session roles satisfy an allowed-role constraint.
 *
 * @param sessionRoles - Roles assigned to the active session.
 * @param allowedRoles - Allowed roles for the target controller or method.
 * @returns True when access should be granted.
 */
function hasRequiredRole(
  sessionRoles: string[] | undefined,
  allowedRoles: string[] | undefined
): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  if (!sessionRoles || sessionRoles.length === 0) {
    return false;
  }
  return allowedRoles.some((role) => sessionRoles.includes(role));
}

/**
 * Validates role-based access for controller and callable metadata.
 *
 * @param entry - Resolved controller entry.
 * @param callable - Resolved callable metadata.
 * @param sessionRoles - Roles assigned to the active session.
 * @throws {Error} When role constraints are not satisfied.
 */
function assertRoleAccess(
  entry: ViewControllerEntry,
  callable: CallableMetadata,
  sessionRoles: string[] | undefined
): void {
  if (!hasRequiredRole(sessionRoles, entry.config.roles)) {
    throw new Error("Forbidden.");
  }
  if (!hasRequiredRole(sessionRoles, callable.config.allowedRoles)) {
    throw new Error("Forbidden.");
  }
}

/**
 * Writes refreshed tokens to the response headers.
 *
 * @param response - HTTP response.
 * @param refreshedTokens - Tokens issued by the session manager.
 */
function writeRefreshedTokens(
  response: IHttpResponse,
  refreshedTokens: { accessToken: string; refreshToken: string; expiresAt: string }
): void {
  response.setHeader("x-access-token", refreshedTokens.accessToken);
  response.setHeader("x-refresh-token", refreshedTokens.refreshToken);
  response.setHeader("x-access-token-expires-at", refreshedTokens.expiresAt);
}

/**
 * Builds a base context for the request.
 *
 * @param dependencies - Handler dependencies.
 * @param sessionInfo - Session info from authentication.
 * @returns Base context.
 */
function buildBaseContext(
  dependencies: IViewRpcHandlerDependencies,
  sessionInfo: IContextBase["sessionInfo"]
): IContextBase {
  return {
    requestId: dependencies.requestIdFactory(),
    databaseConnection: dependencies.databaseConnection,
    logger: dependencies.logger,
    sessionInfo,
  };
}

/**
 * Loads view data for a session/controller pair, creating it if missing.
 *
 * @param dependencies - Handler dependencies.
 * @param entry - Resolved controller entry.
 * @param baseContext - Base execution context.
 * @param sessionId - Session identifier.
 * @param controllerKey - ViewController key.
 * @returns Hydrated view data.
 */
async function loadOrCreateViewData(
  dependencies: IViewRpcHandlerDependencies,
  entry: ViewControllerEntry,
  baseContext: IContextBase,
  sessionId: string,
  controllerKey: string
): Promise<unknown> {
  const record = await dependencies.viewDataStore.load(sessionId, controllerKey);
  if (record) {
    return JSON.parse(record.data);
  }

  if (typeof (entry.controller as any).createViewData !== "function") {
    throw new Error("ViewData initializer missing.");
  }

  const viewData = await (entry.controller as any).createViewData(baseContext);
  await dependencies.viewDataStore.save(
    sessionId,
    controllerKey,
    JSON.stringify(viewData ?? null)
  );
  return viewData;
}

/**
 * Persists updated view data for the session.
 *
 * @param dependencies - Handler dependencies.
 * @param sessionId - Session identifier.
 * @param controllerKey - ViewController key.
 * @param viewData - View data to persist.
 */
async function persistViewData(
  dependencies: IViewRpcHandlerDependencies,
  sessionId: string,
  controllerKey: string,
  viewData: unknown
): Promise<void> {
  await dependencies.viewDataStore.save(
    sessionId,
    controllerKey,
    JSON.stringify(viewData ?? null)
  );
}

/**
 * Executes a callable method for a ViewController.
 *
 * @param entry - Resolved controller entry.
 * @param callable - Callable metadata.
 * @param args - Arguments passed from the client.
 * @param context - Request context with view data.
 * @returns Method result.
 */
async function executeCallable(
  entry: ViewControllerEntry,
  callable: CallableMetadata,
  args: unknown,
  context: IContext<unknown>
): Promise<unknown> {
  const method = (entry.controller as any)[callable.methodName];
  return method(args, context);
}

/**
 * Creates a handler that executes ViewController methods.
 *
 * @param dependencies - Handler dependencies.
 * @returns Middleware-style handler.
 */
export function createViewRpcHandler(
  dependencies: IViewRpcHandlerDependencies
): (request: IHttpRequest, response: IHttpResponse, next?: NextFunction) => Promise<void> {
  return async function handleViewRpc(
    request: IHttpRequest,
    response: IHttpResponse,
    next?: NextFunction
  ): Promise<void> {
    try {
      const controllerKey = request.params.key;
      if (!controllerKey) {
        response.status(400).json({ error: "Missing view controller key." });
        return;
      }

      const body = parseRequestBody(request);
      const resolved = resolveCallable(controllerKey, body.method);
      const sessionResult = await dependencies.sessionManager.requireSession(request);
      const sessionInfo = sessionResult.sessionInfo;
      assertRoleAccess(resolved.entry, resolved.callable, sessionInfo.roles);
      const lockRelease = await dependencies.lockManager.acquire(
        sessionInfo.sessionId,
        controllerKey
      );

      try {
        if (sessionResult.refreshedTokens) {
          writeRefreshedTokens(response, sessionResult.refreshedTokens);
        }
        const baseContext = buildBaseContext(dependencies, sessionInfo);
        if (typeof (resolved.entry.controller as any).authorize === "function") {
          await (resolved.entry.controller as any).authorize(baseContext);
        }

        const viewData = await loadOrCreateViewData(
          dependencies,
          resolved.entry,
          baseContext,
          sessionInfo.sessionId,
          controllerKey
        );
        const context: IContext<unknown> = { ...baseContext, viewData };

        if (typeof (resolved.entry.controller as any).onBeforeCall === "function") {
          await (resolved.entry.controller as any).onBeforeCall(context);
        }

        const result = await executeCallable(
          resolved.entry,
          resolved.callable,
          body.args,
          context
        );

        await persistViewData(
          dependencies,
          sessionInfo.sessionId,
          controllerKey,
          context.viewData
        );

        const payload: ICallableResult<unknown, unknown> = {
          result,
          viewData: context.viewData,
        };

        response.status(200).json(payload);
      } finally {
        lockRelease();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      if (next) {
        next(error as Error);
        return;
      }
      if (
        message === "Missing method in request body." ||
        message === "Missing view controller key."
      ) {
        response.status(400).json({ error: message });
        return;
      }
      if (message === "ViewController not found." || message === "Callable method not found.") {
        response.status(404).json({ error: message });
        return;
      }
      if (message === "Forbidden.") {
        response.status(403).json({ error: message });
        return;
      }
      if (message === "ViewData initializer missing.") {
        response.status(500).json({ error: message });
        return;
      }
      response.status(500).json({ error: "Unexpected server error." });
    }
  };
}
