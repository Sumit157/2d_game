import { IDLE_INTENT, type InputAction, type InputIntent } from '@desi-fighter/shared';

/**
 * Keyboard -> abstract input adapter.
 *
 * Physical keys are translated to `InputIntent` only; the shared engine owns
 * every combat rule (edge detection, cooldowns, hit resolution). Two instances
 * run side by side — one per local player — so Phase 4 can swap either one for
 * a network or AI intent source without touching combat rules.
 */

export type KeyBindings = Record<InputAction, string>;

export interface KeyboardInputOptions {
  /** Read on every sample so a rebind during play applies immediately. */
  bindings: () => KeyBindings;
  /** Event target; defaults to `window`. */
  target?: EventTarget | null;
}

export interface KeyboardInput {
  /** Starts listening. Idempotent. */
  attach(): void;
  /** Stops listening and forgets held keys. Idempotent. */
  detach(): void;
  /** Intent for the current tick, sampled from held keys. */
  intent(): InputIntent;
  /** True when any key bound to this player is currently held. */
  isHeld(): boolean;
}

const MOVEMENT_ACTIONS = new Set<InputAction>([
  'moveLeft',
  'moveRight',
  'jump',
  'crouch',
  'block',
  'light',
  'heavy',
  'special',
  'ultimate',
]);

export function createKeyboardInput(options: KeyboardInputOptions): KeyboardInput {
  const target = options.target ?? (typeof window === 'undefined' ? null : window);
  const held = new Set<string>();
  let attached = false;

  const boundCodes = (): Set<string> => {
    const bindings = options.bindings();
    const codes = new Set<string>();
    for (const action of MOVEMENT_ACTIONS) {
      const code = bindings[action];
      if (code) codes.add(code);
    }
    return codes;
  };

  const onKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.code) {
      held.add(keyboardEvent.code);
      if (boundCodes().has(keyboardEvent.code)) {
        // Arrows/WASD must scroll the page only outside a match.
        keyboardEvent.preventDefault();
      }
    }
  };

  const onKeyUp = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.code) held.delete(keyboardEvent.code);
  };

  const clear = (): void => held.clear();

  return {
    attach() {
      if (attached || !target) return;
      attached = true;
      target.addEventListener('keydown', onKeyDown);
      target.addEventListener('keyup', onKeyUp);
      // Losing focus mid-hold must not leave a fighter running forever.
      target.addEventListener('blur', clear);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', clear);
      }
    },
    detach() {
      if (!attached || !target) return;
      attached = false;
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', clear);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', clear);
      }
      held.clear();
    },
    intent() {
      const bindings = options.bindings();
      return {
        moveLeft: held.has(bindings.moveLeft),
        moveRight: held.has(bindings.moveRight),
        jump: held.has(bindings.jump),
        block: held.has(bindings.block),
        light: held.has(bindings.light),
        heavy: held.has(bindings.heavy),
      };
    },
    isHeld() {
      const bindings = options.bindings();
      for (const action of MOVEMENT_ACTIONS) {
        const code = bindings[action];
        if (code && held.has(code)) return true;
      }
      return false;
    },
  };
}

/** Convenience intent for a player who contributes no input (e.g. an idle slot). */
export function idleIntent(): InputIntent {
  return { ...IDLE_INTENT };
}
