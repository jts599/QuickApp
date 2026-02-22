/**
 * Creates an RPC handler for ViewController calls.
 */

import { IContext, IContextBase, ILogger } from "../context/types";
import { IHttpRequest, IHttpResponse, NextFunction } from "../http/types";
import { ISessionManager } from "../session/types";
import { resolveViewController } from "../viewController/registry";
import { ICallableResult } from "../viewController/types";
import { IViewDataStore } from "../viewController/viewDataStore";
import { ViewLockManager } from "../viewController/lockManager";

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

      const body = request.body as IViewRpcRequestBody;
      if (!body || !body.method) {
        response.status(400).json({ error: "Missing method in request body." });
        return;
      }

      const entry = resolveViewController(controllerKey);
      if (!entry) {
        response.status(404).json({ error: "ViewController not found." });
        return;
      }

      const callable = entry.callables.find((item) => item.config.key === body.method);
      if (!callable) {
        response.status(404).json({ error: "Callable method not found." });
        return;
      }

      const sessionInfo = await dependencies.sessionManager.requireSession(request);
      const lockRelease = await dependencies.lockManager.acquire(
        sessionInfo.sessionId,
        controllerKey
      );

      try {
        const baseContext: IContextBase = {
          requestId: dependencies.requestIdFactory(),
          databaseConnection: dependencies.databaseConnection,
          logger: dependencies.logger,
          sessionInfo,
        };

        if (typeof (entry.controller as any).authorize === "function") {
          await (entry.controller as any).authorize(baseContext);
        }

        const record = await dependencies.viewDataStore.load(
          sessionInfo.sessionId,
          controllerKey
        );

        let viewData = record ? JSON.parse(record.data) : undefined;
        if (!record) {
          if (typeof (entry.controller as any).createViewData !== "function") {
            response.status(500).json({ error: "ViewData initializer missing." });
            return;
          }
          viewData = await (entry.controller as any).createViewData(baseContext);
          await dependencies.viewDataStore.save(
            sessionInfo.sessionId,
            controllerKey,
            JSON.stringify(viewData ?? null)
          );
        }

        const context: IContext<unknown> = {
          ...baseContext,
          viewData,
        };

        if (typeof (entry.controller as any).onBeforeCall === "function") {
          await (entry.controller as any).onBeforeCall(context);
        }

        const method = (entry.controller as any)[callable.methodName];
        const result = await method(body.args, context);

        await dependencies.viewDataStore.save(
          sessionInfo.sessionId,
          controllerKey,
          JSON.stringify(context.viewData ?? null)
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
      if (next) {
        next(error as Error);
        return;
      }
      response.status(500).json({ error: "Unexpected server error." });
    }
  };
}
