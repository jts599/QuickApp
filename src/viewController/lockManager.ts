/**
 * Per-session view lock manager to serialize calls.
 */

/**
 * Represents a releaser function for an acquired lock.
 */
export type LockRelease = () => void;

/**
 * Manages locks for session/view pairs to prevent concurrent mutations.
 */
export class ViewLockManager {
  private readonly locks = new Map<string, Promise<void>>();

  /**
   * Acquires a lock for the given session and view key.
   *
   * @param sessionId - Session identifier.
   * @param viewKey - ViewController key.
   * @returns A releaser function that must be called to release the lock.
   */
  async acquire(sessionId: string, viewKey: string): Promise<LockRelease> {
    const lockKey = `${sessionId}:${viewKey}`;
    const current = this.locks.get(lockKey) ?? Promise.resolve();

    let release: LockRelease = () => undefined;
    const next = new Promise<void>((resolve) => {
      release = () => {
        resolve();
        if (this.locks.get(lockKey) === next) {
          this.locks.delete(lockKey);
        }
      };
    });

    this.locks.set(lockKey, current.then(() => next));
    await current;
    return release;
  }
}
