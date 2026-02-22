import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  emitGeneratedControllerFiles,
} from "../../src/client/generator/emitClientFiles.ts";
import {
  generateClientForFile,
} from "../../src/client/generator/index.ts";
import {
  parseControllerFile,
} from "../../src/client/generator/parseControllerFile.ts";

/**
 * Creates a temporary directory under the OS temp root.
 *
 * @returns Absolute temporary directory path.
 */
async function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "quickapp-client-gen-"));
}

test("parseControllerFile discovers controller key and callable metadata", async () => {
  const result = await parseControllerFile({
    filePath: path.resolve("sampleImplementation/server/sample.ts"),
  });

  assert.equal(result.controllers.length > 0, true);
  const sample = result.controllers.find((controller) => controller.className === "SampleViewController");
  assert.ok(sample);
  assert.equal(sample.viewKey, "SampleView");
  assert.deepEqual(
    sample.callables.map((callable) => callable.methodName),
    ["SampleViewControllerMethod"]
  );
  assert.deepEqual(
    sample.callables.map((callable) => callable.rpcMethodKey),
    ["SampleViewControllerMethod"]
  );
  assert.equal(sample.viewDataType, "ISampleViewData");
  assert.equal(sample.callables[0].argsType, "ISampleViewControllerMethodArgs");
  assert.equal(sample.callables[0].returnType, "ISampleViewControllerMethodReturn");
});

test("emitGeneratedControllerFiles writes generated file and preserves existing wrapper", async () => {
  const tempDir = await createTempDir();
  const sourceFilePath = path.join(tempDir, "sampleImplementation/server/sample.ts");
  const generatedFilePath = path.join(tempDir, "sampleImplementation/client/sample.generated.ts");
  const wrapperFilePath = path.join(tempDir, "sampleImplementation/client/sample.ts");
  const modelFilePath = path.join(tempDir, "sampleImplementation/models/sample.ts");

  await fs.mkdir(path.dirname(sourceFilePath), { recursive: true });
  await fs.writeFile(sourceFilePath, "export class SampleViewController {}", "utf8");
  await fs.mkdir(path.dirname(modelFilePath), { recursive: true });
  await fs.writeFile(modelFilePath, "export interface ISampleViewData {}", "utf8");

  await fs.mkdir(path.dirname(wrapperFilePath), { recursive: true });
  await fs.writeFile(wrapperFilePath, "// keep me", "utf8");

  await emitGeneratedControllerFiles({
    sourceFilePath,
    modelFilePath,
    generatedFilePath,
    wrapperFilePath,
    controller: {
      className: "SampleViewController",
      viewKey: "SampleView",
      viewDataType: "ISampleViewData",
      callables: [
        {
          methodName: "SampleViewControllerMethod",
          rpcMethodKey: "SampleViewControllerMethod",
          argsType: "ISampleViewControllerMethodArgs",
          returnType: "ISampleViewControllerMethodReturn",
        },
      ],
    },
  });

  const generated = await fs.readFile(generatedFilePath, "utf8");
  const wrapper = await fs.readFile(wrapperFilePath, "utf8");

  assert.match(generated, /SampleViewControllerGenerated/);
  assert.match(generated, /invokeMethod/);
  assert.match(generated, /from \"..\/models\/sample\.js\"/);
  assert.equal(wrapper, "// keep me");
});

test("generateClientForFile emits mirrored client files in temp workspace", async () => {
  const tempDir = await createTempDir();
  const sourceFilePath = path.join(tempDir, "sampleImplementation/server/demo.ts");
  const sourceContent =
    'import { BaseViewController } from "../../src/viewController/BaseViewController.js";\n' +
    'import { ViewController, Callable } from "../../src/viewController/decorators.js";\n' +
    '@ViewController({ key: "DemoView" })\n' +
    'export class DemoViewController extends BaseViewController<{ count: number }> {\n' +
    '  static async createViewData() { return { count: 0 }; }\n' +
    '  @Callable({ key: "Ping" })\n' +
    '  static async Ping(args: { value: string }, context: { viewData: { count: number } }) {\n' +
    '    void context;\n' +
    '    return { echoed: args.value };\n' +
    '  }\n' +
    '}\n';

  await fs.mkdir(path.dirname(sourceFilePath), { recursive: true });
  await fs.writeFile(sourceFilePath, sourceContent, "utf8");

  const result = await generateClientForFile({
    rootDirectory: tempDir,
    sourceFilePath,
  });

  assert.equal(result.length, 1);
  assert.equal(path.basename(result[0].generatedFilePath), "demo.generated.ts");
  assert.equal(path.basename(result[0].wrapperFilePath), "demo.ts");

  const generated = await fs.readFile(result[0].generatedFilePath, "utf8");
  const wrapper = await fs.readFile(result[0].wrapperFilePath, "utf8");

  assert.match(generated, /DemoViewControllerGenerated/);
  assert.match(generated, /"Ping"/);
  assert.doesNotMatch(generated, /from \"..\/server\//);
  assert.match(wrapper, /extends DemoViewControllerGenerated/);
});
