/**
 * Types used by client code generation.
 */

/**
 * Represents one callable method discovered from a controller file.
 */
export interface IDiscoveredCallableMethod {
  /**
   * Static method name on the server controller class.
   */
  methodName: string;

  /**
   * RPC key from `@Callable({ key })`.
   */
  rpcMethodKey: string;

  /**
   * Method argument type text.
   */
  argsType: string;

  /**
   * Method return payload type text (inside Promise<>).
   */
  returnType: string;

  /**
   * Optional JSDoc block for the method.
   */
  jsDoc?: string;
}

/**
 * Represents one ViewController class discovered in a source file.
 */
export interface IDiscoveredController {
  /**
   * Class name (for example: `SampleViewController`).
   */
  className: string;

  /**
   * RPC route key from `@ViewController({ key })`.
   */
  viewKey: string;

  /**
   * View data type used by `BaseViewController<TViewData>`.
   */
  viewDataType: string;

  /**
   * List of callable methods declared on this controller.
   */
  callables: IDiscoveredCallableMethod[];
}

/**
 * Options for parsing controller metadata from one file.
 */
export interface IParseControllerFileOptions {
  /**
   * Absolute path to the server controller source file.
   */
  filePath: string;
}

/**
 * Result of parsing one controller source file.
 */
export interface IParseControllerFileResult {
  /**
   * Absolute path of parsed file.
   */
  filePath: string;

  /**
   * Discovered ViewController classes.
   */
  controllers: IDiscoveredController[];
}

/**
 * Output file paths for one generated controller client.
 */
export interface IGeneratedControllerPaths {
  /**
   * Generated implementation file path.
   */
  generatedFilePath: string;

  /**
   * Wrapper file path preserved for developer edits.
   */
  wrapperFilePath: string;
}

/**
 * Options for emitting generated client files.
 */
export interface IEmitGeneratedControllerOptions {
  /**
   * Absolute path to source server file.
   */
  sourceFilePath: string;

  /**
   * Absolute path to shared model file containing referenced contracts.
   */
  modelFilePath: string;

  /**
   * Absolute path to generated implementation output.
   */
  generatedFilePath: string;

  /**
   * Absolute path to wrapper output.
   */
  wrapperFilePath: string;

  /**
   * Discovered controller metadata used for generation.
   */
  controller: IDiscoveredController;
}
