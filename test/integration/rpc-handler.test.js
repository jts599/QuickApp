import test from "node:test";
import assert from "node:assert/strict";
import { createViewRpcHandler } from "../../src/rpc/createViewRpcHandler.ts";
import { ViewLockManager } from "../../src/viewController/lockManager.ts";
import { InMemoryRefreshTokenStore } from "../../src/session/InMemoryRefreshTokenStore.ts";
import { InMemorySessionManager } from "../../src/session/InMemorySessionManager.ts";
import { JwtTokenService } from "../../src/session/JwtTokenService.ts";
import "../../sampleImplementation/server/sample.ts";

/**
 * In-memory ViewData store for integration tests.
 */
class InMemoryViewDataStore {
  constructor() {
    this.store = new Map();
  }

  /**
   * Loads a record by session and view key.
   *
   * @param sessionId - Session identifier.
   * @param viewKey - ViewController key.
   * @returns Stored record or undefined.
   */
  async load(sessionId, viewKey) {
    return this.store.get(`${sessionId}:${viewKey}`);
  }

  /**
   * Saves a record by session and view key.
   *
   * @param sessionId - Session identifier.
   * @param viewKey - ViewController key.
   * @param data - Serialized view data.
   */
  async save(sessionId, viewKey, data) {
    this.store.set(`${sessionId}:${viewKey}`, {
      data,
      updatedAt: new Date(),
    });
  }

  /**
   * Deletes a record by session and view key.
   *
   * @param sessionId - Session identifier.
   * @param viewKey - ViewController key.
   */
  async delete(sessionId, viewKey) {
    this.store.delete(`${sessionId}:${viewKey}`);
  }
}

/**
 * Builds a mock response object for handler tests.
 *
 * @returns Mock response.
 */
function createMockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

/**
 * Creates session manager for tests.
 *
 * @returns Session manager instance.
 */
function createSessionManager() {
  return new InMemorySessionManager(
    new JwtTokenService({ secret: "test-secret" }),
    new InMemoryRefreshTokenStore(),
    {
      accessTokenTtlSeconds: 60,
      refreshTokenTtlSeconds: 120,
      defaultRoles: ["defaultRole"],
    }
  );
}

test("RPC handler loads and persists view data", async () => {
  const sessionManager = createSessionManager();
  const auth = await sessionManager.authenticateUser({ username: "user" });

  const handler = createViewRpcHandler({
    sessionManager,
    viewDataStore: new InMemoryViewDataStore(),
    lockManager: new ViewLockManager(),
    databaseConnection: {},
    logger: console,
    requestIdFactory: () => "test-request",
  });

  const request = {
    params: { key: "SampleView" },
    body: {
      method: "SampleViewControllerMethod",
      args: { arg1: "hello", arg2: 2 },
    },
    headers: { authorization: `Bearer ${auth.tokens.accessToken}` },
  };

  const response = createMockResponse();
  await handler(request, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.result.result, "Handled hello");
  assert.equal(response.body.viewData.counter, 2);
  assert.ok(response.headers["x-access-token"]);
  assert.ok(response.headers["x-refresh-token"]);
});
