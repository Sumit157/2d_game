import { describe, expect, it } from 'vitest';

import { DEFAULT_ROUND_SECONDS, DEFAULT_TICK_RATE, ROUNDS_TO_WIN } from '../constants.js';
import { CHARACTERS, DEFAULT_CHARACTER_ID, getCharacter } from '../roster.js';
import { DEFAULT_STAGE_ID } from '../stages.js';
import { PHYSICS, TIMING, healthForStat } from './balance.js';
import { createMatch, stepMatch } from './engine.js';
import { getMove } from './moves.js';
import {
  IDLE_INTENT,
  type CombatEvent,
  type FighterIndex,
  type InputIntent,
  type MatchState,
} from './types.js';

const CHAI = 'chai-commander';
const VANGUARD = 'vote-count-vanguard';

function createChaiVsVanguard(): MatchState {
  return createMatch({ characters: [CHAI, VANGUARD], stageId: 'parliament' });
}

function intent(partial: Partial<InputIntent> = {}): InputIntent {
  return { ...IDLE_INTENT, ...partial };
}

type TickScript = (tick: number) => readonly [InputIntent, InputIntent];

function run(state: MatchState, ticks: number, script?: TickScript): CombatEvent[] {
  const events: CombatEvent[] = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    const pair = script?.(tick);
    events.push(...stepMatch(state, pair ?? [intent(), intent()]));
  }
  return events;
}

/** Counts down the pre-round interstitial so `state.phase === 'round-active'`. */
function startRound(state: MatchState): void {
  run(state, TIMING.countdownTicks);
  expect(state.phase).toBe('round-active');
}

/** Puts the fighters face-to-face at minimum separation, attacker on the left. */
function placeInRange(state: MatchState, attackerIndex: FighterIndex): void {
  const attacker = state.fighters[attackerIndex];
  const defender = state.fighters[attackerIndex === 0 ? 1 : 0];
  attacker.x = 500;
  defender.x = 500 + PHYSICS.minSeparation;
  attacker.facing = 1;
  defender.facing = -1;
}

const lightIntent: TickScript = () => [intent({ light: true }), intent()];

describe('createMatch', () => {
  it('starts in the countdown phase with full health and facing fighters', () => {
    const state = createChaiVsVanguard();
    const [left, right] = state.fighters;

    expect(state.phase).toBe('countdown');
    expect(state.round).toBe(1);
    expect(state.scores).toEqual([0, 0]);
    expect(state.countdownTicks).toBe(TIMING.countdownTicks);
    expect(state.roundTicksLeft).toBe(DEFAULT_ROUND_SECONDS * DEFAULT_TICK_RATE);
    expect(state.stageId).toBe('parliament');
    expect(state.tickRate).toBe(DEFAULT_TICK_RATE);

    for (const fighter of state.fighters) {
      const character = getCharacter(fighter.characterId);
      expect(fighter.health).toBe(healthForStat(character?.stats.health ?? 0));
      expect(fighter.grounded).toBe(true);
      expect(fighter.action).toBe('idle');
      expect(fighter.x).toBeGreaterThanOrEqual(PHYSICS.stageLeft);
      expect(fighter.x).toBeLessThanOrEqual(PHYSICS.stageRight);
    }
    expect(left.facing).toBe(1);
    expect(right.facing).toBe(-1);
    expect(left.x).toBeLessThan(right.x);
  });

  it('falls back to default character and stage for unknown ids', () => {
    const state = createMatch({ characters: ['nobody', 'also-nobody'], stageId: 'missing-stage' });
    expect(state.stageId).toBe(DEFAULT_STAGE_ID);
    expect(state.fighters[0].characterId).toBe(DEFAULT_CHARACTER_ID);
    expect(state.fighters[1].characterId).toBe(DEFAULT_CHARACTER_ID);
  });

  it('derives every roster health stat into a sane maximum', () => {
    for (const character of CHARACTERS) {
      expect(healthForStat(character.stats.health)).toBeGreaterThanOrEqual(70);
      expect(healthForStat(character.stats.health)).toBeLessThanOrEqual(110);
    }
  });

  it('gives every roster fighter a playable light/heavy pair', () => {
    // Fighters without bespoke Phase 2 frame data borrow the default moves
    // (Phase 3 replaces them with real per-character data).
    for (const character of CHARACTERS) {
      expect(getMove(character.id, 'light'), character.id).toBeDefined();
      expect(getMove(character.id, 'heavy'), character.id).toBeDefined();
    }
  });
});

describe('round phases', () => {
  it('counts down to round-active and emits round-start exactly once', () => {
    const state = createChaiVsVanguard();
    const before = run(state, TIMING.countdownTicks - 1);
    expect(state.phase).toBe('countdown');
    expect(before).toHaveLength(0);

    const atStart = run(state, 1);
    expect(state.phase).toBe('round-active');
    expect(atStart).toEqual([{ type: 'round-start', round: 1 }]);

    const after = run(state, 5);
    expect(after).toHaveLength(0);
  });

  it('ends the round when health reaches zero and awards a point', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    placeInRange(state, 0);

    state.fighters[1].health = 4;
    const events = run(state, 5, lightIntent); // KO lands on the 5th tick

    const hits = events.filter((event) => event.type === 'hit');
    const roundEnds = events.filter((event) => event.type === 'round-end');
    expect(hits.at(0)).toMatchObject({
      attackerIndex: 0,
      defenderIndex: 1,
      damage: 6,
      blocked: false,
    });
    expect(roundEnds).toHaveLength(1);
    expect(roundEnds[0]).toMatchObject({ winnerIndex: 0, reason: 'health', round: 1 });

    expect(state.phase).toBe('round-result');
    expect(state.scores).toEqual([1, 0]);
    expect(state.fighters[1].health).toBe(0);
    expect(state.fighters[1].action).toBe('defeated');
    expect(state.resultTicks).toBe(TIMING.roundResultTicks);
  });

  it('resets health, positions and clock for the next round but keeps the score', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    placeInRange(state, 0);
    state.fighters[1].health = 2;
    run(state, 30, lightIntent);
    expect(state.phase).toBe('round-result');

    run(state, TIMING.roundResultTicks);
    expect(state.phase).toBe('countdown');
    expect(state.round).toBe(2);
    expect(state.scores).toEqual([1, 0]);
    expect(state.lastRoundResult).toBeNull();

    const [left, right] = state.fighters;
    expect(left.health).toBe(left.maxHealth);
    expect(right.health).toBe(right.maxHealth);
    expect(right.action).toBe('idle');
    expect(state.roundTicksLeft).toBe(DEFAULT_ROUND_SECONDS * state.tickRate);

    run(state, TIMING.countdownTicks);
    expect(state.phase).toBe('round-active');
    expect(state.round).toBe(2);
  });

  it('awards the round on timer expiry to the healthier fighter', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    state.fighters[0].health = 50;
    state.fighters[1].health = 40;
    state.roundTicksLeft = 1;

    const events = run(state, 1);
    expect(events).toEqual([{ type: 'round-end', winnerIndex: 0, reason: 'timer', round: 1 }]);
    expect(state.phase).toBe('round-result');
    expect(state.scores).toEqual([1, 0]);
  });

  it('declares a draw when health is level at the buzzer and advances the round', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    // Equal health *percentages*, different maximums: must still be a draw.
    state.fighters[0].health = 50;
    state.fighters[1].health = 45;
    state.roundTicksLeft = 1;

    const events = run(state, 1);
    expect(events).toEqual([{ type: 'round-end', winnerIndex: null, reason: 'timer', round: 1 }]);
    expect(state.scores).toEqual([0, 0]);

    run(state, TIMING.roundResultTicks);
    expect(state.phase).toBe('countdown');
    expect(state.round).toBe(2);
    expect(state.scores).toEqual([0, 0]);
  });

  it('ends the match at two round wins and stays idle until a rematch', () => {
    const state = createChaiVsVanguard();

    for (let round = 1; round <= ROUNDS_TO_WIN; round += 1) {
      startRound(state);
      placeInRange(state, 0);
      state.fighters[1].health = 2;
      run(state, 30, lightIntent);
      expect(state.phase).toBe('round-result');
      run(state, TIMING.roundResultTicks);
    }

    expect(state.phase).toBe('match-result');
    expect(state.winnerIndex).toBe(0);
    expect(state.scores).toEqual([ROUNDS_TO_WIN, 0]);

    const snapshot = JSON.stringify(state);
    const events = run(state, 120);
    expect(events).toHaveLength(0);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('rematch starts a completely fresh match', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    state.fighters[1].health = 1;
    placeInRange(state, 0);
    run(state, 30, lightIntent);
    run(state, TIMING.roundResultTicks * 2 + TIMING.countdownTicks + 5);

    const fresh = createMatch({ characters: [CHAI, VANGUARD], stageId: 'parliament' });
    expect(fresh.phase).toBe('countdown');
    expect(fresh.round).toBe(1);
    expect(fresh.scores).toEqual([0, 0]);
    expect(fresh.winnerIndex).toBeNull();
    expect(fresh.fighters[1].health).toBe(fresh.fighters[1].maxHealth);
  });
});

describe('movement', () => {
  it('runs in the pressed direction and clamps at the stage edge', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    const startX = state.fighters[0].x;

    run(state, 10, () => [intent({ moveRight: true }), intent({ moveLeft: true })]);
    expect(state.fighters[0].x).toBeGreaterThan(startX);
    expect(state.fighters[0].action).toBe('moving');

    run(state, 600, () => [intent({ moveRight: true }), intent({ moveRight: true })]);
    expect(state.fighters[1].x).toBe(PHYSICS.stageRight);
    expect(state.fighters[0].x).toBeCloseTo(PHYSICS.stageRight - PHYSICS.minSeparation, 4);

    run(state, 600, () => [intent({ moveLeft: true }), intent({ moveLeft: true })]);
    expect(state.fighters[0].x).toBe(PHYSICS.stageLeft);
    expect(state.fighters[1].x).toBeCloseTo(PHYSICS.stageLeft + PHYSICS.minSeparation, 4);
  });

  it('never lets fighters pass through each other', () => {
    const state = createChaiVsVanguard();
    startRound(state);

    run(state, 400, () => [intent({ moveRight: true }), intent({ moveLeft: true })]);

    const [left, right] = state.fighters;
    expect(left.x).toBeLessThan(right.x);
    expect(right.x - left.x).toBeGreaterThanOrEqual(PHYSICS.minSeparation - 0.001);
  });

  it('turns to face the opponent', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    expect(state.fighters[0].facing).toBe(1);

    state.fighters[1].x = state.fighters[0].x - 200;
    run(state, 1);
    expect(state.fighters[0].facing).toBe(-1);
    expect(state.fighters[1].facing).toBe(1);
  });

  it('jumps, arcs under gravity and lands with a short recovery', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    const ground = PHYSICS.groundY;

    run(state, 1, () => [intent({ jump: true }), intent()]);
    expect(state.fighters[0].grounded).toBe(false);
    expect(state.fighters[0].action).toBe('jumping');
    expect(state.fighters[0].vy).toBeLessThan(0);
    expect(state.fighters[0].y).toBeLessThan(ground);

    let landedAt = -1;
    for (let tick = 1; tick < 120 && landedAt < 0; tick += 1) {
      run(state, 1);
      if (state.fighters[0].grounded) landedAt = tick;
    }

    expect(landedAt).toBeGreaterThan(0);
    expect(state.fighters[0].y).toBe(ground);
    expect(state.fighters[0].action).toBe('idle');
    expect(state.fighters[0].landingTicks).toBe(TIMING.landingTicks);

    run(state, TIMING.landingTicks + 1);
    expect(state.fighters[0].landingTicks).toBe(0);
  });

  it('holds a single jump per key press', () => {
    const state = createChaiVsVanguard();
    startRound(state);

    let apex: number = PHYSICS.groundY;
    for (let tick = 0; tick < 40; tick += 1) {
      run(state, 1, () => [intent({ jump: true }), intent()]);
      apex = Math.min(apex, state.fighters[0].y);
    }

    expect(apex).toBeLessThan(PHYSICS.groundY - 40);
    expect(state.fighters[0].grounded).toBe(true);
    expect(state.fighters[0].y).toBe(PHYSICS.groundY);

    // The key is still held: no second jump.
    run(state, 10, () => [intent({ jump: true }), intent()]);
    expect(state.fighters[0].grounded).toBe(true);
  });
});

describe('attacks', () => {
  it('runs startup -> active -> recovery and connects a light attack once', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    placeInRange(state, 0);
    const move = getMove(CHAI, 'light');
    expect(move).toBeDefined();
    if (!move) return;

    const healthBefore = state.fighters[1].health;
    const events = run(state, 1, lightIntent);
    expect(events).toHaveLength(0);
    expect(state.fighters[0].action).toBe('startup');
    expect(state.fighters[0].moveId).toBe(move.id);
    expect(state.fighters[0].cooldowns[move.id]).toBe(move.cooldownTicks);

    run(state, move.startupTicks, lightIntent);
    expect(state.fighters[0].action).toBe('active');
    expect(state.fighters[1].health).toBe(healthBefore - move.damage);

    // The connecting hit freezes the sim for hit-stop ticks first.
    const connecting = run(state, move.hitstopTicks + move.activeTicks);
    const hits = connecting.filter((event) => event.type === 'hit');
    expect(hits).toHaveLength(0); // one hit per move instance
    expect(state.fighters[0].action).toBe('recovery');
    expect(state.fighters[1].action).toBe('hitstun');
    expect(state.fighters[1].hitstunTicks).toBeGreaterThan(0);

    run(state, move.recoveryTicks + move.cooldownTicks + 2, lightIntent);
    expect(state.fighters[0].action).toBe('idle');
    expect(state.fighters[0].moveId).toBeNull();
  });

  it('launches the defender with knockback and applies hit-stop', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    placeInRange(state, 0);
    const move = getMove(CHAI, 'heavy');
    if (!move) throw new Error('missing chai heavy');

    const events = run(state, 1 + move.startupTicks, () => [intent({ heavy: true }), intent()]);
    const hit = events.find((event) => event.type === 'hit');
    expect(hit).toMatchObject({ moveId: move.id, damage: move.damage, blocked: false });
    expect(state.hitstopTicks).toBe(move.hitstopTicks);
    expect(state.fighters[1].grounded).toBe(false);
    expect(state.fighters[1].vx).toBeCloseTo(move.knockback.x, 5);

    const ticksLeft = state.roundTicksLeft;
    const defenderX = state.fighters[1].x;
    run(state, 1);
    expect(state.roundTicksLeft).toBe(ticksLeft); // simulation frozen
    expect(state.fighters[1].x).toBeCloseTo(defenderX, 5);
    expect(state.hitstopTicks).toBe(move.hitstopTicks - 1);

    run(state, move.hitstopTicks);
    expect(state.hitstopTicks).toBe(0);
    expect(state.roundTicksLeft).toBeLessThan(ticksLeft);
  });

  it('misses when the opponent is out of range', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    const healthBefore = state.fighters[1].health;

    const events = run(state, 30, lightIntent);
    expect(events.some((event) => event.type === 'hit')).toBe(false);
    expect(state.fighters[1].health).toBe(healthBefore);
    expect(state.fighters[0].action).not.toBe('hitstun');
  });

  it('cannot start a move while already committed to one', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    placeInRange(state, 0);
    const light = getMove(CHAI, 'light');
    if (!light) throw new Error('missing chai light');

    run(state, 1, lightIntent);
    expect(state.fighters[0].action).toBe('startup');

    // Release light, press heavy while still in startup.
    run(state, 1, () => [intent({ heavy: true }), intent()]);
    expect(state.fighters[0].action).toBe('startup');
    expect(state.fighters[0].moveId).toBe(light.id);
  });

  it('cannot attack during hitstun', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    const fighter = state.fighters[0];
    fighter.action = 'hitstun';
    fighter.hitstunTicks = 8;

    run(state, 3, lightIntent);
    expect(fighter.action).toBe('hitstun');
    expect(fighter.moveId).toBeNull();
    expect(fighter.hitstunTicks).toBe(5);
  });

  it('regains control when hitstun expires', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    const fighter = state.fighters[0];
    fighter.action = 'hitstun';
    fighter.hitstunTicks = 2;

    run(state, 2);
    expect(fighter.action).toBe('idle');
    expect(fighter.hitstunTicks).toBe(0);

    run(state, 1, () => [intent({ moveRight: true }), intent()]);
    expect(fighter.action).toBe('moving');
  });

  it('respects the cooldown after a move was cancelled by a hit', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    const fighter = state.fighters[0];
    const heavy = getMove(CHAI, 'heavy');
    if (!heavy) throw new Error('missing chai heavy');
    fighter.cooldowns[heavy.id] = 10;
    fighter.action = 'idle';

    run(state, 1, () => [intent({ heavy: true }), intent()]);
    expect(fighter.action).toBe('idle');

    run(state, 9, () => [intent({ heavy: false }), intent()]);
    run(state, 1, () => [intent({ heavy: true }), intent()]);
    expect(fighter.action).toBe('startup');
    expect(fighter.moveId).toBe(heavy.id);
  });

  it('cannot attack or block while airborne', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    const fighter = state.fighters[0];
    fighter.grounded = false;
    fighter.action = 'jumping';
    fighter.y = PHYSICS.groundY - 120;

    run(state, 1, () => [intent({ light: true, block: true }), intent()]);
    expect(fighter.action).toBe('jumping');
    expect(fighter.moveId).toBeNull();
  });

  it('blocks attack startup during landing recovery', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    const fighter = state.fighters[0];
    fighter.landingTicks = 3;

    run(state, 1, lightIntent);
    expect(fighter.action).toBe('idle');
    expect(fighter.moveId).toBeNull();
  });

  it('lets a fighter without bespoke moves KO an opponent with borrowed frame data', () => {
    const state = createMatch({
      characters: ['bulldozer-baba', 'tax-calculator'],
      stageId: 'parliament',
    });
    startRound(state);
    placeInRange(state, 0);

    state.fighters[1].health = 5;
    const events = run(state, 6, lightIntent);

    expect(events.some((event) => event.type === 'hit' && event.damage === 6)).toBe(true);
    expect(state.phase).toBe('round-result');
    expect(state.scores).toEqual([1, 0]);
  });
});

describe('blocking', () => {
  it('enters the blocking stance while the button is held', () => {
    const state = createChaiVsVanguard();
    startRound(state);

    run(state, 1, () => [intent(), intent({ block: true })]);
    expect(state.fighters[1].action).toBe('blocking');
    expect(state.fighters[1].facing).toBe(-1);

    run(state, 1, () => [intent(), intent({ block: false })]);
    expect(state.fighters[1].action).toBe('idle');
  });

  it('reduces damage to chip and never launches the blocker', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    placeInRange(state, 0);
    const move = getMove(CHAI, 'heavy');
    if (!move) throw new Error('missing chai heavy');

    const script: TickScript = (tick) =>
      tick === 0
        ? [intent({ heavy: true }), intent({ block: true })]
        : [intent(), intent({ block: true })];
    const events = run(state, 1 + move.startupTicks, script);

    const hit = events.find((event) => event.type === 'hit');
    expect(hit).toMatchObject({ blocked: true, damage: move.blockDamage });
    expect(state.fighters[1].health).toBe(state.fighters[1].maxHealth - move.blockDamage);
    expect(state.fighters[1].action).toBe('hitstun');
    expect(state.fighters[1].hitstunTicks).toBe(TIMING.blockHitstunTicks);
    expect(state.fighters[1].grounded).toBe(true);
    expect(state.fighters[1].vy).toBe(0);
  });

  it('cannot block while stunned', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    const fighter = state.fighters[1];
    fighter.action = 'hitstun';
    fighter.hitstunTicks = 5;

    run(state, 2, () => [intent(), intent({ block: true })]);
    expect(fighter.action).toBe('hitstun');
  });

  it('can re-block immediately after blockstun if the button is still held', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    const fighter = state.fighters[1];
    fighter.action = 'hitstun';
    fighter.hitstunTicks = 2;

    run(state, 3, () => [intent(), intent({ block: true })]);
    expect(fighter.action).toBe('blocking');
  });
});

describe('robustness', () => {
  it('lets two live hitboxes trade in the same tick (mutual knockout = draw)', () => {
    const state = createChaiVsVanguard();
    startRound(state);
    placeInRange(state, 0);

    for (const fighter of state.fighters) {
      const move = getMove(fighter.characterId, 'light');
      if (!move) throw new Error('missing light move');
      fighter.action = 'active';
      fighter.actionTimer = 2;
      fighter.moveId = move.id;
      fighter.hitApplied = false;
      fighter.health = 1;
      fighter.vx = 0;
    }

    const events = run(state, 1);
    expect(events.filter((event) => event.type === 'hit')).toHaveLength(2);
    const roundEnd = events.find((event) => event.type === 'round-end');
    expect(roundEnd).toMatchObject({ winnerIndex: null, reason: 'health' });
    expect(state.scores).toEqual([0, 0]);
    expect(state.fighters[0].health).toBe(0);
    expect(state.fighters[1].health).toBe(0);
  });

  it('is deterministic for the same input sequence', () => {
    const script: TickScript = (tick) => {
      const left = tick % 40 < 20;
      const right = tick % 60 < 25;
      return [
        intent({ moveRight: left, light: tick % 37 === 0, jump: tick % 53 === 0 }),
        intent({ moveLeft: right, heavy: tick % 43 === 0, block: tick % 29 < 4 }),
      ];
    };

    const first = createChaiVsVanguard();
    const second = createChaiVsVanguard();
    run(first, 600, script);
    run(second, 600, script);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('cannot softlock: an idle match always reaches the next round', () => {
    const state = createChaiVsVanguard();
    const ticksToNextRound =
      TIMING.countdownTicks +
      DEFAULT_ROUND_SECONDS * state.tickRate +
      TIMING.roundResultTicks +
      TIMING.countdownTicks;

    run(state, ticksToNextRound);

    expect(state.phase).toBe('round-active');
    expect(state.round).toBe(2);
    expect(state.scores).toEqual([0, 0]);
    for (const fighter of state.fighters) {
      expect(fighter.health).toBe(fighter.maxHealth);
      expect(fighter.x).toBeGreaterThanOrEqual(PHYSICS.stageLeft);
      expect(fighter.x).toBeLessThanOrEqual(PHYSICS.stageRight);
      expect(fighter.action).not.toBe('defeated');
    }
  });

  it('keeps every fighter inside the stage after a long random match', () => {
    const state = createChaiVsVanguard();
    const script: TickScript = (tick) => [
      intent({
        moveRight: tick % 31 < 12,
        moveLeft: tick % 37 < 10,
        light: tick % 17 === 0,
        heavy: tick % 23 === 0,
        jump: tick % 29 === 0,
        block: tick % 41 < 6,
      }),
      intent({
        moveLeft: tick % 19 < 8,
        moveRight: tick % 23 < 7,
        light: tick % 13 === 0,
        block: tick % 47 < 10,
      }),
    ];

    run(state, 4000, script);

    // Hit-stop stretches rounds past their clock, so only assert it moved on.
    expect(state.round).toBeGreaterThanOrEqual(2);
    const [left, right] = state.fighters;
    expect(left.x).toBeLessThan(right.x);
    expect(right.x - left.x).toBeGreaterThanOrEqual(PHYSICS.minSeparation - 0.001);
    expect(left.health).toBeGreaterThanOrEqual(0);
    expect(left.health).toBeLessThanOrEqual(left.maxHealth);
    expect(right.health).toBeGreaterThanOrEqual(0);
    expect(right.health).toBeLessThanOrEqual(right.maxHealth);
    expect(state.scores[0]).toBeLessThanOrEqual(ROUNDS_TO_WIN);
    expect(state.scores[1]).toBeLessThanOrEqual(ROUNDS_TO_WIN);
  });
});
