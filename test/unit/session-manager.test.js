import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySessionManager } from "../../src/session/InMemorySessionManager.ts";
import { InMemoryRefreshTokenStore } from "../../src/session/InMemoryRefreshTokenStore.ts";
import { JwtTokenService } from "../../src/session/JwtTokenService.ts";

/**
 * Creates a session manager for tests.
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

test("InMemorySessionManager issues tokens on authentication", async () => {
  const sessionManager = createSessionManager();
  const result = await sessionManager.authenticateUser({ username: "user" });

  assert.ok(result.tokens.accessToken);
  assert.ok(result.tokens.refreshToken);
  assert.equal(result.sessionInfo.userId, "user");
  assert.equal(result.sessionInfo.roles?.[0], "defaultRole");
});

test("requireSession returns refreshed tokens", async () => {
  const sessionManager = createSessionManager();
  const auth = await sessionManager.authenticateUser({ username: "user" });

  const result = await sessionManager.requireSession({
    params: {},
    body: {},
    headers: { authorization: `Bearer ${auth.tokens.accessToken}` },
  });

  assert.ok(result.refreshedTokens?.accessToken);
  assert.ok(result.refreshedTokens?.refreshToken);
  assert.equal(result.sessionInfo.userId, "user");
});
