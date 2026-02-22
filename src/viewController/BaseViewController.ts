/**
 * Base class for ViewControllers with ViewData lifecycle hooks.
 */

import { IContext, IContextBase } from "../context/types";

/**
 * Base class for ViewControllers.
 *
 * @typeParam TViewData - Type of view data persisted across calls.
 */
export abstract class BaseViewController<TViewData> {
  /**
   * Optional React component associated with this controller.
   */
  static Component?: unknown;

  /**
   * Creates initial ViewData when no stored state exists.
   *
   * @param context - Base context without view data.
   * @returns Initial view data for this controller.
   */
  static async createViewData(
    context: IContextBase
  ): Promise<unknown> {
    throw new Error(
      `createViewData must be implemented by ${this.name}.`
    );
  }

  /**
   * Authorizes the current request before any method is executed.
   *
   * @param context - Base context without view data.
   */
  static async authorize(context: IContextBase): Promise<void> {
    void context;
  }

  /**
   * Runs before executing a callable method with hydrated ViewData.
   *
   * @param context - Full context with ViewData loaded.
   */
  static async onBeforeCall(context: IContext<TViewData>): Promise<void> {
    void context;
  }
}
