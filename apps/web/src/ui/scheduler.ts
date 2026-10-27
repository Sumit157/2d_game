/**
 * Frame loop abstraction.
 *
 * The arena screen drives the fixed-timestep match loop through this so tests
 * can hand the loop deterministic timestamps instead of waiting on real frames.
 */
export interface Scheduler {
  /** Schedules `callback` for the next frame; returns a cancellation handle. */
  request(callback: (timeMs: number) => void): number;
  cancel(handle: number): void;
}

/** rAF-based scheduler with a timer fallback for environments without it. */
export function createRafScheduler(): Scheduler {
  const raf =
    typeof globalThis.requestAnimationFrame === 'function'
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : null;
  const cancelRaf =
    typeof globalThis.cancelAnimationFrame === 'function'
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : null;

  if (raf && cancelRaf) {
    return {
      request: (callback) => raf((timeMs) => callback(timeMs)),
      cancel: (handle) => cancelRaf(handle),
    };
  }

  return {
    request: (callback) => setTimeout(() => callback(Date.now()), 16) as unknown as number,
    cancel: (handle) => clearTimeout(handle),
  };
}
