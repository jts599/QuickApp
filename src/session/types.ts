/**
 * Session handling interfaces for JWT-based authentication.
 */

import { ISessionInfo } from "../context/types";
import { IHttpRequest } from "../http/types";

/**
 * Responsible for extracting and validating session information.
 */
export interface ISessionManager {
  /**
   * Extracts the session from the incoming request, refreshing it if needed.
   *
   * @param request - Incoming HTTP request.
   * @returns Valid session information.
   */
  requireSession(request: IHttpRequest): Promise<ISessionInfo>;
}
