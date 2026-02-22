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
 * Creates a mock request object for the sample controller RPC call.
 *
 * @param {string} accessToken - Access token placed in Authorization header.
 * @param {number} increment - Amount to add to the view counter.
 * @returns {object} Mock request object.
 */
function createSampleRequest(accessToken, increment) {
  return {
    params: { key: "SampleView" },
    body: {
      method: "SampleViewControllerMethod",
      args: { arg1: "hello", arg2: increment },
    },
    headers: { authorization: `Bearer ${accessToken}` },
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
    ...createSampleRequest(auth.tokens.accessToken, 2),
  };

  const response = createMockResponse();
  await handler(request, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.result.result, "Handled hello");
  assert.equal(response.body.viewData.counter, 2);
  assert.ok(response.headers["x-access-token"]);
  assert.ok(response.headers["x-refresh-token"]);
});

test("RPC handler persists view data across multiple calls in the same session", async () => {
  const sessionManager = createSessionManager();
  const auth = await sessionManager.authenticateUser({ username: "user" });
  const viewDataStore = new InMemoryViewDataStore();

  const handler = createViewRpcHandler({
    sessionManager,
    viewDataStore,
    lockManager: new ViewLockManager(),
    databaseConnection: {},
    logger: console,
    requestIdFactory: () => "test-request",
  });

  const firstResponse = createMockResponse();
  await handler(createSampleRequest(auth.tokens.accessToken, 2), firstResponse);
  assert.equal(firstResponse.statusCode, 200);
  assert.equal(firstResponse.body.viewData.counter, 2);

  const secondResponse = createMockResponse();
  await handler(createSampleRequest(auth.tokens.accessToken, 3), secondResponse);
  assert.equal(secondResponse.statusCode, 200);
  assert.equal(secondResponse.body.viewData.counter, 5);
});

test("RPC handler isolates persisted view data per session", async () => {
  const sessionManager = createSessionManager();
  const authSessionA = await sessionManager.authenticateUser({ username: "user-a" });
  const authSessionB = await sessionManager.authenticateUser({ username: "user-b" });
  const viewDataStore = new InMemoryViewDataStore();

  const handler = createViewRpcHandler({
    sessionManager,
    viewDataStore,
    lockManager: new ViewLockManager(),
    databaseConnection: {},
    logger: console,
    requestIdFactory: () => "test-request",
  });

  const sessionAFirst = createMockResponse();
  await handler(createSampleRequest(authSessionA.tokens.accessToken, 2), sessionAFirst);
  assert.equal(sessionAFirst.statusCode, 200);
  assert.equal(sessionAFirst.body.viewData.counter, 2);

  const sessionBFirst = createMockResponse();
  await handler(createSampleRequest(authSessionB.tokens.accessToken, 4), sessionBFirst);
  assert.equal(sessionBFirst.statusCode, 200);
  assert.equal(sessionBFirst.body.viewData.counter, 4);

  const sessionASecond = createMockResponse();
  await handler(createSampleRequest(authSessionA.tokens.accessToken, 3), sessionASecond);
  assert.equal(sessionASecond.statusCode, 200);
  assert.equal(sessionASecond.body.viewData.counter, 5);
});

test("RPC handler returns 403 when session roles do not match controller/callable roles", async () => {
  const unauthorizedSessionManager = {
    async requireSession() {
      return {
        sessionInfo: {
          userId: "user",
          sessionId: "session",
          roles: ["unauthorizedRole"],
        },
      };
    },
  };

  const handler = createViewRpcHandler({
    sessionManager: /** @type {any} */ (unauthorizedSessionManager),
    viewDataStore: new InMemoryViewDataStore(),
    lockManager: new ViewLockManager(),
    databaseConnection: {},
    logger: console,
    requestIdFactory: () => "test-request",
  });

  const response = createMockResponse();
  await handler(
    {
      params: { key: "SampleView" },
      body: {
        method: "SampleViewControllerMethod",
        args: { arg1: "hello", arg2: 1 },
      },
      headers: {},
    },
    response
  );

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error, "Forbidden.");
});
