import {
  DEFAULT_CHARACTER_ID,
  DEFAULT_STAGE_ID,
  type CombatEvent,
  type MatchState,
} from '@desi-fighter/shared';

import type { ArenaVisuals } from '../game/worldScene';
import type { SettingsStore } from '../settings/settings';
import { clear, focusFirst, el } from './dom';
import { createNavigation, type Navigation, type ScreenId } from './navigation';
import { arenaScreen } from './screens/arena';
import { characterSelectScreen } from './screens/characterSelect';
import { howToPlayScreen } from './screens/howToPlay';
import { mainMenuScreen } from './screens/mainMenu';
import { modeSelectScreen } from './screens/modeSelect';
import { settingsScreen } from './screens/settingsScreen';
import { stageSelectScreen } from './screens/stageSelect';
import { createRafScheduler, type Scheduler } from './scheduler';

/**
 * Menu shell.
 *
 * Screens are plain HTML for accessibility; Phaser only renders the arena.
 * Navigation, selection and settings are injected so tests can mount the whole
 * shell with a fake arena host and no WebGL.
 */

/** Everything the renderer needs to draw a match it does not own. */
export interface ArenaMountOptions {
  stageId: string;
  /** Character id per fighter slot (player one, player two). */
  fighters: readonly [string, string];
  /** Authoritative simulation state, read every rendered frame. */
  getState(): MatchState;
  /** Presentation events produced by simulation ticks. */
  drainEvents(): CombatEvent[];
  /** Live visual preferences (shake, reduced motion). */
  getVisuals(): ArenaVisuals;
}

export interface ArenaHost {
  mount(container: HTMLElement, options: ArenaMountOptions): void;
  unmount(): void;
}

export interface SelectionState {
  mode: 'solo' | 'online';
  characterId: string;
  stageId: string;
}

export interface ScreenContext {
  navigate(screen: ScreenId): void;
  back(): void;
  /** Leaves the arena and clears history so Back cannot re-enter a match. */
  leaveToMenu(): void;
  selection: SelectionState;
  settings: SettingsStore;
  arena: ArenaHost;
  /** Frame loop used by the arena; injectable so tests control time. */
  scheduler: Scheduler;
  announce(message: string): void;
}

export interface ScreenInstance {
  root: HTMLElement;
  destroy(): void;
}

export type ScreenFactory = (ctx: ScreenContext) => ScreenInstance;

export interface MountAppOptions {
  root: HTMLElement;
  arena: ArenaHost;
  settingsStore: SettingsStore;
  initialScreen?: ScreenId;
  /** Frame loop for the arena; defaults to requestAnimationFrame. */
  scheduler?: Scheduler;
  /** Test hook: override individual screens. */
  screens?: Partial<Record<ScreenId, ScreenFactory>>;
}

export interface AppHandle {
  destroy(): void;
  navigation: Navigation;
}

const SCREENS: Record<ScreenId, ScreenFactory> = {
  'main-menu': mainMenuScreen,
  'mode-select': modeSelectScreen,
  'character-select': characterSelectScreen,
  'stage-select': stageSelectScreen,
  settings: settingsScreen,
  'how-to-play': howToPlayScreen,
  arena: arenaScreen,
};

export function mountApp(options: MountAppOptions): AppHandle {
  const { root, arena, settingsStore } = options;
  const scheduler = options.scheduler ?? createRafScheduler();
  const factories: Record<ScreenId, ScreenFactory> = { ...SCREENS, ...options.screens };

  const selection: SelectionState = {
    mode: 'solo',
    characterId: DEFAULT_CHARACTER_ID,
    stageId: DEFAULT_STAGE_ID,
  };

  const status = el('div', { class: 'sr-only', id: 'app-announcer', ariaLive: 'polite' });
  const host = el('div', { id: 'screen-host' });
  root.append(status, host);

  const navigation = createNavigation(options.initialScreen ?? 'main-menu');
  let active: ScreenInstance | null = null;

  const ctx: ScreenContext = {
    navigate: (screen) => navigation.push(screen),
    back: () => {
      navigation.back();
    },
    leaveToMenu: () => navigation.reset('main-menu'),
    selection,
    settings: settingsStore,
    arena,
    scheduler,
    announce: (message) => {
      status.textContent = message;
    },
  };

  const render = (screen: ScreenId): void => {
    active?.destroy();
    active = null;
    clear(host);
    const instance = factories[screen](ctx);
    active = instance;
    host.append(instance.root);
    focusFirst(instance.root);
    root.scrollTop = 0;
  };

  const unsubscribe = navigation.subscribe(render);
  render(navigation.current());

  // Esc walks one screen back, mirroring the in-game pause/back convention.
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.key !== 'Escape') return;
    if (!navigation.canGoBack()) return;
    event.preventDefault();
    navigation.back();
  };
  document.addEventListener('keydown', onKeydown);

  // Keep CSS in sync with the reduced-motion preference.
  const applyMotionPreference = (): void => {
    root.dataset.motion = settingsStore.get().reducedMotion ? 'reduced' : 'full';
  };
  applyMotionPreference();
  const unsubscribeSettings = settingsStore.subscribe(applyMotionPreference);

  return {
    navigation,
    destroy() {
      unsubscribe();
      unsubscribeSettings();
      document.removeEventListener('keydown', onKeydown);
      active?.destroy();
      active = null;
      clear(root);
    },
  };
}
