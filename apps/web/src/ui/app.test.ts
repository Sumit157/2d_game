// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CHARACTERS, STAGES } from '@desi-fighter/shared';

import {
  createSettingsStore,
  DEFAULT_KEY_BINDINGS,
  SETTINGS_STORAGE_KEY,
} from '../settings/settings';
import { mountApp, type ArenaHost } from './app';
import type { Scheduler } from './scheduler';

interface Harness {
  arena: ArenaHost & { mount: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn> };
  settings: ReturnType<typeof createSettingsStore>;
  destroy(): void;
}

/** Menu-shell tests never run frames; the arena loop is exercised separately. */
const stillScheduler: Scheduler = {
  request: () => 0,
  cancel: () => undefined,
};

function mount(): Harness {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('test root missing');

  const arena = {
    mount: vi.fn(),
    unmount: vi.fn(),
  } as ArenaHost & { mount: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn> };

  const settings = createSettingsStore();
  const app = mountApp({ root, arena, settingsStore: settings, scheduler: stillScheduler });

  return {
    arena,
    settings,
    destroy: () => {
      app.destroy();
      document.body.innerHTML = '';
    },
  };
}

function buttonByText(scope: HTMLElement, text: string): HTMLButtonElement {
  const candidates = [...scope.querySelectorAll('button')];
  const match =
    candidates.find((candidate) => candidate.textContent?.trim() === text) ??
    // Two-line controls (title + hint) concatenate their text nodes.
    candidates.find((candidate) => candidate.textContent?.trim().startsWith(text));
  if (!match) throw new Error(`button not found: ${text}`);
  return match;
}

function screen(): HTMLElement {
  const host = document.querySelector<HTMLElement>('#screen-host');
  if (!host) throw new Error('screen host missing');
  return host;
}

function pressKey(key: string, code = key): void {
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }),
  );
}

let harness: Harness;

beforeEach(() => {
  try {
    globalThis.localStorage.clear();
  } catch {
    // jsdom always provides localStorage, but never let storage break a test.
  }
  window.localStorage?.removeItem(SETTINGS_STORAGE_KEY);
  harness?.destroy?.();
  harness = mount();
});

describe('menu shell', () => {
  it('opens on the main menu with every documented action', () => {
    const labels = [...screen().querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Solo Fight', 'Play Online', 'How to Play', 'Settings']);
    expect(screen().querySelector('h1')?.getAttribute('aria-label')).toBe('Desi Fighter');
  });

  it('moves focus to the first action so keyboard users are not stranded', () => {
    expect(document.activeElement?.textContent?.trim()).toBe('Solo Fight');
  });

  it('reaches character select from Solo Fight', () => {
    buttonByText(document.body, 'Solo Fight').click();
    expect(screen().querySelector('h1')?.textContent).toBe('Select your fighter');
    const cards = screen().querySelectorAll('.roster-card');
    expect(cards).toHaveLength(CHARACTERS.length);
    expect(screen().querySelectorAll('.badge:not([hidden])')).toHaveLength(1);
  });

  it('updates selection and details when a fighter is picked', () => {
    buttonByText(document.body, 'Solo Fight').click();
    const target = CHARACTERS[2];
    if (!target) throw new Error('expected a fourth fighter');
    const card = [...screen().querySelectorAll<HTMLButtonElement>('.roster-card')].find((node) =>
      node.textContent?.includes(target.displayName),
    );
    if (!card) throw new Error('roster card missing');
    card.click();

    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(screen().querySelector('.fighter-details__name')?.textContent).toBe(target.displayName);
    // Every fighter shows stats, six moves and a labelled inspiration note.
    expect(screen().querySelectorAll('.stat')).toHaveLength(4);
    expect(screen().querySelectorAll('.move')).toHaveLength(6);
    expect(screen().querySelector('.inspiration')?.textContent).toContain('fictional parody');
  });

  it('walks character select -> stage select -> arena and back to the menu', () => {
    buttonByText(document.body, 'Solo Fight').click();
    buttonByText(screen(), 'Continue to stage').click();
    expect(screen().querySelectorAll('.stage-card')).toHaveLength(STAGES.length);

    buttonByText(screen(), 'Start match').click();
    expect(harness.arena.mount).toHaveBeenCalledTimes(1);
    const [mountEl, options] = harness.arena.mount.mock.calls[0] ?? [];
    expect(mountEl).toBeInstanceOf(HTMLElement);
    expect(mountEl?.id).toBe('arena-world');
    expect(options?.stageId).toBe(STAGES[0]?.id);
    expect(options?.fighters).toEqual([CHARACTERS[0]?.id, CHARACTERS[1]?.id]);
    expect(typeof options?.getState).toBe('function');
    expect(typeof options?.drainEvents).toBe('function');
    expect(options?.getState().phase).toBe('countdown');
    expect(options?.getVisuals()).toEqual({ screenShake: true, reducedMotion: false });

    // Leaving a match goes through the pause overlay, never a stray click.
    buttonByText(screen(), 'Pause').click();
    expect(screen().querySelector('.arena-overlay__title')?.textContent).toBe('Paused');

    buttonByText(screen(), 'Return to menu').click();
    expect(harness.arena.unmount).toHaveBeenCalledTimes(1);
    expect(screen().querySelector('h1')?.getAttribute('aria-label')).toBe('Desi Fighter');
  });

  it('passes the chosen stage through to the arena', () => {
    buttonByText(document.body, 'Solo Fight').click();
    buttonByText(screen(), 'Continue to stage').click();
    const jantar = [...screen().querySelectorAll<HTMLButtonElement>('.stage-card')].find((node) =>
      node.textContent?.includes(STAGES[1]?.name ?? 'Jantar Mantar'),
    );
    if (!jantar) throw new Error('stage card missing');
    jantar.click();
    buttonByText(screen(), 'Start match').click();

    expect(harness.arena.mount.mock.calls[0]?.[1]?.stageId).toBe(STAGES[1]?.id);
  });

  it('announces online modes as Phase 4 work instead of dead-ending', () => {
    buttonByText(document.body, 'Play Online').click();
    expect(screen().querySelector('h1')?.textContent).toBe('Play Online');

    buttonByText(screen(), 'Create Room').click();
    expect(screen().querySelector('.status')?.textContent).toContain('Phase 4');
    buttonByText(screen(), 'Join Room').click();
    expect(screen().querySelector('.status')?.textContent).toContain('Phase 4');
  });

  it('goes back one screen per Escape and never escapes the main menu', () => {
    buttonByText(document.body, 'Settings').click();
    expect(screen().querySelector('h1')?.textContent).toBe('Settings');
    pressKey('Escape');
    expect(screen().querySelector('h1')?.getAttribute('aria-label')).toBe('Desi Fighter');
    pressKey('Escape');
    expect(screen().querySelector('h1')?.getAttribute('aria-label')).toBe('Desi Fighter');
  });
});

describe('settings screen', () => {
  it('persists volume changes to device storage', () => {
    buttonByText(document.body, 'Settings').click();
    const slider = screen().querySelector<HTMLInputElement>('#setting-masterVolume');
    if (!slider) throw new Error('slider missing');
    slider.value = '25';
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    expect(harness.settings.get().masterVolume).toBe(0.25);
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('0.25');
    expect(screen().querySelector('#setting-masterVolume')?.parentElement?.textContent).toContain(
      '25%',
    );
  });

  it('toggles accessibility switches', () => {
    buttonByText(document.body, 'Settings').click();
    const toggle = screen().querySelector<HTMLInputElement>('#setting-reducedMotion');
    if (!toggle) throw new Error('toggle missing');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    expect(harness.settings.get().reducedMotion).toBe(true);
    expect(screen().querySelector('.status')?.textContent).toContain('Reduced motion on');
    const appRoot = document.querySelector<HTMLElement>('#app');
    expect(appRoot?.dataset.motion).toBe('reduced');
  });

  it('shows a binding for every input action', () => {
    buttonByText(document.body, 'Settings').click();
    const rows = screen().querySelectorAll('.binding');
    expect(rows).toHaveLength(10);
    expect(rows[0]?.textContent).toContain('Move left');
    expect(rows[0]?.textContent).toContain('A');
  });

  it('captures a new key for a binding', () => {
    buttonByText(document.body, 'Settings').click();
    const change = [...screen().querySelectorAll<HTMLButtonElement>('.binding .btn')].find((node) =>
      node.closest('.binding')?.textContent?.includes('Light attack'),
    );
    if (!change) throw new Error('change button missing');
    change.click();

    pressKey('KeyP', 'KeyP');
    expect(harness.settings.get().keyBindings.light).toBe('KeyP');
    expect(screen().querySelector('.status')?.textContent).toContain('Light attack is now P');
    expect(
      [...screen().querySelectorAll('.binding')].find((row) =>
        row.textContent?.includes('Light attack'),
      )?.textContent,
    ).toContain('P');
  });

  it('rejects a key that is already bound', () => {
    buttonByText(document.body, 'Settings').click();
    const change = [...screen().querySelectorAll<HTMLButtonElement>('.binding .btn')].find((node) =>
      node.closest('.binding')?.textContent?.includes('Light attack'),
    );
    if (!change) throw new Error('change button missing');
    change.click();

    pressKey('KeyD', 'KeyD'); // bound to Move right
    expect(harness.settings.get().keyBindings.light).toBe(DEFAULT_KEY_BINDINGS.light);
    expect(screen().querySelector('.status')?.textContent).toContain('already bound to Move right');
  });

  it('cancels capture with Escape without navigating backwards', () => {
    buttonByText(document.body, 'Settings').click();
    const change = [...screen().querySelectorAll<HTMLButtonElement>('.binding .btn')].find((node) =>
      node.closest('.binding')?.textContent?.includes('Heavy attack'),
    );
    if (!change) throw new Error('change button missing');
    change.click();

    pressKey('Escape');
    expect(harness.settings.get().keyBindings.heavy).toBe(DEFAULT_KEY_BINDINGS.heavy);
    expect(screen().querySelector('h1')?.textContent).toBe('Settings');
    expect(screen().querySelector('.status')?.textContent).toContain('unchanged');
  });

  it('resets controls to defaults', () => {
    buttonByText(document.body, 'Settings').click();
    const change = [...screen().querySelectorAll<HTMLButtonElement>('.binding .btn')].find((node) =>
      node.closest('.binding')?.textContent?.includes('Jump'),
    );
    if (!change) throw new Error('change button missing');
    change.click();
    pressKey('KeyU', 'KeyU');
    expect(harness.settings.get().keyBindings.jump).toBe('KeyU');

    buttonByText(screen(), 'Reset to defaults').click();
    expect(harness.settings.get().keyBindings.jump).toBe(DEFAULT_KEY_BINDINGS.jump);
  });
});

describe('how to play', () => {
  it('lists the current bindings and round rules', () => {
    buttonByText(document.body, 'How to Play').click();
    expect(screen().querySelector('h1')?.textContent).toBe('How to Play');
    const rows = screen().querySelectorAll('.controls-table tbody tr');
    expect(rows).toHaveLength(9); // every action except pause
    expect(screen().textContent).toContain('Best of three rounds');
    expect(screen().textContent).toContain('60 seconds');
  });
});
