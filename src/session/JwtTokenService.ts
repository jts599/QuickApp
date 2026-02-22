/**
 * HS256 JWT implementation for local testing.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { IJwtClaims, ISignedToken, ITokenService } from "./tokenService.js";

/**
 * Configuration for the JWT token service.
 */
export interface IJwtTokenServiceConfig {
  /**
   * Shared secret used to sign tokens.
   */
  secret: string;

  /**
   * Optional issuer claim to embed and validate.
   */
  issuer?: string;

  /**
   * Optional audience claim to embed and validate.
   */
  audience?: string;
}

/**
 * Token service that signs and verifies HS256 JWTs.
 */
export class JwtTokenService implements ITokenService {
  private readonly config: IJwtTokenServiceConfig;

  /**
   * Creates a new JWT token service.
   *
   * @param config - Token service configuration.
   */
  constructor(config: IJwtTokenServiceConfig) {
    this.config = config;
  }

  /**
   * Signs an access token with the provided claims.
   *
   * @param claims - JWT claims for the access token.
   * @returns Signed access token.
   */
  async signAccessToken(claims: IJwtClaims): Promise<ISignedToken> {
    return this.signToken({ ...claims, typ: "access" });
  }

  /**
   * Signs a refresh token with the provided claims.
   *
   * @param claims - JWT claims for the refresh token.
   * @returns Signed refresh token.
   */
  async signRefreshToken(claims: IJwtClaims): Promise<ISignedToken> {
    return this.signToken({ ...claims, typ: "refresh" });
  }

  /**
   * Verifies an access token and returns its claims.
   *
   * @param token - Access token string.
   * @returns Parsed JWT claims.
   */
  async verifyAccessToken(token: string): Promise<IJwtClaims> {
    const claims = this.verifyToken(token);
    if (claims.typ !== "access") {
      throw new Error("Invalid token type.");
    }
    return this.stripTokenType(claims);
  }

  /**
   * Verifies a refresh token and returns its claims.
   *
   * @param token - Refresh token string.
   * @returns Parsed JWT claims.
   */
  async verifyRefreshToken(token: string): Promise<IJwtClaims> {
    const claims = this.verifyToken(token);
    if (claims.typ !== "refresh") {
      throw new Error("Invalid token type.");
    }
    return this.stripTokenType(claims);
  }

  private signToken(
    claims: IJwtClaims & { typ: "access" | "refresh" }
  ): ISignedToken {
    const header = this.encodeBase64Url({ alg: "HS256", typ: "JWT" });
    const payload = this.encodeBase64Url({
      ...claims,
      iss: this.config.issuer,
      aud: this.config.audience,
    });
    const signature = this.sign(`${header}.${payload}`);
    const token = `${header}.${payload}.${signature}`;

    return {
      token,
      expiresAt: new Date(claims.exp * 1000).toISOString(),
    };
  }

  private verifyToken(token: string): IJwtClaims & { typ?: string; iss?: string; aud?: string } {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Malformed token.");
    }

    const [header, payload, signature] = parts;
    const expected = this.sign(`${header}.${payload}`);
    if (!this.safeEquals(signature, expected)) {
      throw new Error("Invalid token signature.");
    }

    const claims = this.decodeBase64Url(payload) as IJwtClaims & {
      typ?: string;
      iss?: string;
      aud?: string;
    };

    if (this.config.issuer && claims.iss !== this.config.issuer) {
      throw new Error("Invalid token issuer.");
    }

    if (this.config.audience && claims.aud !== this.config.audience) {
      throw new Error("Invalid token audience.");
    }

    if (claims.exp * 1000 < Date.now()) {
      throw new Error("Token expired.");
    }

    return claims;
  }

  private stripTokenType(
    claims: IJwtClaims & { typ?: string; iss?: string; aud?: string }
  ): IJwtClaims {
    const { sub, sid, roles, exp } = claims;
    return { sub, sid, roles, exp };
  }

  private sign(data: string): string {
    return createHmac("sha256", this.config.secret)
      .update(data)
      .digest("base64url");
  }

  private safeEquals(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }
    return timingSafeEqual(aBuffer, bBuffer);
  }

  private encodeBase64Url(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
  }

  private decodeBase64Url(value: string): unknown {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  }
}
