/**
 * Orchestration entrypoints for per-file client generation.
 */

import path from "path";
import {
  emitGeneratedControllerFiles,
} from "./emitClientFiles.js";
import {
  mapServerFileToClientOutputs,
} from "./pathMapping.js";
import {
  parseControllerFile,
} from "./parseControllerFile.js";

/**
 * Result entry describing one generated controller output.
 */
export interface IGenerateClientResultItem {
  /**
   * Source controller class name.
   */
  className: string;

  /**
   * Generated output file path.
   */
  generatedFilePath: string;

  /**
   * Wrapper file path.
   */
  wrapperFilePath: string;
}

/**
 * Options for per-file client generation.
 */
export interface IGenerateClientForFileOptions {
  /**
   * Repository root path.
   */
  rootDirectory: string;

  /**
   * Source server file path (absolute or relative to root).
   */
  sourceFilePath: string;
}

/**
 * Generates client files for controllers discovered in one server file.
 *
 * @param options - Generation options.
 * @returns Generated output metadata list.
 */
export async function generateClientForFile(
  options: IGenerateClientForFileOptions
): Promise<IGenerateClientResultItem[]> {
  const absoluteSourceFilePath = path.isAbsolute(options.sourceFilePath)
    ? options.sourceFilePath
    : path.resolve(options.rootDirectory, options.sourceFilePath);

  const parseResult = await parseControllerFile({ filePath: absoluteSourceFilePath });
  if (parseResult.controllers.length === 0) {
    throw new Error("No @ViewController with @Callable methods found in source file.");
  }

  const mappedPaths = mapServerFileToClientOutputs(
    options.rootDirectory,
    absoluteSourceFilePath
  );

  const outputs: IGenerateClientResultItem[] = [];
  const hasMultipleControllers = parseResult.controllers.length > 1;
  for (const controller of parseResult.controllers) {
    const generatedClassFilePath = hasMultipleControllers
      ? mappedPaths.generatedFilePath.replace(
          ".generated.ts",
          `.${controller.className}.generated.ts`
        )
      : mappedPaths.generatedFilePath;
    const wrapperClassFilePath = hasMultipleControllers
      ? mappedPaths.wrapperFilePath.replace(
          ".ts",
          `.${controller.className}.ts`
        )
      : mappedPaths.wrapperFilePath;

    await emitGeneratedControllerFiles({
      sourceFilePath: absoluteSourceFilePath,
      generatedFilePath: generatedClassFilePath,
      wrapperFilePath: wrapperClassFilePath,
      controller,
    });

    outputs.push({
      className: controller.className,
      generatedFilePath: generatedClassFilePath,
      wrapperFilePath: wrapperClassFilePath,
    });
  }

  return outputs;
}
