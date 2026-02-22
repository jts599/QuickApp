/**
 * Sample Express server wiring for the ViewController RPC handler.
 */

import express from "express";
import { randomUUID } from "crypto";
import {
  registerViewRpcRoutes,
  InMemoryRefreshTokenStore,
  InMemorySessionManager,
  JwtTokenService,
  ViewLockManager,
} from "../../src/index.js";
import { SqliteViewDataStore } from "../../src/viewController/viewDataStore.js";
import { SampleViewController } from "./sample.js";
import { IntegrationTestViewController } from "./integrationTestController.js";

/**
 * Represents the minimal database interface required by the SQLite ViewData store.
 */
interface ISampleDatabase {
  /**
   * Prepares a SQL statement for execution.
   *
   * @param sql - SQL statement.
   * @returns Prepared statement.
   */
  prepare<TParams extends unknown[], TResult>(sql: string): {
    /**
     * Executes a statement that returns a single row.
     *
     * @param params - Parameters to bind in order.
     * @returns The row result or undefined.
     */
    get(...params: TParams): TResult | undefined;

    /**
     * Executes a statement that mutates data.
     *
     * @param params - Parameters to bind in order.
     */
    run(...params: TParams): void;
  };
}

/**
 * Creates a sample Express server with RPC wiring.
 *
 * @param database - SQLite database instance used for ViewData persistence.
 * @returns Configured Express app.
 */
export function createSampleServer(database: ISampleDatabase): express.Express {
  void SampleViewController;
  void IntegrationTestViewController;

  const app = express();
  app.use(express.json());

  const tokenService = new JwtTokenService({
    secret: "dev-secret",
    issuer: "quickapp-local",
    audience: "quickapp-client",
  });

  const sessionManager = new InMemorySessionManager(
    tokenService,
    new InMemoryRefreshTokenStore(),
    {
      accessTokenTtlSeconds: 1800,
      refreshTokenTtlSeconds: 7200,
      defaultRoles: ["defaultRole"],
    }
  );

  registerViewRpcRoutes(app, {
    sessionManager,
    viewDataStore: new SqliteViewDataStore(database),
    lockManager: new ViewLockManager(),
    databaseConnection: database,
    logger: console,
    requestIdFactory: () => randomUUID(),
  });

  return app;
}
