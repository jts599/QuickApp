/**
 * Session handling interfaces for JWT-based authentication.
 */

import { ISessionInfo } from "../context/types";
import { IHttpRequest } from "../http/types";

/**
 * Authentication credentials supplied during login.
 */
export interface IAuthCredentials {
  /**
   * Explicit user identifier, if available.
   */
  userId?: string;

  /**
   * Username supplied by the client.
   */
  username?: string;

  /**
   * Password supplied by the client.
   */
  password?: string;
}

/**
 * Session tokens issued by the authentication system.
 */
export interface ISessionTokens {
  /**
   * Access token used for authenticated calls.
   */
  accessToken: string;

  /**
   * Refresh token used to renew access tokens.
   */
  refreshToken: string;

  /**
   * Access token expiration timestamp in ISO format.
   */
  expiresAt: string;
}

/**
 * Result of an authentication attempt.
 */
export interface IAuthResult {
  /**
   * Session information for the authenticated user.
   */
  sessionInfo: ISessionInfo;

  /**
   * Tokens issued for the session.
   */
  tokens: ISessionTokens;
}

/**
 * Result of a session requirement check.
 */
export interface IRequireSessionResult {
  /**
   * Session information for the current request.
   */
  sessionInfo: ISessionInfo;

  /**
   * Fresh tokens issued for the request, if any.
   */
  refreshedTokens?: ISessionTokens;
}

/**
 * Responsible for authentication and session validation.
 */
export interface ISessionManager {
  /**
   * Authenticates a user and issues session tokens.
   *
   * @param credentials - Authentication credentials.
   * @returns Authentication result with session info and tokens.
   */
  authenticateUser(credentials: IAuthCredentials): Promise<IAuthResult>;

  /**
   * Creates a new session and issues tokens for a user.
   *
   * @param userId - Unique user identifier.
   * @param roles - Roles assigned to the session.
   * @returns Session tokens for the new session.
   */
  createSession(userId: string, roles: string[]): Promise<ISessionTokens>;

  /**
   * Retrieves roles for a given session.
   *
   * @param sessionInfo - Session information.
   * @returns Roles assigned to the session.
   */
  getUserRoles(sessionInfo: ISessionInfo): Promise<string[]>;

  /**
   * Extracts and validates the session from the incoming request.
   *
   * @param request - Incoming HTTP request.
   * @returns Session information and any refreshed tokens.
   */
  requireSession(request: IHttpRequest): Promise<IRequireSessionResult>;
}
