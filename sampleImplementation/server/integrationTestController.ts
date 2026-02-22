/**
 * ViewController used for integration-style test scenarios.
 */

import { BaseViewController } from "../../src/viewController/BaseViewController.js";
import { Callable, ViewController } from "../../src/viewController/decorators.js";
import { IContext, IContextBase } from "../../src/context/types.js";

/**
 * View data used by the integration test controller.
 */
export interface IIntegrationViewData {
  /**
   * Tracks the number of calls for the session.
   */
  callCount: number;

  /**
   * Records the last payload received.
   */
  lastPayload: string | null;
}

/**
 * Arguments for the echo method.
 */
export interface IIntegrationEchoArgs {
  /**
   * Payload string to echo back.
   */
  payload: string;
}

/**
 * Return type for the echo method.
 */
export interface IIntegrationEchoResult {
  /**
   * Echoed payload string.
   */
  echo: string;

  /**
   * Total call count for the session.
   */
  callCount: number;
}

/**
 * ViewController used to verify persistence and RPC flow.
 */
@ViewController({ key: "IntegrationTest", roles: ["defaultRole"] })
export class IntegrationTestViewController extends BaseViewController<IIntegrationViewData> {
  /**
   * Creates initial view data when none exists.
   *
   * @param context - Base context without view data.
   * @returns Initial view data.
   */
  static async createViewData(
    context: IContextBase
  ): Promise<IIntegrationViewData> {
    void context;
    return { callCount: 0, lastPayload: null };
  }

  /**
   * Echoes the payload and increments the call count.
   *
   * @param args - Method arguments.
   * @param context - Context with view data.
   * @returns Echo result with updated call count.
   */
  @Callable({ key: "Echo", allowedRoles: ["defaultRole"], allowUnauthenticated: false })
  static async Echo(
    args: IIntegrationEchoArgs,
    context: IContext<IIntegrationViewData>
  ): Promise<IIntegrationEchoResult> {
    context.viewData.callCount += 1;
    context.viewData.lastPayload = args.payload;

    return {
      echo: args.payload,
      callCount: context.viewData.callCount,
    };
  }
}
