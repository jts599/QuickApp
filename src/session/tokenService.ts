/**
 * Token service interface for signing and verifying JWTs.
 */

/**
 * Standardized JWT claims for sessions.
 */
export interface IJwtClaims {
  /**
   * User identifier.
   */
  sub: string;

  /**
   * Session identifier.
   */
  sid: string;

  /**
   * Roles associated with the session.
   */
  roles: string[];

  /**
   * Expiration time in unix seconds.
   */
  exp: number;
}

/**
 * Signed token output with expiration.
 */
export interface ISignedToken {
  /**
   * Encoded token string.
   */
  token: string;

  /**
   * Expiration timestamp in ISO format.
   */
  expiresAt: string;
}

/**
 * Token service for signing and verifying JWTs.
 */
export interface ITokenService {
  /**
   * Signs an access token with the provided claims.
   *
   * @param claims - JWT claims for the access token.
   * @returns Signed access token.
   */
  signAccessToken(claims: IJwtClaims): Promise<ISignedToken>;

  /**
   * Signs a refresh token with the provided claims.
   *
   * @param claims - JWT claims for the refresh token.
   * @returns Signed refresh token.
   */
  signRefreshToken(claims: IJwtClaims): Promise<ISignedToken>;

  /**
   * Verifies an access token and returns its claims.
   *
   * @param token - Access token string.
   * @returns Parsed JWT claims.
   */
  verifyAccessToken(token: string): Promise<IJwtClaims>;

  /**
   * Verifies a refresh token and returns its claims.
   *
   * @param token - Refresh token string.
   * @returns Parsed JWT claims.
   */
  verifyRefreshToken(token: string): Promise<IJwtClaims>;
}
