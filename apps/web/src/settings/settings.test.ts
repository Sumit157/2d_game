import { describe, expect, it } from 'vitest';

import {
  createMemoryStore,
  createSettingsStore,
  DEFAULT_KEY_BINDINGS,
  DEFAULT_SETTINGS,
  formatKeyCode,
  normaliseSettings,
  SETTINGS_STORAGE_KEY,
} from './settings';

describe('normaliseSettings', () => {
  it('returns defaults for garbage input', () => {
    expect(normaliseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normaliseSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(normaliseSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps volumes and rejects non-numbers', () => {
    const result = normaliseSettings({ masterVolume: 4, musicVolume: -1, sfxVolume: Number.NaN });
    expect(result.masterVolume).toBe(1);
    expect(result.musicVolume).toBe(0);
    expect(result.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
  });

  it('ignores non-boolean toggles', () => {
    const result = normaliseSettings({ reducedMotion: 'yes', screenShake: 0 });
    expect(result.reducedMotion).toBe(DEFAULT_SETTINGS.reducedMotion);
    expect(result.screenShake).toBe(DEFAULT_SETTINGS.screenShake);
  });

  it('accepts valid key codes and rejects malformed ones', () => {
    const result = normaliseSettings({
      keyBindings: { light: 'KeyZ', heavy: 'not a code!', pause: '' },
    });
    expect(result.keyBindings.light).toBe('KeyZ');
    expect(result.keyBindings.heavy).toBe(DEFAULT_KEY_BINDINGS.heavy);
    expect(result.keyBindings.pause).toBe(DEFAULT_KEY_BINDINGS.pause);
  });

  it('ignores unknown actions from a future version', () => {
    const result = normaliseSettings({ keyBindings: { teleport: 'KeyT' } });
    expect(result.keyBindings).toEqual(DEFAULT_KEY_BINDINGS);
    expect(result.keyBindings).not.toHaveProperty('teleport');
  });

  it('resolves duplicate bindings first-wins', () => {
    const result = normaliseSettings({
      keyBindings: { ...DEFAULT_KEY_BINDINGS, light: 'KeyZ', heavy: 'KeyZ' },
    });
    expect(result.keyBindings.light).toBe('KeyZ'); // first claimant keeps it
    expect(result.keyBindings.heavy).toBe('KeyK'); // displaced action falls back to default
    expect(result.keyBindings.special).toBe('KeyL');
  });
});

describe('createSettingsStore', () => {
  it('persists updates and rehydrates them', () => {
    const storage = createMemoryStore();
    const first = createSettingsStore({ storage });
    first.update({ masterVolume: 0.25, reducedMotion: true });

    const second = createSettingsStore({ storage });
    expect(second.get().masterVolume).toBe(0.25);
    expect(second.get().reducedMotion).toBe(true);
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toContain('0.25');
  });

  it('survives corrupt stored JSON', () => {
    const storage = createMemoryStore();
    storage.setItem(SETTINGS_STORAGE_KEY, '{not json');
    const store = createSettingsStore({ storage });
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('survives a storage that throws on read', () => {
    const store = createSettingsStore({
      storage: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => undefined,
      },
    });
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
    expect(() => store.update({ sfxVolume: 0.1 })).not.toThrow();
  });

  it('survives a storage that throws on write', () => {
    const store = createSettingsStore({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota');
        },
      },
    });
    expect(() => store.update({ sfxVolume: 0.1 })).not.toThrow();
    expect(store.get().sfxVolume).toBe(0.1);
  });

  it('works with no storage at all (memory only)', () => {
    const store = createSettingsStore({ storage: null });
    store.update({ musicVolume: 0 });
    expect(store.get().musicVolume).toBe(0);
    expect(store.reset().musicVolume).toBe(DEFAULT_SETTINGS.musicVolume);
  });

  it('applies default overrides such as OS reduced motion', () => {
    const store = createSettingsStore({ storage: null, defaults: { reducedMotion: true } });
    expect(store.get().reducedMotion).toBe(true);
    store.reset();
    expect(store.get().reducedMotion).toBe(true);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const store = createSettingsStore({ storage: null });
    const seen: number[] = [];
    const unsubscribe = store.subscribe((settings) => seen.push(settings.masterVolume));
    store.update({ masterVolume: 0.5 });
    unsubscribe();
    store.update({ masterVolume: 0.9 });
    expect(seen).toEqual([0.5]);
  });

  it('merges partial key-binding patches', () => {
    const store = createSettingsStore({ storage: null });
    store.update({ keyBindings: { light: 'KeyB' } });
    expect(store.get().keyBindings.light).toBe('KeyB');
    expect(store.get().keyBindings.heavy).toBe(DEFAULT_KEY_BINDINGS.heavy);
  });
});

describe('formatKeyCode', () => {
  it('renders human-readable labels', () => {
    expect(formatKeyCode('KeyA')).toBe('A');
    expect(formatKeyCode('Digit5')).toBe('5');
    expect(formatKeyCode('ShiftLeft')).toBe('Shift');
    expect(formatKeyCode('Escape')).toBe('Esc');
    expect(formatKeyCode('Space')).toBe('Space');
    expect(formatKeyCode('ArrowUp')).toBe('Up arrow');
    expect(formatKeyCode('F5')).toBe('F5');
  });
});
