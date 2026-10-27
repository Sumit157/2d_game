/**
 * Abstract input actions.
 *
 * The input adapter (keyboard, touch, gamepad) maps physical controls to these
 * actions; combat rules and the network protocol only ever see the abstract
 * action, never a raw key code.
 */

export const INPUT_ACTIONS = [
  'moveLeft',
  'moveRight',
  'jump',
  'crouch',
  'block',
  'light',
  'heavy',
  'special',
  'ultimate',
  'pause',
] as const;

export type InputAction = (typeof INPUT_ACTIONS)[number];

export function isInputAction(value: unknown): value is InputAction {
  return typeof value === 'string' && (INPUT_ACTIONS as readonly string[]).includes(value);
}

/** Human-readable action labels used by settings and How to Play. */
export const INPUT_ACTION_LABELS: Record<InputAction, string> = {
  moveLeft: 'Move left',
  moveRight: 'Move right',
  jump: 'Jump',
  crouch: 'Crouch',
  block: 'Block',
  light: 'Light attack',
  heavy: 'Heavy attack',
  special: 'Special',
  ultimate: 'Ultimate',
  pause: 'Pause',
};
