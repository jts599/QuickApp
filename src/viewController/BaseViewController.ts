/**
 * Base class for ViewControllers with ViewData lifecycle hooks.
 */

import { IContext, IContextBase } from "../context/types.js";
import { IViewDataStore } from "./viewDataStore.js";

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
   * Loads persisted view data for a session/view pair, creating and saving it when missing.
   *
   * @typeParam TLoadedViewData - Concrete view data type resolved by the caller.
   * @param context - Base context without hydrated view data.
   * @param sessionId - Session identifier used for persistence lookup.
   * @param viewKey - ViewController key used for persistence lookup.
   * @param viewDataStore - Store implementation used to load and save serialized view data.
   * @returns Hydrated or newly created view data.
   */
  static async loadData<TLoadedViewData>(
    context: IContextBase,
    sessionId: string,
    viewKey: string,
    viewDataStore: IViewDataStore
  ): Promise<TLoadedViewData> {
    const record = await viewDataStore.load(sessionId, viewKey);
    if (record) {
      return JSON.parse(record.data) as TLoadedViewData;
    }

    const createdViewData = await this.createViewData(context);
    await viewDataStore.save(
      sessionId,
      viewKey,
      JSON.stringify(createdViewData ?? null)
    );

    return createdViewData as TLoadedViewData;
  }

  /**
   * Runs before executing a callable method with hydrated ViewData.
   *
   * @param context - Full context with ViewData loaded.
   */
  static async onBeforeCall<TContextViewData>(
    context: IContext<TContextViewData>
  ): Promise<void> {
    void context;
  }
}
