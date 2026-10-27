/**
 * Move data for the Phase 2 roster slice (Chai Commander and Vote-Count
 * Vanguard). Phase 3 adds specials, ultimates and the remaining fighters to
 * this table — the engine only reads definitions, it never hard-codes damage.
 */

import { DEFAULT_CHARACTER_ID } from '../roster.js';

export interface MoveDefinition {
  id: string;
  characterId: string;
  kind: 'light' | 'heavy';
  /** Ticks before the hitbox is live. */
  startupTicks: number;
  /** Ticks the hitbox can connect (one hit per move instance). */
  activeTicks: number;
  /** Ticks of vulnerability after the active window. */
  recoveryTicks: number;
  damage: number;
  blockDamage: number;
  /** Reach from the attacker's centre, in px. */
  range: number;
  /** Ticks the move is unavailable after it starts. */
  cooldownTicks: number;
  hitstunTicks: number;
  /** Frozen ticks granted to the whole simulation on connect. */
  hitstopTicks: number;
  /** Knockback: x is pushed along the attacker's facing, y launches upward. */
  knockback: { x: number; y: number };
}

export const MOVES: readonly MoveDefinition[] = [
  {
    id: 'chai-light',
    characterId: 'chai-commander',
    kind: 'light',
    startupTicks: 4,
    activeTicks: 3,
    recoveryTicks: 6,
    damage: 6,
    blockDamage: 1,
    range: 84,
    cooldownTicks: 8,
    hitstunTicks: 12,
    hitstopTicks: 3,
    knockback: { x: 3.2, y: 0 },
  },
  {
    id: 'chai-heavy',
    characterId: 'chai-commander',
    kind: 'heavy',
    startupTicks: 9,
    activeTicks: 4,
    recoveryTicks: 15,
    damage: 13,
    blockDamage: 3,
    range: 104,
    cooldownTicks: 22,
    hitstunTicks: 20,
    hitstopTicks: 5,
    knockback: { x: 7.5, y: 5 },
  },
  {
    id: 'vanguard-light',
    characterId: 'vote-count-vanguard',
    kind: 'light',
    startupTicks: 3,
    activeTicks: 3,
    recoveryTicks: 5,
    damage: 5,
    blockDamage: 1,
    range: 74,
    cooldownTicks: 6,
    hitstunTicks: 11,
    hitstopTicks: 3,
    knockback: { x: 2.6, y: 0 },
  },
  {
    id: 'vanguard-heavy',
    characterId: 'vote-count-vanguard',
    kind: 'heavy',
    startupTicks: 8,
    activeTicks: 3,
    recoveryTicks: 16,
    damage: 11,
    blockDamage: 2,
    range: 88,
    cooldownTicks: 24,
    hitstunTicks: 19,
    hitstopTicks: 5,
    knockback: { x: 6.5, y: 4.5 },
  },
];

/**
 * Returns the move definition for a character's light/heavy attack.
 *
 * Bulldozer Baba and Tax Calculator have no bespoke frame data yet (their
 * moves arrive with the Phase 3 roster pass). Until then they borrow the
 * default character's light/heavy so every selectable fighter is playable.
 */
export function getMove(characterId: string, kind: 'light' | 'heavy'): MoveDefinition | undefined {
  const bespoke = MOVES.find((move) => move.characterId === characterId && move.kind === kind);
  if (bespoke) return bespoke;
  return MOVES.find((move) => move.characterId === DEFAULT_CHARACTER_ID && move.kind === kind);
}

export function getMoveById(moveId: string): MoveDefinition | undefined {
  return MOVES.find((move) => move.id === moveId);
}
