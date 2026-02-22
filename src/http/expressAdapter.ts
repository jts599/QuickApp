/**
 * Express adapter for the ViewController RPC handler.
 */

import { IHttpRequest, IHttpResponse, NextFunction } from "./types.js";

/**
 * Minimal shape of an Express request used by the adapter.
 */
export interface IExpressRequest {
  /**
   * Route parameters from Express.
   */
  params: Record<string, string | undefined>;

  /**
   * Request body parsed by Express middleware.
   */
  body: unknown;

  /**
   * Request headers.
   */
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Minimal shape of an Express response used by the adapter.
 */
export interface IExpressResponse {
  /**
   * Sets the response status code.
   *
   * @param statusCode - HTTP status code.
   * @returns The response instance for chaining.
   */
  status(statusCode: number): IExpressResponse;

  /**
   * Sends a JSON response body.
   *
   * @param payload - Response payload.
   */
  json(payload: unknown): void;

  /**
   * Sets a response header.
   *
   * @param name - Header name.
   * @param value - Header value.
   */
  setHeader(name: string, value: string): void;
}

/**
 * Express-style handler signature.
 */
export type ExpressHandler = (
  request: IExpressRequest,
  response: IExpressResponse,
  next: NextFunction
) => void | Promise<void>;

/**
 * Wraps a framework RPC handler for use with Express.
 *
 * @param handler - Framework RPC handler built from `createViewRpcHandler`.
 * @returns Express-compatible handler.
 */
export function createExpressViewRpcHandler(
  handler: (request: IHttpRequest, response: IHttpResponse, next?: NextFunction) => Promise<void>
): ExpressHandler {
  return async function expressViewRpcHandler(
    request: IExpressRequest,
    response: IExpressResponse,
    next: NextFunction
  ): Promise<void> {
    const adaptedRequest: IHttpRequest = {
      params: request.params,
      body: request.body,
      headers: request.headers,
    };

    const adaptedResponse: IHttpResponse = {
      status: (statusCode: number) => response.status(statusCode),
      json: (payload: unknown) => response.json(payload),
      setHeader: (name: string, value: string) => response.setHeader(name, value),
    };

    await handler(adaptedRequest, adaptedResponse, next);
  };
}
