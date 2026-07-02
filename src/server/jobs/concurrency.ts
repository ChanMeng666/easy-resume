/**
 * Dependency-free FIFO semaphore for the in-process v1 job runner.
 *
 * The public v1 API kicks each accepted job off as a detached background run.
 * Without a cap, a burst of POSTs means unbounded concurrent LLM call chains AND
 * unbounded concurrent `typst` subprocesses — the most likely way the single-VPS
 * monolith falls over. This bounds in-flight runs; excess jobs simply wait their
 * turn (their DB rows stay `queued`, which is exactly what pollers should see).
 *
 * Deliberately in-process (no Redis/queue service): the deploy is one long-lived
 * container, and the DB rows + stale-job sweeper already provide crash recovery.
 */

export interface Semaphore {
  /**
   * Run `fn` when a slot frees up (FIFO). The slot is always released — on
   * resolve OR reject — and the task's result/error propagates to the caller.
   */
  run<T>(fn: () => Promise<T> | T): Promise<T>;
  /** Currently executing task count (for tests/observability). */
  inFlight(): number;
  /** Tasks waiting for a slot (for tests/observability). */
  queued(): number;
}

/**
 * Create a FIFO semaphore with `limit` concurrent slots (clamped to >= 1).
 */
export function createSemaphore(limit: number): Semaphore {
  const max = Number.isInteger(limit) && limit >= 1 ? limit : 1;
  let inFlight = 0;
  const waiters: Array<() => void> = [];

  const acquire = (): Promise<void> => {
    if (inFlight < max) {
      inFlight += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      waiters.push(() => {
        inFlight += 1;
        resolve();
      });
    });
  };

  const release = (): void => {
    inFlight -= 1;
    const next = waiters.shift();
    if (next) next();
  };

  return {
    async run<T>(fn: () => Promise<T> | T): Promise<T> {
      await acquire();
      try {
        return await fn();
      } finally {
        release();
      }
    },
    inFlight: () => inFlight,
    queued: () => waiters.length,
  };
}
