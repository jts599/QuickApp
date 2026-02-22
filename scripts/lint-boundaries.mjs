import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Recursively lists files under a directory.
 *
 * @param {string} directory - Root directory.
 * @returns {Promise<string[]>} Absolute file paths.
 */
async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await listFiles(fullPath);
      results.push(...nested);
      continue;
    }
    results.push(fullPath);
  }

  return results;
}

/**
 * Finds forbidden import statements in client files.
 *
 * @param {string[]} files - Candidate files.
 * @returns {Promise<Array<{filePath: string, line: number, text: string}>>} Violations.
 */
async function findBoundaryViolations(files) {
  const violations = [];
  const forbidden = /from\s+["'][^"']*server\//;

  for (const filePath of files) {
    if (!filePath.endsWith(".ts") && !filePath.endsWith(".js")) {
      continue;
    }

    const text = await readFile(filePath, "utf8");
    const lines = text.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index];
      if (forbidden.test(lineText)) {
        violations.push({
          filePath,
          line: index + 1,
          text: lineText.trim(),
        });
      }
    }
  }

  return violations;
}

/**
 * Main lint entrypoint.
 */
async function main() {
  const root = process.cwd();
  const clientRoot = path.resolve(root, "sampleImplementation/client");

  const files = await listFiles(clientRoot);
  const violations = await findBoundaryViolations(files);

  if (violations.length === 0) {
    console.info("Boundary lint passed: no client imports from server.");
    return;
  }

  console.error("Boundary lint failed: client imports from server are forbidden.");
  for (const violation of violations) {
    const relativePath = path.relative(root, violation.filePath);
    console.error(`- ${relativePath}:${violation.line}`);
    console.error(`  ${violation.text}`);
  }

  process.exitCode = 1;
}

await main();
