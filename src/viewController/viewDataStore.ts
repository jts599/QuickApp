/**
 * ViewData persistence abstractions and SQLite-backed implementation.
 */

/**
 * Represents the persisted view data record.
 */
export interface IViewDataRecord {
  /**
   * Serialized view data JSON.
   */
  data: string;

  /**
   * Timestamp of the last update.
   */
  updatedAt: Date;
}

/**
 * Store interface for persisting ViewData across calls.
 */
export interface IViewDataStore {
  /**
   * Loads the serialized ViewData for a session and view key.
   *
   * @param sessionId - Session identifier.
   * @param viewKey - ViewController key.
   * @returns The record or undefined if not found.
   */
  load(sessionId: string, viewKey: string): Promise<IViewDataRecord | undefined>;

  /**
   * Saves the serialized ViewData for a session and view key.
   *
   * @param sessionId - Session identifier.
   * @param viewKey - ViewController key.
   * @param data - Serialized ViewData JSON.
   */
  save(sessionId: string, viewKey: string, data: string): Promise<void>;

  /**
   * Deletes persisted ViewData for a session and view key.
   *
   * @param sessionId - Session identifier.
   * @param viewKey - ViewController key.
   */
  delete(sessionId: string, viewKey: string): Promise<void>;
}

/**
 * Minimal database interface compatible with SQLite clients.
 */
export interface ISqliteDatabase {
  /**
   * Prepares a SQL statement for execution.
   *
   * @param sql - SQL statement.
   * @returns Prepared statement.
   */
  prepare<TParams extends unknown[], TResult>(sql: string): ISqliteStatement<TParams, TResult>;
}

/**
 * Represents a prepared SQLite statement.
 */
export interface ISqliteStatement<TParams extends unknown[], TResult> {
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
}

/**
 * SQLite-backed ViewData store using JSON storage.
 */
export class SqliteViewDataStore implements IViewDataStore {
  private readonly database: ISqliteDatabase;

  /**
   * Creates a new SQLite view data store.
   *
   * @param database - SQLite database instance.
   */
  constructor(database: ISqliteDatabase) {
    this.database = database;
  }

  /**
   * Loads serialized view data from SQLite.
   *
   * @param sessionId - Session identifier.
   * @param viewKey - ViewController key.
   * @returns The record or undefined if not found.
   */
  async load(sessionId: string, viewKey: string): Promise<IViewDataRecord | undefined> {
    const statement = this.database.prepare<
      [string, string],
      { data: string; updated_at: string }
    >(
      "SELECT data, updated_at FROM view_data WHERE session_id = ? AND view_key = ?"
    );
    const row = statement.get(sessionId, viewKey);
    if (!row) {
      return undefined;
    }
    return { data: row.data, updatedAt: new Date(row.updated_at) };
  }

  /**
   * Saves serialized view data to SQLite.
   *
   * @param sessionId - Session identifier.
   * @param viewKey - ViewController key.
   * @param data - Serialized JSON data.
   */
  async save(sessionId: string, viewKey: string, data: string): Promise<void> {
    const statement = this.database.prepare<[string, string, string]>(
      "INSERT INTO view_data (session_id, view_key, data, updated_at) VALUES (?, ?, ?, datetime('now')) " +
        "ON CONFLICT(session_id, view_key) DO UPDATE SET data = excluded.data, updated_at = datetime('now')"
    );
    statement.run(sessionId, viewKey, data);
  }

  /**
   * Deletes persisted view data from SQLite.
   *
   * @param sessionId - Session identifier.
   * @param viewKey - ViewController key.
   */
  async delete(sessionId: string, viewKey: string): Promise<void> {
    const statement = this.database.prepare<[string, string]>(
      "DELETE FROM view_data WHERE session_id = ? AND view_key = ?"
    );
    statement.run(sessionId, viewKey);
  }
}
