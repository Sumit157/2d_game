/**
 * Balance and physics constants.
 *
 * Every tuning value lives here or in move data — never in scene or UI code
 * (see `docs/06_CHARACTER_DESIGN.md`, "Store all tuning values in data").
 */

export const PHYSICS = {
  /** Downward acceleration per tick. */
  gravity: 0.9,
  /** Initial upward velocity of a jump (negative is up). */
  jumpVelocity: -16,
  maxFallSpeed: 22,
  /** Grounded run speed in px/tick. */
  moveSpeed: 4.2,
  /** Airborne horizontal control in px/tick. */
  airMoveSpeed: 3.2,
  /** Velocity retained per tick when not being controlled (knockback decay). */
  groundFriction: 0.78,
  /** Stage floor (feet position) in logical pixels. */
  groundY: 600,
  /** Horizontal clamp for the fighters' centres. */
  stageLeft: 96,
  stageRight: 1184,
  /** Half-width used for overlap and separation maths. */
  fighterHalfWidth: 34,
  /** Fighters are never allowed closer than this centre-to-centre. */
  minSeparation: 76,
  /** Hit vertical window: defender feet relative to attacker feet. */
  hitWindowTop: -170,
  hitWindowBottom: 44,
  /** Horizontal slack behind the attacker before a hit counts as "behind". */
  hitBackTolerance: 12,
} as const;

export const TIMING = {
  /** Pre-round interstitial (2.5s at 30 ticks per second). */
  countdownTicks: 75,
  /** Round-result interstitial before the next round (3s at 30 TPS). */
  roundResultTicks: 90,
  /** Lockout after landing that prevents attack startup. */
  landingTicks: 4,
  /** Blockstun duration. */
  blockHitstunTicks: 6,
  /** Hit-stop (frozen simulation) after a blocked hit. */
  blockHitstopTicks: 2,
} as const;

/**
 * Maximum hit points derived from the roster's 1–5 health stat, so balance
 * stays data-driven instead of hard-coded per scene.
 */
export function healthForStat(stat: number): number {
  const bounded = Math.min(5, Math.max(1, Math.round(stat)));
  return 60 + bounded * 10;
}
