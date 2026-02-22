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

/**
 * Creates a session manager and the backing token service for failure-path tests.
 *
 * @returns {{ sessionManager: InMemorySessionManager, tokenService: JwtTokenService }}
 */
function createSessionManagerWithTokenService() {
  const tokenService = new JwtTokenService({ secret: "test-secret" });
  const sessionManager = new InMemorySessionManager(
    tokenService,
    new InMemoryRefreshTokenStore(),
    {
      accessTokenTtlSeconds: 60,
      refreshTokenTtlSeconds: 120,
      defaultRoles: ["defaultRole"],
    }
  );

  return { sessionManager, tokenService };
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

test("requireSession fails when authorization header is missing", async () => {
  const sessionManager = createSessionManager();

  await assert.rejects(
    async () => {
      await sessionManager.requireSession({
        params: {},
        body: {},
        headers: {},
      });
    },
    /Missing Authorization header/
  );
});

test("requireSession fails when authorization header format is invalid", async () => {
  const sessionManager = createSessionManager();

  await assert.rejects(
    async () => {
      await sessionManager.requireSession({
        params: {},
        body: {},
        headers: { authorization: "not-a-bearer-token" },
      });
    },
    /Invalid Authorization header format/
  );
});

test("requireSession fails when access token signature is invalid", async () => {
  const { sessionManager } = createSessionManagerWithTokenService();
  const foreignTokenService = new JwtTokenService({ secret: "other-secret" });
  const signed = await foreignTokenService.signAccessToken({
    sub: "user",
    sid: "session",
    roles: ["defaultRole"],
    exp: Math.floor(Date.now() / 1000) + 60,
  });

  await assert.rejects(
    async () => {
      await sessionManager.requireSession({
        params: {},
        body: {},
        headers: { authorization: `Bearer ${signed.token}` },
      });
    },
    /Invalid token signature/
  );
});

test("requireSession fails when access token is expired", async () => {
  const { sessionManager, tokenService } = createSessionManagerWithTokenService();
  const signed = await tokenService.signAccessToken({
    sub: "user",
    sid: "session",
    roles: ["defaultRole"],
    exp: Math.floor(Date.now() / 1000) - 30,
  });

  await assert.rejects(
    async () => {
      await sessionManager.requireSession({
        params: {},
        body: {},
        headers: { authorization: `Bearer ${signed.token}` },
      });
    },
    /Token expired/
  );
});

test("requireSession rejects token with forged roles payload and stale signature", async () => {
  const { sessionManager, tokenService } = createSessionManagerWithTokenService();
  const signed = await tokenService.signAccessToken({
    sub: "user",
    sid: "session",
    roles: ["defaultRole"],
    exp: Math.floor(Date.now() / 1000) + 60,
  });

  const [headerSegment, payloadSegment, signatureSegment] = signed.token.split(".");
  const payload = JSON.parse(
    Buffer.from(payloadSegment, "base64url").toString("utf8")
  );
  payload.roles = ["admin"];

  const forgedPayloadSegment = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  const forgedToken = `${headerSegment}.${forgedPayloadSegment}.${signatureSegment}`;

  await assert.rejects(
    async () => {
      await sessionManager.requireSession({
        params: {},
        body: {},
        headers: { authorization: `Bearer ${forgedToken}` },
      });
    },
    /Invalid token signature/
  );
});
