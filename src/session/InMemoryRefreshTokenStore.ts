/**
 * In-memory refresh token store for the session stub.
 */

import { IJwtClaims } from "./tokenService";

/**
 * Stores refresh tokens in memory for validation.
 */
export class InMemoryRefreshTokenStore {
  private readonly refreshTokens = new Map<string, IJwtClaims>();

  /**
   * Saves a refresh token and its claims.
   *
   * @param token - Refresh token string.
   * @param claims - Claims associated with the token.
   */
  save(token: string, claims: IJwtClaims): void {
    this.refreshTokens.set(token, claims);
  }

  /**
   * Retrieves claims for a refresh token.
   *
   * @param token - Refresh token string.
   * @returns Stored claims or undefined.
   */
  get(token: string): IJwtClaims | undefined {
    return this.refreshTokens.get(token);
  }

  /**
   * Removes a refresh token from the store.
   *
   * @param token - Refresh token string.
   */
  delete(token: string): void {
    this.refreshTokens.delete(token);
  }
}
