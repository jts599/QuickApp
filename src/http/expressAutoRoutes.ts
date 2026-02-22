/**
 * Auto-registration utilities for Express-based RPC wiring.
 */

import { createExpressViewRpcHandler, ExpressHandler } from "./expressAdapter.js";
import { createViewRpcHandler, IViewRpcHandlerDependencies } from "../rpc/createViewRpcHandler.js";
import { listViewControllers } from "../viewController/registry.js";

/**
 * Minimal Express app surface used for registration.
 */
export interface IExpressApp {
  /**
   * Registers a POST handler at the provided path.
   *
   * @param path - Route path to register.
   * @param handler - Express-compatible handler.
   */
  post(path: string, handler: ExpressHandler): void;
}

/**
 * Describes the registered ViewController metadata for the RPC route.
 */
export interface IViewRpcRegistrationInfo {
  /**
   * Route path registered for ViewController RPC calls.
   */
  route: string;

  /**
   * Controllers discovered via decorators.
   */
  controllers: Array<{ key: string; methods: string[] }>;
}

/**
 * Options for registering the ViewController RPC route.
 */
export interface IRegisterViewRpcRoutesOptions {
  /**
   * Overrides the default route path.
   */
  route?: string;

  /**
   * Callback invoked after registration with discovered metadata.
   */
  onRegistered?: (info: IViewRpcRegistrationInfo) => void;
}

/**
 * Auto-registers the ViewController RPC handler on an Express app.
 *
 * @param app - Express app instance.
 * @param dependencies - RPC handler dependencies.
 * @param options - Registration options.
 * @returns Registration metadata describing the wired route.
 */
export function registerViewRpcRoutes(
  app: IExpressApp,
  dependencies: IViewRpcHandlerDependencies,
  options?: IRegisterViewRpcRoutesOptions
): IViewRpcRegistrationInfo {
  const route = options?.route ?? "/rpc/view/:key";
  const handler = createViewRpcHandler(dependencies);
  const expressHandler = createExpressViewRpcHandler(handler);

  app.post(route, expressHandler);

  const controllers = listViewControllers().map((entry) => ({
    key: entry.config.key,
    methods: entry.callables.map((callable) => callable.config.key),
  }));

  const info: IViewRpcRegistrationInfo = { route, controllers };
  if (options?.onRegistered) {
    options.onRegistered(info);
  }

  return info;
}
