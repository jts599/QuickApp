/**
 * Sample ViewController used by integration tests and documentation examples.
 */

import { IContext, IContextBase } from "../../src/context/types.js";
import { BaseViewController } from "../../src/viewController/BaseViewController.js";
import { Callable, ViewController } from "../../src/viewController/decorators.js";
import {
  ISampleViewControllerMethodArgs,
  ISampleViewControllerMethodReturn,
  ISampleViewData,
} from "../models/sample.js";

/**
 * Demonstration ViewController that persists a counter in ViewData.
 */
@ViewController({ key: "SampleView", roles: ["defaultRole"] })
export class SampleViewController extends BaseViewController<ISampleViewData> {
  /**
   * Creates initial view data for first-time sessions.
   *
   * @param context - Request context without hydrated view data.
   * @returns New view data object with a zero counter.
   */
  static async createViewData(context: IContextBase): Promise<ISampleViewData> {
    void context;
    return { counter: 0 };
  }

  /**
   * Updates the view counter and returns a formatted result message.
   *
   * @param args - Method arguments containing message label and increment amount.
   * @param context - Request context with hydrated view data.
   * @returns Method result containing the formatted message.
   */
  @Callable({ key: "SampleViewControllerMethod", allowedRoles: ["defaultRole"] })
  static async SampleViewControllerMethod(
    args: ISampleViewControllerMethodArgs,
    context: IContext<ISampleViewData>
  ): Promise<ISampleViewControllerMethodReturn> {
    context.viewData.counter += args.arg2;
    return { result: `Handled ${args.arg1}` };
  }
}
