/**
 * In-memory session manager stub for JWT-based authentication.
 */

import { ISessionInfo } from "../context/types";
import { IHttpRequest } from "../http/types";
import {
  IAuthCredentials,
  IAuthResult,
  IRequireSessionResult,
  ISessionManager,
  ISessionTokens,
} from "./types";
import { IJwtClaims, ITokenService } from "./tokenService";
import { InMemoryRefreshTokenStore } from "./InMemoryRefreshTokenStore";

/**
 * Configuration for the in-memory session manager.
 */
export interface IInMemorySessionManagerConfig {
  /**
   * Access token TTL in seconds.
   */
  accessTokenTtlSeconds: number;

  /**
   * Refresh token TTL in seconds.
   */
  refreshTokenTtlSeconds: number;

  /**
   * Default roles to apply when none are supplied.
   */
  defaultRoles: string[];
}

/**
 * Simple JWT-based session manager backed by in-memory refresh token storage.
 */
export class InMemorySessionManager implements ISessionManager {
  private readonly tokenService: ITokenService;
  private readonly refreshTokenStore: InMemoryRefreshTokenStore;
  private readonly config: IInMemorySessionManagerConfig;

  /**
   * Creates a new in-memory session manager.
   *
   * @param tokenService - Token service used to sign and verify JWTs.
   * @param refreshTokenStore - Refresh token store.
   * @param config - Session manager configuration.
   */
  constructor(
    tokenService: ITokenService,
    refreshTokenStore: InMemoryRefreshTokenStore,
    config: IInMemorySessionManagerConfig
  ) {
    this.tokenService = tokenService;
    this.refreshTokenStore = refreshTokenStore;
    this.config = config;
  }

  /**
   * Authenticates a user and issues session tokens.
   *
   * @param credentials - Authentication credentials.
   * @returns Authentication result with session info and tokens.
   */
  async authenticateUser(credentials: IAuthCredentials): Promise<IAuthResult> {
    const userId = this.resolveUserId(credentials);
    const roles = this.config.defaultRoles;
    const tokens = await this.createSession(userId, roles);

    return {
      sessionInfo: {
        userId,
        sessionId: this.extractSessionId(tokens.accessToken),
        roles,
      },
      tokens,
    };
  }

  /**
   * Creates a new session and issues tokens for a user.
   *
   * @param userId - Unique user identifier.
   * @param roles - Roles assigned to the session.
   * @returns Session tokens for the new session.
   */
  async createSession(userId: string, roles: string[]): Promise<ISessionTokens> {
    const sessionId = this.generateSessionId(userId);
    const accessClaims = this.buildClaims(userId, sessionId, roles, this.config.accessTokenTtlSeconds);
    const refreshClaims = this.buildClaims(userId, sessionId, roles, this.config.refreshTokenTtlSeconds);

    const accessToken = await this.tokenService.signAccessToken(accessClaims);
    const refreshToken = await this.tokenService.signRefreshToken(refreshClaims);

    this.refreshTokenStore.save(refreshToken.token, refreshClaims);

    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      expiresAt: accessToken.expiresAt,
    };
  }

  /**
   * Retrieves roles for a given session.
   *
   * @param sessionInfo - Session information.
   * @returns Roles assigned to the session.
   */
  async getUserRoles(sessionInfo: ISessionInfo): Promise<string[]> {
    return sessionInfo.roles ?? [];
  }

  /**
   * Extracts and validates the session from the incoming request.
   *
   * @param request - Incoming HTTP request.
   * @returns Session information and refreshed tokens.
   */
  async requireSession(request: IHttpRequest): Promise<IRequireSessionResult> {
    const accessToken = this.extractAccessToken(request);
    const claims = await this.tokenService.verifyAccessToken(accessToken);

    const sessionInfo: ISessionInfo = {
      userId: claims.sub,
      sessionId: claims.sid,
      roles: claims.roles,
    };

    const refreshedTokens = await this.createSession(claims.sub, claims.roles);

    return {
      sessionInfo,
      refreshedTokens,
    };
  }

  private resolveUserId(credentials: IAuthCredentials): string {
    return credentials.userId ?? credentials.username ?? "anonymous";
  }

  private generateSessionId(userId: string): string {
    const timestamp = Date.now();
    return `${userId}-${timestamp}`;
  }

  private buildClaims(
    userId: string,
    sessionId: string,
    roles: string[],
    ttlSeconds: number
  ): IJwtClaims {
    const expiresAt = Math.floor((Date.now() + ttlSeconds * 1000) / 1000);
    return {
      sub: userId,
      sid: sessionId,
      roles,
      exp: expiresAt,
    };
  }

  private extractAccessToken(request: IHttpRequest): string {
    const header = request.headers["authorization"];
    if (!header || Array.isArray(header)) {
      throw new Error("Missing Authorization header.");
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new Error("Invalid Authorization header format.");
    }

    return token;
  }

  private extractSessionId(accessToken: string): string {
    const parts = accessToken.split(".");
    if (parts.length < 2) {
      return "unknown";
    }

    return parts[1];
  }
}
