import {
  createMatch,
  stepMatch,
  type CombatEvent,
  type InputIntent,
  type MatchState,
  type MatchConfig,
} from '@desi-fighter/shared';

/**
 * Owns one authoritative `MatchState` and its presentation event queue.
 *
 * The runner is deliberately rendering-agnostic: the arena screen drives it
 * from a fixed-timestep loop and the Phaser scene only ever *reads* the state
 * it exposes. Server authority in Phase 4 reuses the same shared engine with
 * the runner living on the server instead.
 */
export interface MatchRunner {
  /** Live state; mutate nothing from outside. */
  readonly state: MatchState;
  /** Advances exactly one tick with both players' intents. */
  step(intents: readonly [InputIntent, InputIntent]): void;
  /** Drains events produced since the last drain (hit sparks, round flow). */
  drainEvents(): CombatEvent[];
  /** Starts a fresh match with the same configuration (rematch). */
  restart(): void;
}

export function createMatchRunner(config: MatchConfig): MatchRunner {
  let state = createMatch(config);
  let queue: CombatEvent[] = [];

  return {
    get state() {
      return state;
    },
    step(intents) {
      queue.push(...stepMatch(state, intents));
    },
    drainEvents() {
      const events = queue;
      queue = [];
      return events;
    },
    restart() {
      state = createMatch(config);
      queue = [];
    },
  };
}
