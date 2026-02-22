import test from "node:test";
import assert from "node:assert/strict";
import {
  ClientRpcError,
  ClientViewControllerBase,
} from "../../src/client/runtime.ts";

/**
 * Minimal generated-client-like class used for runtime tests.
 */
class TestClientController extends ClientViewControllerBase {
  constructor(runtime) {
    super(runtime, "SampleView");
  }

  /**
   * Proxy method used to invoke runtime method calls.
   *
   * @param args - Method arguments.
   * @returns RPC payload.
   */
  async Echo(args) {
    return this.invokeMethod("Echo", args);
  }
}

/**
 * Creates a deferred promise to control async scheduling.
 *
 * @returns {{ promise: Promise<void>, resolve: () => void }} Deferred handle.
 */
function createDeferred() {
  let resolve;
  const promise = new Promise((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

test("ClientViewControllerBase serializes concurrent calls per instance", async () => {
  const started = [];
  const completed = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const gate = createDeferred();

  const client = new TestClientController({
    transport: {
      async send(request) {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        started.push(request.body.args.value);

        if (request.body.args.value === 1) {
          await gate.promise;
        }

        completed.push(request.body.args.value);
        inFlight -= 1;

        return {
          status: 200,
          body: { result: { value: request.body.args.value }, viewData: { counter: request.body.args.value } },
          headers: {},
        };
      },
    },
  });

  const first = client.Echo({ value: 1 });
  const second = client.Echo({ value: 2 });

  gate.resolve();

  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(maxInFlight, 1);
  assert.deepEqual(started, [1, 2]);
  assert.deepEqual(completed, [1, 2]);
  assert.equal(firstResult.result.value, 1);
  assert.equal(secondResult.result.value, 2);
});

test("ClientViewControllerBase forwards refreshed tokens and auth header", async () => {
  const refreshed = [];
  const sent = [];

  const client = new TestClientController({
    getAccessToken: async () => "access-token",
    onTokensRefreshed: async (tokens) => {
      refreshed.push(tokens);
    },
    transport: {
      async send(request) {
        sent.push(request);
        return {
          status: 200,
          body: { result: { ok: true }, viewData: { counter: 1 } },
          headers: {
            "x-access-token": "new-a",
            "x-refresh-token": "new-r",
            "x-access-token-expires-at": "2030-01-01T00:00:00.000Z",
          },
        };
      },
    },
  });

  await client.Echo({ value: 1 });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].headers.authorization, "Bearer access-token");
  assert.deepEqual(refreshed, [
    {
      accessToken: "new-a",
      refreshToken: "new-r",
      expiresAt: "2030-01-01T00:00:00.000Z",
    },
  ]);
});

test("ClientViewControllerBase throws ClientRpcError for non-success responses", async () => {
  const client = new TestClientController({
    transport: {
      async send() {
        return {
          status: 403,
          body: { error: "Forbidden." },
          headers: {},
        };
      },
    },
  });

  await assert.rejects(
    async () => {
      await client.Echo({ value: 1 });
    },
    (error) => {
      assert.equal(error instanceof ClientRpcError, true);
      assert.equal(error.status, 403);
      assert.equal(error.message, "Forbidden.");
      return true;
    }
  );
});
