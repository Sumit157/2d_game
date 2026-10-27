import { INPUT_ACTIONS, type InputAction } from '@desi-fighter/shared';

/**
 * Device-only preferences.
 *
 * Stored in localStorage on this browser only. Never used for identity,
 * rankings or anything server-side (see `docs/04_DATABASE_AND_DATA.md`).
 */

export const SETTINGS_STORAGE_KEY = 'desi-fighter.settings.v1';

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  screenShake: boolean;
  /** Primary binding per abstract action, as a KeyboardEvent.code. */
  keyBindings: Record<InputAction, string>;
}

export const DEFAULT_KEY_BINDINGS: Record<InputAction, string> = {
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  jump: 'KeyW',
  crouch: 'KeyS',
  block: 'ShiftLeft',
  light: 'KeyJ',
  heavy: 'KeyK',
  special: 'KeyL',
  ultimate: 'KeyI',
  pause: 'Escape',
};

/**
 * Fixed bindings for the second local keyboard (arrows + the punctuation row).
 *
 * Player 1's bindings are remappable in Settings; player 2 is fixed for now so
 * one settings list stays understandable. AIs take over player 2 in Phase 3.
 */
export const PLAYER_TWO_KEY_BINDINGS: Record<InputAction, string> = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  jump: 'ArrowUp',
  crouch: 'ArrowDown',
  block: 'ShiftRight',
  light: 'Comma',
  heavy: 'Period',
  special: 'Slash',
  ultimate: 'Backslash',
  pause: 'Escape',
};

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  reducedMotion: false,
  screenShake: true,
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
};

/**
 * KeyboardEvent.code values are always alphanumeric (KeyA, Digit5, ShiftLeft,
 * ArrowUp, Space, Numpad4, F5, ...), so anything with spaces or punctuation is
 * rejected as hand-edited data.
 */
const KEY_CODE_PATTERN = /^[A-Za-z0-9]{1,24}$/;

/** Minimal storage abstraction so tests can inject fakes or failures. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates and normalises any unknown payload into a complete Settings object.
 * Invalid values fall back to defaults; volumes are clamped to 0..1; unknown
 * actions are ignored; duplicate key bindings are resolved first-wins.
 */
export function normaliseSettings(raw: unknown): Settings {
  const source = isRecord(raw) ? raw : {};
  const rawBindings = isRecord(source.keyBindings) ? source.keyBindings : {};

  const bindings: Record<InputAction, string> = { ...DEFAULT_KEY_BINDINGS };
  const taken = new Set<string>();

  // First valid claim wins; a displaced action keeps its default binding.
  // The store always persists a complete map, so this only matters for
  // hand-edited storage — best effort, never a crash and never a fighter
  // left without a button.
  for (const action of INPUT_ACTIONS) {
    const candidate = rawBindings[action];
    if (typeof candidate !== 'string' || !KEY_CODE_PATTERN.test(candidate)) continue;
    if (taken.has(candidate)) continue;
    bindings[action] = candidate;
    taken.add(candidate);
  }

  const numberOr = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : fallback;

  const boolOr = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback;

  return {
    masterVolume: numberOr(source.masterVolume, DEFAULT_SETTINGS.masterVolume),
    musicVolume: numberOr(source.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: numberOr(source.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    reducedMotion: boolOr(source.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    screenShake: boolOr(source.screenShake, DEFAULT_SETTINGS.screenShake),
    keyBindings: bindings,
  };
}

function memoryStore(): KeyValueStore & { dump(): Map<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    dump: () => map,
  };
}

/** Resolves localStorage safely; private-mode or blocked storage must not crash the game. */
function resolveStorage(explicit?: KeyValueStore | null): KeyValueStore | null {
  if (explicit === null) return null;
  if (explicit) return explicit;
  try {
    const candidate = globalThis.localStorage;
    if (!candidate) return null;
    // Probe: some browsers throw only on access.
    candidate.getItem(SETTINGS_STORAGE_KEY);
    return candidate;
  } catch {
    return null;
  }
}

export interface SettingsStore {
  get(): Settings;
  /** Applies a partial update; key bindings merge rather than replace. */
  update(patch: SettingsPatch): Settings;
  reset(): Settings;
  subscribe(listener: (settings: Settings) => void): () => void;
}

/** Partial settings payload accepted by `update`. */
export interface SettingsPatch extends Partial<Omit<Settings, 'keyBindings'>> {
  keyBindings?: Partial<Record<InputAction, string>>;
}

export interface CreateSettingsStoreOptions {
  /** Injected storage; omit to use localStorage, null to force memory-only. */
  storage?: KeyValueStore | null;
  /** Overrides applied on top of defaults, e.g. OS reduced-motion preference. */
  defaults?: Partial<Settings>;
}

export function createSettingsStore(options: CreateSettingsStoreOptions = {}): SettingsStore {
  const storage = resolveStorage(options.storage);
  const listeners = new Set<(settings: Settings) => void>();

  const hydrate = (): Settings => {
    const base: Settings = {
      ...DEFAULT_SETTINGS,
      ...options.defaults,
      keyBindings: { ...DEFAULT_KEY_BINDINGS, ...options.defaults?.keyBindings },
    };
    if (!storage) return normaliseSettings(base);
    try {
      const stored = storage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) return normaliseSettings(base);
      const parsed: unknown = JSON.parse(stored);
      if (!isRecord(parsed)) return normaliseSettings(base);
      const storedBindings = isRecord(parsed.keyBindings) ? parsed.keyBindings : {};
      return normaliseSettings({
        ...base,
        ...parsed,
        keyBindings: { ...base.keyBindings, ...storedBindings },
      });
    } catch {
      return normaliseSettings(base);
    }
  };

  let state = hydrate();

  const persist = (): void => {
    if (!storage) return;
    try {
      storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Write blocked (quota/private mode): in-memory state still applies.
    }
  };

  const emit = (): void => {
    for (const listener of listeners) listener(state);
  };

  return {
    get: () => state,
    update(patch) {
      const merged: Settings = {
        ...state,
        ...patch,
        keyBindings: { ...state.keyBindings, ...patch.keyBindings },
      };
      state = normaliseSettings(merged);
      persist();
      emit();
      return state;
    },
    reset() {
      state = normaliseSettings({ ...DEFAULT_SETTINGS, ...options.defaults });
      persist();
      emit();
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Formats a KeyboardEvent.code for display, e.g. ShiftLeft -> Shift, KeyA -> A. */
export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
  if (code === 'Escape') return 'Esc';
  if (code === 'Space') return 'Space';
  if (code.startsWith('Arrow')) return `${code.slice(5)} arrow`;
  return code;
}

/** The in-memory fallback store, exported for tests and headless use. */
export function createMemoryStore(): KeyValueStore {
  return memoryStore();
}

/** Exposed for tests: dump of the memory store contents. */
export type MemoryStore = ReturnType<typeof memoryStore>;
