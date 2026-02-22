/**
 * Decorators for ViewController configuration and callable methods.
 */

import { ICallableConfig, ICallableMetadata, IViewControllerConfig } from "./types.js";
import { registerCallables, registerViewController } from "./registry.js";
import { ViewControllerConstructor } from "./registry.js";

/**
 * Decorator that registers a ViewController with the runtime registry.
 *
 * @param config - ViewController configuration.
 * @returns Class decorator for ViewControllers.
 */
export function ViewController(config: IViewControllerConfig) {
  return function register(target: ViewControllerConstructor): void {
    registerViewController(config, target);
  };
}

/**
 * Decorator that marks a static method as callable via RPC.
 *
 * @param config - Callable method configuration.
 * @returns Method decorator for callable static methods.
 */
export function Callable(config: ICallableConfig) {
  return function registerCallable(
    target: unknown,
    propertyKey: string | symbol
  ): void {
    const methodName = propertyKey.toString();
    const controller = target as ViewControllerConstructor;
    const metadata: ICallableMetadata = { config, methodName };
    registerCallables(controller, metadata);
  };
}
