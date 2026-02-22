/**
 * Client runtime primitives used by generated ViewController clients.
 */

/**
 * Recursively marks all properties as readonly.
 *
 * @typeParam TValue - Value type to wrap.
 */
export type DeepReadonly<TValue> = TValue extends (...args: never[]) => unknown
  ? TValue
  : TValue extends readonly (infer TItem)[]
    ? readonly DeepReadonly<TItem>[]
    : TValue extends object
      ? { readonly [TKey in keyof TValue]: DeepReadonly<TValue[TKey]> }
      : TValue;

/**
 * Request payload sent by generated clients.
 */
export interface IClientRpcRequest {
  /**
   * Request path.
   */
  path: string;

  /**
   * HTTP method.
   */
  method: "POST";

  /**
   * Serialized JSON payload.
   */
  body: { method: string; args: unknown };

  /**
   * Request headers.
   */
  headers: Record<string, string>;
}

/**
 * Response returned by runtime transport.
 */
export interface IClientRpcResponse {
  /**
   * HTTP status code.
   */
  status: number;

  /**
   * JSON response payload.
   */
  body: unknown;

  /**
   * Lowercase response header map.
   */
  headers: Record<string, string | undefined>;
}

/**
 * Transport abstraction for generated client requests.
 */
export interface IClientTransport {
  /**
   * Sends one RPC request.
   *
   * @param request - Request data.
   * @returns Transport response.
   */
  send(request: IClientRpcRequest): Promise<IClientRpcResponse>;
}

/**
 * Refreshed token bundle returned by server response headers.
 */
export interface IClientRefreshedTokens {
  /**
   * Refreshed access token.
   */
  accessToken: string;

  /**
   * Refreshed refresh token.
   */
  refreshToken: string;

  /**
   * Access token expiration timestamp.
   */
  expiresAt: string;
}

/**
 * Runtime configuration used by generated clients.
 */
export interface IClientRuntime {
  /**
   * Transport implementation.
   */
  transport: IClientTransport;

  /**
   * Optional route template containing `:key` placeholder.
   */
  routeTemplate?: string;

  /**
   * Optional static headers included in every request.
   */
  defaultHeaders?: Record<string, string>;

  /**
   * Optional access token provider.
   */
  getAccessToken?: () => string | undefined | Promise<string | undefined>;

  /**
   * Optional callback invoked when refreshed tokens are emitted.
   */
  onTokensRefreshed?: (
    tokens: IClientRefreshedTokens
  ) => void | Promise<void>;
}

/**
 * Client-visible callable response shape.
 *
 * @typeParam TResult - Callable result type.
 * @typeParam TViewData - Server-managed view data type.
 */
export interface IClientCallableResult<TResult, TViewData> {
  /**
   * Callable method result.
   */
  result: TResult;

  /**
   * Immutable copy of view data returned by the server.
   */
  viewData: DeepReadonly<TViewData>;
}

/**
 * Extracts the argument type for one static controller method.
 *
 * @typeParam TController - Static controller type.
 * @typeParam TMethodName - Method name key.
 */
export type ClientControllerMethodArgs<
  TController,
  TMethodName extends keyof TController,
> = TController[TMethodName] extends (
  args: infer TArgs,
  context: unknown
) => Promise<unknown>
  ? TArgs
  : never;

/**
 * Extracts the result type for one static controller method.
 *
 * @typeParam TController - Static controller type.
 * @typeParam TMethodName - Method name key.
 */
export type ClientControllerMethodResult<
  TController,
  TMethodName extends keyof TController,
> = TController[TMethodName] extends (
  args: unknown,
  context: unknown
) => Promise<infer TResult>
  ? TResult
  : never;

/**
 * Extracts view data type from static `createViewData` return type.
 *
 * @typeParam TController - Static controller type.
 */
export type ClientControllerViewData<TController> = TController extends {
  createViewData(context: unknown): Promise<infer TViewData>;
}
  ? TViewData
  : unknown;

/**
 * Error thrown when RPC response status indicates failure.
 */
export class ClientRpcError extends Error {
  /**
   * HTTP status code from server response.
   */
  readonly status: number;

  /**
   * Raw response payload.
   */
  readonly responseBody: unknown;

  /**
   * Creates a new client RPC error.
   *
   * @param status - HTTP status code.
   * @param responseBody - Response payload.
   */
  constructor(status: number, responseBody: unknown) {
    const message =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "error" in responseBody &&
      typeof (responseBody as { error?: unknown }).error === "string"
        ? (responseBody as { error: string }).error
        : `RPC request failed with status ${status}.`;

    super(message);
    this.name = "ClientRpcError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

/**
 * Resolves token headers from an RPC response.
 *
 * @param response - Transport response.
 * @returns Token bundle when complete headers exist.
 */
function readRefreshedTokens(response: IClientRpcResponse): IClientRefreshedTokens | undefined {
  const accessToken = response.headers["x-access-token"];
  const refreshToken = response.headers["x-refresh-token"];
  const expiresAt = response.headers["x-access-token-expires-at"];

  if (!accessToken || !refreshToken || !expiresAt) {
    return undefined;
  }

  return { accessToken, refreshToken, expiresAt };
}

/**
 * Resolves a route path from template and view key.
 *
 * @param template - Route template with `:key` placeholder.
 * @param viewKey - ViewController key.
 * @returns Request path.
 */
function resolvePath(template: string, viewKey: string): string {
  return template.replace(":key", encodeURIComponent(viewKey));
}

/**
 * Creates a sequential operation queue.
 *
 * @returns Queue function that serializes async operations.
 */
function createQueue(): <TValue>(operation: () => Promise<TValue>) => Promise<TValue> {
  let queue = Promise.resolve();

  return async function enqueue<TValue>(
    operation: () => Promise<TValue>
  ): Promise<TValue> {
    const run = queue.then(operation, operation);
    queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}

/**
 * Base class used by generated client-side ViewController wrappers.
 *
 * @typeParam TViewData - Server-managed view data type.
 */
export abstract class ClientViewControllerBase<TViewData> {
  private readonly runtime: IClientRuntime;
  private readonly viewKey: string;
  private readonly enqueue: <TValue>(operation: () => Promise<TValue>) => Promise<TValue>;

  /**
   * Creates a new generated client base instance.
   *
   * @param runtime - Client runtime dependencies.
   * @param viewKey - ViewController key.
   */
  constructor(runtime: IClientRuntime, viewKey: string) {
    this.runtime = runtime;
    this.viewKey = viewKey;
    this.enqueue = createQueue();
  }

  /**
   * Invokes one server callable method through the client runtime.
   *
   * @typeParam TResult - Callable result type.
   * @param methodName - RPC method key.
   * @param args - Method arguments.
   * @returns Method result and immutable view data snapshot.
   * @throws {ClientRpcError} When server returns non-success status.
   */
  protected async invokeMethod<TResult>(
    methodName: string,
    args: unknown
  ): Promise<IClientCallableResult<TResult, TViewData>> {
    return this.enqueue(async () => {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        ...(this.runtime.defaultHeaders ?? {}),
      };

      const accessToken = await this.runtime.getAccessToken?.();
      if (accessToken) {
        headers.authorization = `Bearer ${accessToken}`;
      }

      const response = await this.runtime.transport.send({
        path: resolvePath(this.runtime.routeTemplate ?? "/rpc/view/:key", this.viewKey),
        method: "POST",
        body: {
          method: methodName,
          args,
        },
        headers,
      });

      const refreshedTokens = readRefreshedTokens(response);
      if (refreshedTokens && this.runtime.onTokensRefreshed) {
        await this.runtime.onTokensRefreshed(refreshedTokens);
      }

      if (response.status < 200 || response.status >= 300) {
        throw new ClientRpcError(response.status, response.body);
      }

      return response.body as IClientCallableResult<TResult, TViewData>;
    });
  }

  /**
   * Loads server-managed view data for this view instance.
   *
   * This method explicitly invokes the reserved `__loadData` RPC call and returns
   * the same callable result shape used by generated methods.
   *
   * @returns Load result containing `null` method result and immutable view data.
   */
  async loadData(): Promise<IClientCallableResult<null, TViewData>> {
    return this.invokeMethod<null>("__loadData", null);
  }
}

/**
 * Fetch-like function signature used by fetch transport builder.
 */
export interface IFetchLike {
  /**
   * Executes an HTTP request.
   *
   * @param input - URL or path.
   * @param init - Request options.
   * @returns Fetch-like response.
   */
  (
    input: string,
    init: {
      method: "POST";
      headers: Record<string, string>;
      body: string;
    }
  ): Promise<{
    status: number;
    json(): Promise<unknown>;
    headers: { get(name: string): string | null };
  }>;
}

/**
 * Options for fetch transport creation.
 */
export interface ICreateFetchTransportOptions {
  /**
   * Optional base URL prefix for outgoing requests.
   */
  baseUrl?: string;

  /**
   * Optional fetch implementation override.
   */
  fetchImplementation?: IFetchLike;
}

/**
 * Creates a transport implementation backed by fetch.
 *
 * @param options - Fetch transport options.
 * @returns Runtime transport instance.
 */
export function createFetchClientTransport(
  options?: ICreateFetchTransportOptions
): IClientTransport {
  const fetchImplementation =
    options?.fetchImplementation ??
    ((globalThis as { fetch?: IFetchLike }).fetch as IFetchLike | undefined);

  if (!fetchImplementation) {
    throw new Error("No fetch implementation available.");
  }

  const baseUrl = options?.baseUrl ?? "";

  return {
    async send(request: IClientRpcRequest): Promise<IClientRpcResponse> {
      const response = await fetchImplementation(`${baseUrl}${request.path}`, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(request.body),
      });

      return {
        status: response.status,
        body: await response.json(),
        headers: {
          "x-access-token": response.headers.get("x-access-token") ?? undefined,
          "x-refresh-token": response.headers.get("x-refresh-token") ?? undefined,
          "x-access-token-expires-at":
            response.headers.get("x-access-token-expires-at") ?? undefined,
        },
      };
    },
  };
}
