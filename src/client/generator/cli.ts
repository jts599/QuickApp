/**
 * CLI entrypoint for per-file ViewController client generation.
 */

import path from "path";
import { generateClientForFile } from "./index.js";

/**
 * Parses controller path from command line arguments.
 *
 * @param argv - Process arguments excluding node executable.
 * @returns Controller file path.
 * @throws {Error} When argument is missing.
 */
function parseControllerPath(argv: string[]): string {
  const index = argv.findIndex((arg) => arg === "--controller");
  if (index >= 0 && argv[index + 1]) {
    return argv[index + 1];
  }

  throw new Error(
    "Missing required --controller argument. Example: npm run generate:client -- --controller sampleImplementation/server/sample.ts"
  );
}

/**
 * Runs client generation and prints generated output paths.
 *
 * @returns Process exit code.
 */
async function main(): Promise<number> {
  try {
    const rootDirectory = process.cwd();
    const controllerPath = parseControllerPath(process.argv.slice(2));
    const results = await generateClientForFile({
      rootDirectory,
      sourceFilePath: controllerPath,
    });

    console.info("Generated client files:");
    for (const result of results) {
      console.info(`- ${result.className}`);
      console.info(`  generated: ${path.relative(rootDirectory, result.generatedFilePath)}`);
      console.info(`  wrapper:   ${path.relative(rootDirectory, result.wrapperFilePath)}`);
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Client generation failed: ${message}`);
    return 1;
  }
}

const exitCode = await main();
process.exit(exitCode);
