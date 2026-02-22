/**
 * Path mapping helpers for client code generation.
 */

import path from "path";
import { IGeneratedControllerPaths } from "./types.js";

/**
 * Computes generated and wrapper output paths for a server controller file.
 *
 * @param rootDirectory - Repository root directory.
 * @param sourceFilePath - Absolute server source file path.
 * @returns Generated and wrapper output paths.
 * @throws {Error} When source path is outside `sampleImplementation/server`.
 */
export function mapServerFileToClientOutputs(
  rootDirectory: string,
  sourceFilePath: string
): IGeneratedControllerPaths {
  const serverRoot = path.resolve(rootDirectory, "sampleImplementation/server");
  const clientRoot = path.resolve(rootDirectory, "sampleImplementation/client");

  const relativePath = path.relative(serverRoot, sourceFilePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(
      "Source file must be inside sampleImplementation/server for this generator."
    );
  }

  const extension = path.extname(relativePath);
  const baseWithoutExtension = relativePath.slice(0, relativePath.length - extension.length);

  return {
    generatedFilePath: path.resolve(clientRoot, `${baseWithoutExtension}.generated.ts`),
    wrapperFilePath: path.resolve(clientRoot, `${baseWithoutExtension}.ts`),
  };
}
