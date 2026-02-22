import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Copies migration SQL assets from src to dist after TypeScript compilation.
 *
 * This script keeps runtime SQL files adjacent to compiled migration modules.
 */
async function copyMigrationAssets() {
  const projectRoot = process.cwd();
  const sourceDirectory = path.join(projectRoot, "src", "migrations", "sqlite", "sql");
  const targetDirectory = path.join(projectRoot, "dist", "migrations", "sqlite", "sql");

  await mkdir(targetDirectory, { recursive: true });
  await cp(sourceDirectory, targetDirectory, { recursive: true });
}

await copyMigrationAssets();
