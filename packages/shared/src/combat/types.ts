/**
 * Combat simulation types.
 *
 * The simulation is pure data + rules: it never touches the DOM, Phaser or
 * the network, so the exact same code runs locally (Phase 2), under the
 * authoritative server (Phase 4) and inside unit tests.
 */

/** Which fighter of the pair an index refers to. */
export type FighterIndex = 0 | 1;

/** Lifecycle state of a single fighter (see `docs/03_SYSTEM_DESIGN.md`). */
export type FighterAction =
  | 'idle'
  | 'moving'
  | 'jumping'
  | 'blocking'
  | 'startup'
  | 'active'
  | 'recovery'
  | 'hitstun'
  | 'defeated';

/** Match lifecycle (see `docs/03_SYSTEM_DESIGN.md`). */
export type MatchPhase = 'countdown' | 'round-active' | 'round-result' | 'match-result';

/**
 * Abstract input intent for one tick.
 *
 * Clients submit intent only — never damage, position claims or round
 * outcomes. Attack and jump are treated as *held* flags; the engine performs
 * edge detection itself so keyboard, touch and server-replayed input behave
 * identically.
 */
export interface InputIntent {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  block: boolean;
  light: boolean;
  heavy: boolean;
}

export const IDLE_INTENT: InputIntent = {
  moveLeft: false,
  moveRight: false,
  jump: false,
  block: false,
  light: false,
  heavy: false,
};

export interface FighterState {
  characterId: string;
  /** Horizontal centre, stage pixels. */
  x: number;
  /** Feet position; `PHYSICS.groundY` is the floor. */
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  health: number;
  maxHealth: number;
  grounded: boolean;
  action: FighterAction;
  /** Ticks remaining in the current startup/active/recovery/hitstun phase. */
  actionTimer: number;
  /** Move currently being performed, if any. */
  moveId: string | null;
  /** True once the active phase has connected (one hit per move instance). */
  hitApplied: boolean;
  hitstunTicks: number;
  /** Brief lockout after landing that blocks attack startup. */
  landingTicks: number;
  /** moveId -> ticks until it may start again. */
  cooldowns: Record<string, number>;
  /** Previous tick's held flags, for edge detection. */
  prevIntent: { jump: boolean; light: boolean; heavy: boolean };
}

export type RoundEndReason = 'health' | 'timer';

export interface RoundResult {
  winnerIndex: FighterIndex | null;
  reason: RoundEndReason;
  round: number;
}

export interface MatchState {
  phase: MatchPhase;
  stageId: string;
  tickRate: number;
  /** 1-based round number currently being played or resolved. */
  round: number;
  /** Ticks left in the current round's clock. */
  roundTicksLeft: number;
  /** Ticks left in the countdown / round-result interstitials. */
  countdownTicks: number;
  resultTicks: number;
  scores: [number, number];
  fighters: [FighterState, FighterState];
  /** Ticks of frozen simulation after a connected hit (hit-stop). */
  hitstopTicks: number;
  lastRoundResult: RoundResult | null;
  /** Set once the match reaches `ROUNDS_TO_WIN`. */
  winnerIndex: FighterIndex | null;
}

/** Presentation events produced by a tick. Never fed back into the rules. */
export type CombatEvent =
  | { type: 'round-start'; round: number }
  | {
      type: 'hit';
      attackerIndex: FighterIndex;
      defenderIndex: FighterIndex;
      moveId: string;
      damage: number;
      blocked: boolean;
      /** Defender position, for spawning effects. */
      x: number;
      y: number;
    }
  | { type: 'round-end'; winnerIndex: FighterIndex | null; reason: RoundEndReason; round: number }
  | { type: 'match-end'; winnerIndex: FighterIndex };
