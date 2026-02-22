/**
 * HTTP abstractions for framework-agnostic request handling.
 *
 * These interfaces allow the RPC handler to remain independent of a
 * specific server library while still being compatible with Express.
 */

/**
 * Represents a minimal HTTP request interface.
 */
export interface IHttpRequest {
  /**
   * Route parameters, such as controller keys.
   */
  params: Record<string, string | undefined>;

  /**
   * Request body payload.
   */
  body: unknown;

  /**
   * Request headers.
   */
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Represents a minimal HTTP response interface.
 */
export interface IHttpResponse {
  /**
   * Sets the HTTP status and returns the response for chaining.
   *
   * @param statusCode - HTTP status code to return.
   * @returns The response instance for chaining.
   */
  status(statusCode: number): IHttpResponse;

  /**
   * Sends a JSON payload to the client.
   *
   * @param payload - Serializable response body.
   */
  json(payload: unknown): void;
}

/**
 * Represents a next callback in middleware pipelines.
 *
 * @param error - Optional error to pass to upstream handlers.
 */
export type NextFunction = (error?: Error) => void;
