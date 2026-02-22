/**
 * ViewController registry used by the RPC runtime.
 */

import { ICallableMetadata, IViewControllerConfig } from "./types.js";

/**
 * Base type for a ViewController constructor.
 */
export type ViewControllerConstructor = new (...args: never[]) => unknown;

/**
 * Tracks metadata for registered controllers.
 */
export interface IViewControllerEntry {
  /**
   * ViewController configuration.
   */
  config: IViewControllerConfig;

  /**
   * ViewController constructor.
   */
  controller: ViewControllerConstructor;

  /**
   * Callable method metadata.
   */
  callables: ICallableMetadata[];
}

const controllerRegistry = new Map<string, IViewControllerEntry>();
const callableRegistry = new WeakMap<ViewControllerConstructor, ICallableMetadata[]>();

/**
 * Registers callable metadata for a ViewController.
 *
 * @param controller - ViewController class to associate with callable metadata.
 * @param metadata - Callable metadata collected by decorators.
 */
export function registerCallables(
  controller: ViewControllerConstructor,
  metadata: ICallableMetadata
): void {
  const existing = callableRegistry.get(controller) ?? [];
  existing.push(metadata);
  callableRegistry.set(controller, existing);
}

/**
 * Registers a ViewController with its configuration.
 *
 * @param config - ViewController configuration.
 * @param controller - ViewController class to register.
 */
export function registerViewController(
  config: IViewControllerConfig,
  controller: ViewControllerConstructor
): void {
  if (controllerRegistry.has(config.key)) {
    throw new Error(`ViewController key already registered: ${config.key}`);
  }

  const callables = callableRegistry.get(controller) ?? [];
  controllerRegistry.set(config.key, { config, controller, callables });
}

/**
 * Resolves a ViewController entry by key.
 *
 * @param key - ViewController key.
 * @returns The registry entry or undefined if not found.
 */
export function resolveViewController(
  key: string
): IViewControllerEntry | undefined {
  return controllerRegistry.get(key);
}

/**
 * Lists all registered ViewControllers and their metadata.
 *
 * @returns Array of registered ViewController entries.
 */
export function listViewControllers(): IViewControllerEntry[] {
  return Array.from(controllerRegistry.values());
}
