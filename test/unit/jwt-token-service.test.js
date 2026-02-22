import test from "node:test";
import assert from "node:assert/strict";
import { JwtTokenService } from "../../src/session/JwtTokenService.ts";

/**
 * Builds test claims for signing.
 *
 * @returns JWT claims used for testing.
 */
function buildClaims() {
  return {
    sub: "user-1",
    sid: "session-1",
    roles: ["defaultRole"],
    exp: Math.floor(Date.now() / 1000) + 60,
  };
}

test("JwtTokenService signs and verifies access tokens", async () => {
  const tokenService = new JwtTokenService({ secret: "test-secret" });
  const claims = buildClaims();

  const signed = await tokenService.signAccessToken(claims);
  const verified = await tokenService.verifyAccessToken(signed.token);

  assert.deepEqual(verified, claims);
});

test("JwtTokenService rejects tampered tokens", async () => {
  const tokenService = new JwtTokenService({ secret: "test-secret" });
  const claims = buildClaims();

  const signed = await tokenService.signAccessToken(claims);
  const parts = signed.token.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  payload.sub = "attacker";
  parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const tampered = parts.join(".");

  await assert.rejects(
    () => tokenService.verifyAccessToken(tampered),
    /Invalid token signature/
  );
});
