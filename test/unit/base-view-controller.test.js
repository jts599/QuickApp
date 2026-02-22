import test from "node:test";
import assert from "node:assert/strict";
import { BaseViewController } from "../../src/viewController/BaseViewController.ts";

/**
 * Test controller used for BaseViewController.loadData behavior tests.
 */
class TestViewController extends BaseViewController {
  /**
   * Number of times createViewData was called.
   */
  static createCallCount = 0;

  /**
   * Resets static test counters.
   */
  static reset() {
    this.createCallCount = 0;
  }

  /**
   * Creates initial view data for tests.
   *
   * @returns Initial view data payload.
   */
  static async createViewData() {
    this.createCallCount += 1;
    return { counter: 1 };
  }
}

/**
 * Creates an in-memory view data store test double.
 *
 * @returns Store with observable saved payloads.
 */
function createViewDataStore() {
  const records = new Map();

  return {
    records,
    async load(sessionId, viewKey) {
      return records.get(`${sessionId}:${viewKey}`);
    },
    async save(sessionId, viewKey, data) {
      records.set(`${sessionId}:${viewKey}`, {
        data,
        updatedAt: new Date(),
      });
    },
    async delete(sessionId, viewKey) {
      records.delete(`${sessionId}:${viewKey}`);
    },
  };
}

test("BaseViewController.loadData creates and persists view data when missing", async () => {
  TestViewController.reset();
  const store = createViewDataStore();

  const result = await TestViewController.loadData(
    {
      requestId: "req",
      databaseConnection: {},
      logger: console,
      sessionInfo: { userId: "u", sessionId: "s" },
    },
    "session-1",
    "SampleView",
    store
  );

  assert.deepEqual(result, { counter: 1 });
  assert.equal(TestViewController.createCallCount, 1);
  assert.equal(
    store.records.has("session-1:SampleView"),
    true
  );
});

test("BaseViewController.loadData returns persisted view data without creating new data", async () => {
  TestViewController.reset();
  const store = createViewDataStore();
  await store.save("session-2", "SampleView", JSON.stringify({ counter: 9 }));

  const result = await TestViewController.loadData(
    {
      requestId: "req",
      databaseConnection: {},
      logger: console,
      sessionInfo: { userId: "u", sessionId: "s" },
    },
    "session-2",
    "SampleView",
    store
  );

  assert.deepEqual(result, { counter: 9 });
  assert.equal(TestViewController.createCallCount, 0);
});
