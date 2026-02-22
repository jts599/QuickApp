/**
 * Shared model contracts for the SampleView controller.
 */

/**
 * View data persisted for the sample controller.
 */
export interface ISampleViewData {
  /**
   * Number of accumulated increments for the current session/view.
   */
  counter: number;
}

/**
 * Arguments accepted by the sample callable method.
 */
export interface ISampleViewControllerMethodArgs {
  /**
   * Label included in the result message.
   */
  arg1: string;

  /**
   * Amount added to the persisted counter.
   */
  arg2: number;
}

/**
 * Return value produced by the sample callable method.
 */
export interface ISampleViewControllerMethodReturn {
  /**
   * Human-readable message containing the input label.
   */
  result: string;
}
