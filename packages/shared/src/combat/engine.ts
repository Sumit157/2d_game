/**
 * Deterministic fighting-game simulation.
 *
 * `stepMatch` mutates the `MatchState` it is given (the loop owns the state)
 * and returns the presentation events produced by that tick. The rules never
 * read rendering, audio or network code, so the client (Phase 2), the
 * authoritative server (Phase 4) and the tests all run this exact module.
 *
 * Tick contract: one call = one tick at `state.tickRate` (default
 * `DEFAULT_TICK_RATE`). Clients submit input intent only; damage, position
 * and round outcomes are decided here.
 */

import { DEFAULT_ROUND_SECONDS, DEFAULT_TICK_RATE, ROUNDS_TO_WIN } from '../constants.js';
import { DEFAULT_CHARACTER_ID, getCharacter } from '../roster.js';
import { DEFAULT_STAGE_ID, getStage } from '../stages.js';
import { PHYSICS, TIMING, healthForStat } from './balance.js';
import { getMove, getMoveById } from './moves.js';
import type {
  CombatEvent,
  FighterIndex,
  FighterState,
  InputIntent,
  MatchState,
  RoundEndReason,
} from './types.js';

export interface MatchConfig {
  /** Character id per fighter slot. Unknown ids fall back to the default. */
  characters: readonly [string, string];
  stageId: string;
  /** Ticks per second; defaults to `DEFAULT_TICK_RATE`. */
  tickRate?: number;
}

const SPAWN_OFFSET = 170;

function resolveCharacterId(id: string): string {
  return getCharacter(id) ? id : DEFAULT_CHARACTER_ID;
}

function resolveStageId(id: string): string {
  return getStage(id) ? id : DEFAULT_STAGE_ID;
}

export function createFighter(characterId: string, x: number, facing: 1 | -1): FighterState {
  const character = getCharacter(characterId);
  const maxHealth = healthForStat(character?.stats.health ?? 3);
  return {
    characterId,
    x,
    y: PHYSICS.groundY,
    vx: 0,
    vy: 0,
    facing,
    health: maxHealth,
    maxHealth,
    grounded: true,
    action: 'idle',
    actionTimer: 0,
    moveId: null,
    hitApplied: false,
    hitstunTicks: 0,
    landingTicks: 0,
    cooldowns: {},
    prevIntent: { jump: false, light: false, heavy: false },
  };
}

/** Builds a fresh match in the countdown phase. Use it again for rematch. */
export function createMatch(config: MatchConfig): MatchState {
  const tickRate = config.tickRate ?? DEFAULT_TICK_RATE;
  const stageId = resolveStageId(config.stageId);
  const [leftId, rightId] = config.characters;
  const characters: [string, string] = [resolveCharacterId(leftId), resolveCharacterId(rightId)];

  return {
    phase: 'countdown',
    stageId,
    tickRate,
    round: 1,
    roundTicksLeft: DEFAULT_ROUND_SECONDS * tickRate,
    countdownTicks: TIMING.countdownTicks,
    resultTicks: 0,
    scores: [0, 0],
    fighters: [
      createFighter(characters[0], PHYSICS.stageLeft + SPAWN_OFFSET, 1),
      createFighter(characters[1], PHYSICS.stageRight - SPAWN_OFFSET, -1),
    ],
    hitstopTicks: 0,
    lastRoundResult: null,
    winnerIndex: null,
  };
}

/**
 * Advances the match by exactly one tick.
 *
 * Mutates `state` in place and returns this tick's events. Safe to call for
 * every phase: interstitial phases simply count down, and the match-result
 * phase is a no-op until the UI starts a rematch.
 */
export function stepMatch(
  state: MatchState,
  intents: readonly [InputIntent, InputIntent],
): CombatEvent[] {
  const events: CombatEvent[] = [];

  switch (state.phase) {
    case 'countdown': {
      state.countdownTicks -= 1;
      if (state.countdownTicks <= 0) {
        state.phase = 'round-active';
        events.push({ type: 'round-start', round: state.round });
      }
      return events;
    }

    case 'round-active': {
      if (state.hitstopTicks > 0) {
        state.hitstopTicks -= 1;
        return events;
      }

      stepFighters(state, intents, events);
      state.roundTicksLeft -= 1;

      const [left, right] = state.fighters;
      if (left.health <= 0 || right.health <= 0) {
        endRound(state, healthWinner(state), 'health', events);
      } else if (state.roundTicksLeft <= 0) {
        endRound(state, timerWinner(state), 'timer', events);
      }
      return events;
    }

    case 'round-result': {
      state.resultTicks -= 1;
      if (state.resultTicks <= 0) {
        advanceAfterRound(state, events);
      }
      return events;
    }

    case 'match-result': {
      return events;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Round lifecycle                                                     */
/* ------------------------------------------------------------------ */

function healthWinner(state: MatchState): FighterIndex | null {
  const [left, right] = state.fighters;
  if (left.health <= 0 && right.health <= 0) return null;
  return right.health <= 0 ? 0 : 1;
}

function timerWinner(state: MatchState): FighterIndex | null {
  // Compare remaining health *percentage* — fighters have different maximums.
  const [left, right] = state.fighters;
  const leftRatio = left.health / left.maxHealth;
  const rightRatio = right.health / right.maxHealth;
  if (Math.abs(leftRatio - rightRatio) < 1e-9) return null;
  return leftRatio > rightRatio ? 0 : 1;
}

function endRound(
  state: MatchState,
  winnerIndex: FighterIndex | null,
  reason: RoundEndReason,
  events: CombatEvent[],
): void {
  if (winnerIndex !== null) {
    state.scores[winnerIndex] += 1;
  }
  for (const fighter of state.fighters) {
    if (fighter.health <= 0) {
      fighter.action = 'defeated';
      fighter.vx = 0;
      fighter.vy = 0;
      fighter.moveId = null;
      fighter.actionTimer = 0;
    }
  }
  state.lastRoundResult = { winnerIndex, reason, round: state.round };
  state.phase = 'round-result';
  state.resultTicks = TIMING.roundResultTicks;
  events.push({ type: 'round-end', winnerIndex, reason, round: state.round });
}

function advanceAfterRound(state: MatchState, events: CombatEvent[]): void {
  const [left, right] = state.scores;
  if (left >= ROUNDS_TO_WIN || right >= ROUNDS_TO_WIN) {
    state.phase = 'match-result';
    state.winnerIndex = left >= ROUNDS_TO_WIN ? 0 : 1;
    events.push({ type: 'match-end', winnerIndex: state.winnerIndex });
    return;
  }
  startNextRound(state);
}

function startNextRound(state: MatchState): void {
  const [left, right] = state.fighters;
  state.round += 1;
  state.roundTicksLeft = DEFAULT_ROUND_SECONDS * state.tickRate;
  state.countdownTicks = TIMING.countdownTicks;
  state.resultTicks = 0;
  state.hitstopTicks = 0;
  state.lastRoundResult = null;
  state.fighters = [
    createFighter(left.characterId, PHYSICS.stageLeft + SPAWN_OFFSET, 1),
    createFighter(right.characterId, PHYSICS.stageRight - SPAWN_OFFSET, -1),
  ];
  state.phase = 'countdown';
}

/* ------------------------------------------------------------------ */
/* Fighter step                                                        */
/* ------------------------------------------------------------------ */

function stepFighters(
  state: MatchState,
  intents: readonly [InputIntent, InputIntent],
  events: CombatEvent[],
): void {
  for (let index = 0 as FighterIndex; index < 2; index = (index + 1) as FighterIndex) {
    const fighter = state.fighters[index];
    tickCooldowns(fighter);
    if (fighter.landingTicks > 0) {
      fighter.landingTicks -= 1;
    }

    const intent = intents[index];
    const jumpPressed = intent.jump && !fighter.prevIntent.jump;
    const lightPressed = intent.light && !fighter.prevIntent.light;
    const heavyPressed = intent.heavy && !fighter.prevIntent.heavy;
    fighter.prevIntent = { jump: intent.jump, light: intent.light, heavy: intent.heavy };

    if (fighter.action === 'defeated') {
      continue;
    }

    tickActionPhase(fighter);

    if (fighter.hitstunTicks > 0) {
      fighter.hitstunTicks -= 1;
      if (fighter.hitstunTicks === 0) {
        fighter.action = fighter.grounded ? 'idle' : 'jumping';
      }
      continue;
    }

    applyControl(fighter, intent, { jumpPressed, lightPressed, heavyPressed });
  }

  for (const fighter of state.fighters) {
    applyPhysics(fighter);
  }

  updateFacing(state);
  separateFighters(state);
  detectHits(state, events);
}

function tickCooldowns(fighter: FighterState): void {
  for (const moveId of Object.keys(fighter.cooldowns)) {
    const remaining = fighter.cooldowns[moveId] ?? 0;
    if (remaining <= 1) {
      delete fighter.cooldowns[moveId];
    } else {
      fighter.cooldowns[moveId] = remaining - 1;
    }
  }
}

function isBusy(action: FighterState['action']): boolean {
  return action === 'startup' || action === 'active' || action === 'recovery';
}

/**
 * Advances a committed move one tick: startup -> active -> recovery -> idle.
 * Runs before hit detection, so the tick a move enters its active phase is
 * also the first tick its hitbox can connect.
 */
function tickActionPhase(fighter: FighterState): void {
  if (!isBusy(fighter.action)) return;

  fighter.actionTimer -= 1;
  if (fighter.actionTimer > 0) return;

  if (fighter.action === 'startup') {
    fighter.action = 'active';
    fighter.actionTimer = getMoveById(fighter.moveId ?? '')?.activeTicks ?? 1;
    return;
  }
  if (fighter.action === 'active') {
    fighter.action = 'recovery';
    fighter.actionTimer = getMoveById(fighter.moveId ?? '')?.recoveryTicks ?? 1;
    return;
  }
  fighter.action = fighter.grounded ? 'idle' : 'jumping';
  fighter.actionTimer = 0;
  fighter.moveId = null;
  fighter.hitApplied = false;
}

function applyControl(
  fighter: FighterState,
  intent: InputIntent,
  pressed: { jumpPressed: boolean; lightPressed: boolean; heavyPressed: boolean },
): void {
  const grounded = fighter.grounded;
  const busy = isBusy(fighter.action);
  const canAct = !busy && fighter.landingTicks === 0;

  // Attacks: grounded only, never mid-move, never during landing lag.
  if (canAct && grounded) {
    const moveId = pressed.heavyPressed
      ? pickMove(fighter, 'heavy')
      : pressed.lightPressed
        ? pickMove(fighter, 'light')
        : undefined;
    if (moveId) {
      startMove(fighter, moveId);
      return;
    }
  }

  // Blocking: grounded, holds the whole time, auto-faces the opponent.
  if (canAct && grounded && intent.block) {
    fighter.action = 'blocking';
    fighter.vx = 0;
    return;
  }
  if (grounded && fighter.action === 'blocking') {
    // Button released: the stance drops before movement is read below.
    fighter.action = 'idle';
  }

  // Jump: only from the floor, cancelled by nothing but its own edge.
  if (canAct && grounded && pressed.jumpPressed) {
    fighter.grounded = false;
    fighter.vy = PHYSICS.jumpVelocity;
    fighter.action = 'jumping';
  }

  // Horizontal control (ignored while committing to a move or blocking).
  const direction = (intent.moveRight ? 1 : 0) - (intent.moveLeft ? 1 : 0);
  if (busy || fighter.action === 'blocking') {
    return;
  }
  const speed = fighter.grounded ? PHYSICS.moveSpeed : PHYSICS.airMoveSpeed;
  if (direction !== 0) {
    fighter.vx = direction * speed;
    if (fighter.grounded) {
      fighter.action = 'moving';
    }
  } else if (fighter.grounded) {
    fighter.vx = 0;
    if (fighter.action === 'moving') {
      fighter.action = 'idle';
    }
  }
}

function pickMove(fighter: FighterState, kind: 'light' | 'heavy'): string | undefined {
  const move = getMove(fighter.characterId, kind);
  if (!move) return undefined;
  const onCooldown = (fighter.cooldowns[move.id] ?? 0) > 0;
  return onCooldown ? undefined : move.id;
}

function startMove(fighter: FighterState, moveId: string): void {
  const move = getMoveById(moveId);
  if (!move) return;
  fighter.action = 'startup';
  fighter.actionTimer = move.startupTicks;
  fighter.moveId = move.id;
  fighter.hitApplied = false;
  fighter.vx = 0;
  fighter.cooldowns[move.id] = move.cooldownTicks;
}

function applyPhysics(fighter: FighterState): void {
  if (!fighter.grounded) {
    fighter.vy = Math.min(fighter.vy + PHYSICS.gravity, PHYSICS.maxFallSpeed);
    fighter.x += fighter.vx;
    fighter.y += fighter.vy;
    if (fighter.y >= PHYSICS.groundY) {
      fighter.y = PHYSICS.groundY;
      fighter.vy = 0;
      fighter.grounded = true;
      if (fighter.action === 'jumping') {
        fighter.action = 'idle';
        fighter.landingTicks = TIMING.landingTicks;
      }
    }
    return;
  }

  fighter.x += fighter.vx;
  if (fighter.action === 'hitstun' || fighter.action === 'defeated') {
    fighter.vx *= PHYSICS.groundFriction;
    if (Math.abs(fighter.vx) < 0.3) {
      fighter.vx = 0;
    }
  }
}

function updateFacing(state: MatchState): void {
  for (let index = 0 as FighterIndex; index < 2; index = (index + 1) as FighterIndex) {
    const fighter = state.fighters[index];
    if (
      isBusy(fighter.action) ||
      fighter.action === 'hitstun' ||
      fighter.action === 'defeated' ||
      !fighter.grounded
    ) {
      continue;
    }
    const opponent = state.fighters[index === 0 ? 1 : 0];
    fighter.facing = opponent.x >= fighter.x ? 1 : -1;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function separateFighters(state: MatchState): void {
  const [left, right] = state.fighters;
  left.x = clamp(left.x, PHYSICS.stageLeft, PHYSICS.stageRight);
  right.x = clamp(right.x, PHYSICS.stageLeft, PHYSICS.stageRight);

  const deficit = PHYSICS.minSeparation - (right.x - left.x);
  if (deficit <= 0) return;

  // Push apart symmetrically first, then absorb whatever the stage walls
  // swallowed so the pair never ends up closer than the minimum.
  let nextLeft = clamp(left.x - deficit / 2, PHYSICS.stageLeft, PHYSICS.stageRight);
  let nextRight = clamp(right.x + deficit / 2, PHYSICS.stageLeft, PHYSICS.stageRight);
  const remaining = PHYSICS.minSeparation - (nextRight - nextLeft);
  if (remaining > 0) {
    if (nextLeft > PHYSICS.stageLeft) {
      nextLeft = clamp(nextLeft - remaining, PHYSICS.stageLeft, PHYSICS.stageRight);
    } else {
      nextRight = clamp(nextRight + remaining, PHYSICS.stageLeft, PHYSICS.stageRight);
    }
  }

  left.x = nextLeft;
  right.x = nextRight;
}

/* ------------------------------------------------------------------ */
/* Hit detection                                                       */
/* ------------------------------------------------------------------ */

function detectHits(state: MatchState, events: CombatEvent[]): void {
  // Collect both candidates first: two live hitboxes in the same tick must be
  // allowed to trade instead of the first one cancelling the second.
  const pending: Array<{
    attackerIndex: FighterIndex;
    defenderIndex: FighterIndex;
    moveId: string;
  }> = [];
  for (const [attackerIndex, defenderIndex] of [
    [0, 1],
    [1, 0],
  ] as Array<[FighterIndex, FighterIndex]>) {
    const attacker = state.fighters[attackerIndex];
    const defender = state.fighters[defenderIndex];
    if (attacker.action !== 'active' || attacker.hitApplied || !attacker.moveId) continue;
    const move = getMoveById(attacker.moveId);
    if (!move || !isInHitWindow(attacker, defender, move.range)) continue;
    pending.push({ attackerIndex, defenderIndex, moveId: move.id });
  }

  for (const candidate of pending) {
    applyHit(state, candidate, events);
  }
}

/** True when the defender sits inside the attacker's horizontal + vertical window. */
function isInHitWindow(attacker: FighterState, defender: FighterState, range: number): boolean {
  const horizontal = (defender.x - attacker.x) * attacker.facing;
  if (horizontal < -PHYSICS.hitBackTolerance) return false;
  if (horizontal > range + PHYSICS.fighterHalfWidth) return false;
  const vertical = defender.y - attacker.y;
  return vertical >= PHYSICS.hitWindowTop && vertical <= PHYSICS.hitWindowBottom;
}

function applyHit(
  state: MatchState,
  candidate: { attackerIndex: FighterIndex; defenderIndex: FighterIndex; moveId: string },
  events: CombatEvent[],
): void {
  const attacker = state.fighters[candidate.attackerIndex];
  const defender = state.fighters[candidate.defenderIndex];
  const move = getMoveById(candidate.moveId);
  if (!move || attacker.hitApplied) return;

  attacker.hitApplied = true;

  const blocked =
    defender.action === 'blocking' && defender.grounded && defender.hitstunTicks === 0;
  const damage = blocked ? move.blockDamage : move.damage;
  defender.health = Math.max(0, defender.health - damage);

  // Any connecting hit interrupts the defender's own move.
  defender.action = 'hitstun';
  defender.moveId = null;
  defender.actionTimer = 0;
  defender.hitApplied = false;

  if (blocked) {
    defender.hitstunTicks = TIMING.blockHitstunTicks;
    defender.vx = attacker.facing * move.knockback.x * 0.45;
    defender.vy = 0;
    state.hitstopTicks = TIMING.blockHitstopTicks;
  } else {
    defender.hitstunTicks = move.hitstunTicks;
    defender.vx = attacker.facing * move.knockback.x;
    defender.vy = -move.knockback.y;
    if (move.knockback.y > 0) {
      defender.grounded = false;
    }
    state.hitstopTicks = move.hitstopTicks;
  }

  events.push({
    type: 'hit',
    attackerIndex: candidate.attackerIndex,
    defenderIndex: candidate.defenderIndex,
    moveId: move.id,
    damage,
    blocked,
    x: defender.x,
    y: defender.y,
  });
}
