// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CHARACTERS, PHYSICS, type MatchState } from '@desi-fighter/shared';

import { createSettingsStore, SETTINGS_STORAGE_KEY } from '../../settings/settings';
import { mountApp, type AppHandle, type ArenaMountOptions } from '../app';
import type { Scheduler } from '../scheduler';

/**
 * End-to-end local match flow.
 *
 * Time is driven by a manual scheduler, so every assertion below runs against
 * the real engine ticks, real key events and real DOM — no faked combat.
 */

/** Frame slice kept well under the loop's per-frame catch-up cap. */
const SLICE_MS = 100;

interface Pump {
  scheduler: Scheduler;
  advance(ms: number): void;
}

function createManualPump(): Pump {
  let nextId = 0;
  let time = 0;
  let pending: { id: number; run: (timeMs: number) => void } | null = null;

  return {
    scheduler: {
      request: (callback) => {
        nextId += 1;
        pending = { id: nextId, run: callback };
        return nextId;
      },
      cancel: (handle) => {
        if (pending?.id === handle) pending = null;
      },
    },
    advance(ms) {
      let remaining = ms;
      while (remaining > 0) {
        const slice = Math.min(SLICE_MS, remaining);
        remaining -= slice;
        time += slice;
        const current = pending;
        pending = null;
        current?.run(time);
      }
    },
  };
}

let app: AppHandle | null = null;
let pump: Pump = createManualPump();
let mountOptions: ArenaMountOptions | null = null;

function screen(): HTMLElement {
  const host = document.querySelector<HTMLElement>('#screen-host');
  if (!host) throw new Error('screen host missing');
  return host;
}

function buttonByText(scope: HTMLElement, text: string): HTMLButtonElement {
  const match = [...scope.querySelectorAll('button')].find((node) =>
    node.textContent?.trim().startsWith(text),
  );
  if (!match) throw new Error(`button not found: ${text}`);
  return match;
}

function overlayTitle(): string {
  return screen().querySelector('.arena-overlay__title')?.textContent ?? '';
}

function overlayHidden(): boolean {
  const node = screen().querySelector<HTMLElement>('.arena-overlay');
  if (!node) throw new Error('overlay missing');
  return node.hidden;
}

function hud(selector: string): string {
  return screen().querySelector(selector)?.textContent ?? '';
}

function state(): MatchState {
  if (!mountOptions) throw new Error('arena not mounted');
  return mountOptions.getState();
}

function key(type: 'keydown' | 'keyup', code: string): void {
  window.dispatchEvent(
    new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }),
  );
}

function advanceUntil(predicate: () => boolean, slices: number, label: string): void {
  for (let index = 0; index < slices; index += 1) {
    if (predicate()) return;
    pump.advance(SLICE_MS);
  }
  throw new Error(`timed out waiting for ${label}`);
}

function enterArena(): void {
  buttonByText(document.body, 'Solo Fight').click();
  buttonByText(screen(), 'Continue to stage').click();
  buttonByText(screen(), 'Start match').click();
  if (!mountOptions) throw new Error('arena host was not mounted');
}

/** Walks both fighters together, then spams light attacks until the KO. */
function knockOutRound(): void {
  const maxHealth = state().fighters[1].health;
  key('keydown', 'KeyD');
  key('keydown', 'ArrowLeft');

  advanceUntil(
    () => state().fighters[1].x - state().fighters[0].x <= PHYSICS.minSeparation + 2,
    80,
    'fighters to meet',
  );

  for (let attempt = 0; attempt < 60 && state().fighters[1].health > 0; attempt += 1) {
    key('keydown', 'KeyJ');
    pump.advance(600);
    key('keyup', 'KeyJ');
    pump.advance(150);
  }

  key('keyup', 'KeyD');
  key('keyup', 'ArrowLeft');

  expect(state().fighters[1].health, `expected a KO from ${maxHealth} HP`).toBe(0);
}

beforeEach(() => {
  try {
    globalThis.localStorage.clear();
  } catch {
    // Storage may be unavailable; the settings store falls back to memory.
  }
  window.localStorage?.removeItem(SETTINGS_STORAGE_KEY);
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('test root missing');

  pump = createManualPump();
  mountOptions = null;
  app = mountApp({
    root,
    arena: {
      mount(container, options) {
        mountOptions = options;
        container.dataset.fighters = options.fighters.join(',');
      },
      unmount: () => undefined,
    },
    settingsStore: createSettingsStore(),
    scheduler: pump.scheduler,
  });
});

afterEach(() => {
  app?.destroy();
  app = null;
  mountOptions = null;
  document.body.innerHTML = '';
});

describe('arena match flow', () => {
  it('mounts the world with the chosen stage, fighters and live state', () => {
    enterArena();

    const container = screen().querySelector('#arena-world');
    expect(container).not.toBeNull();
    expect(screen().querySelector('h1')?.textContent).toBe('Fight!');

    // Player one's pick, plus the roster's next fighter in the second slot.
    expect(container?.getAttribute('data-fighters')).toBe(
      `${CHARACTERS[0]?.id},${CHARACTERS[1]?.id}`,
    );
    expect(mountOptions?.stageId).toBe(state().stageId);
    expect(typeof mountOptions?.drainEvents).toBe('function');
    expect(mountOptions?.getVisuals()).toEqual({ screenShake: true, reducedMotion: false });

    // HUD reads straight from the simulation.
    expect(hud('.hud-player--left .hud-player__name')).toBe(CHARACTERS[0]?.displayName);
    expect(hud('.hud-player--right .hud-player__name')).toBe(CHARACTERS[1]?.displayName);
    expect(hud('.hud-timer')).toBe('60');
    expect(hud('.hud-round')).toBe('Round 1');
    expect(hud('.hud-player--left .hud-player__hp')).toBe(
      `${state().fighters[0].health}/${state().fighters[0].maxHealth}`,
    );
    expect(screen().querySelectorAll('.hud-dot')).toHaveLength(4);
    expect(screen().textContent).toContain('Player 2');
  });

  it('counts down into the round, then clears the overlay for play', () => {
    enterArena();

    expect(state().phase).toBe('countdown');
    expect(overlayHidden()).toBe(false);
    expect(overlayTitle()).toBe('Round 1');

    advanceUntil(() => state().phase === 'round-active', 60, 'round start');

    expect(overlayHidden()).toBe(true);
    expect(hud('.hud-round')).toBe('Round 1');
    const seconds = Number(hud('.hud-timer'));
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(60);
    expect(state().roundTicksLeft).toBeLessThan(1800);
  });

  it('applies keyboard input through the engine into health and the HUD', () => {
    enterArena();
    advanceUntil(() => state().phase === 'round-active', 60, 'round start');

    key('keydown', 'KeyD');
    key('keydown', 'ArrowLeft');
    advanceUntil(
      () => state().fighters[1].x - state().fighters[0].x <= PHYSICS.minSeparation + 2,
      80,
      'fighters to meet',
    );

    const healthBefore = state().fighters[1].health;
    expect(healthBefore).toBe(state().fighters[1].maxHealth);

    key('keydown', 'KeyJ');
    advanceUntil(() => state().fighters[1].health < healthBefore, 40, 'first hit');
    key('keyup', 'KeyJ');
    key('keyup', 'KeyD');
    key('keyup', 'ArrowLeft');

    expect(state().fighters[1].health).toBe(healthBefore - 6); // Chai Commander light
    expect(hud('.hud-player--right .hud-player__hp')).toBe(
      `${state().fighters[1].health}/${state().fighters[1].maxHealth}`,
    );
    expect(state().fighters[0].health).toBe(state().fighters[0].maxHealth);
  });

  it('pauses on Escape without popping the screen and freezes the clock', () => {
    enterArena();
    advanceUntil(() => state().phase === 'round-active', 60, 'round start');

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(escape);

    // Esc paused the match instead of walking the navigation stack back.
    expect(escape.defaultPrevented).toBe(true);
    expect(screen().querySelector('h1')?.textContent).toBe('Fight!');
    expect(overlayTitle()).toBe('Paused');
    expect(buttonByText(screen(), 'Resume')).toBeTruthy();
    expect(buttonByText(screen(), 'Return to menu')).toBeTruthy();

    const frozen = state().roundTicksLeft;
    pump.advance(2000);
    expect(state().roundTicksLeft).toBe(frozen);

    buttonByText(screen(), 'Resume').click();
    expect(overlayHidden()).toBe(true);

    advanceUntil(() => state().roundTicksLeft < frozen, 20, 'clock to resume');
  });

  it('ends a round on the clock with a result overlay and starts the next', () => {
    enterArena();
    advanceUntil(() => state().phase === 'round-active', 60, 'round start');

    advanceUntil(() => state().phase === 'round-result', 700, 'round expiry');

    // Both fighters untouched: equal health percentage is a draw.
    expect(overlayHidden()).toBe(false);
    expect(overlayTitle()).toBe('Draw round');
    expect(screen().textContent).toContain('Score 0–0');
    expect(state().scores).toEqual([0, 0]);

    advanceUntil(() => state().round === 2 && state().phase === 'round-active', 80, 'round two');
    expect(hud('.hud-round')).toBe('Round 2');
    expect(state().fighters[1].health).toBe(state().fighters[1].maxHealth);
    expect(overlayHidden()).toBe(true);
  });

  it('runs a full match to the match-result and rematches cleanly', () => {
    enterArena();
    advanceUntil(() => state().phase === 'round-active', 60, 'round start');

    knockOutRound();
    expect(state().phase).toBe('round-result');
    expect(state().scores).toEqual([1, 0]);
    expect(overlayTitle()).toContain('takes round 1');
    expect(screen().textContent).toContain('Score 1–0');

    advanceUntil(() => state().round === 2 && state().phase === 'round-active', 80, 'round two');

    knockOutRound();
    // The round resolves first, then the match result follows the interstitial.
    expect(state().phase).toBe('round-result');
    expect(state().scores).toEqual([2, 0]);
    advanceUntil(() => state().phase === 'match-result', 60, 'match end');

    expect(state().winnerIndex).toBe(0);
    expect(state().scores).toEqual([2, 0]);
    expect(overlayTitle()).toContain('wins the match');
    expect(document.querySelector('#app-announcer')?.textContent).toContain('wins the match');

    const rematch = buttonByText(screen(), 'Rematch');
    rematch.click();

    expect(state().phase).toBe('countdown');
    expect(state().round).toBe(1);
    expect(state().scores).toEqual([0, 0]);
    expect(state().fighters[0].health).toBe(state().fighters[0].maxHealth);
    expect(state().fighters[1].health).toBe(state().fighters[1].maxHealth);
    expect(overlayTitle()).toBe('Round 1');

    // The rematched match actually plays.
    advanceUntil(() => state().phase === 'round-active', 60, 'rematch round start');
    expect(state().roundTicksLeft).toBe(1800);
  });
});
