import { APP_VERSION } from './config';
import { createArenaHost } from './game/arenaHost';
import { createSettingsStore } from './settings/settings';
import { mountApp } from './ui/app';

const root = document.querySelector<HTMLElement>('#app');
if (!root) {
  throw new Error('Desi Fighter: missing #app root element');
}

// Respect the OS reduced-motion preference the first time settings are read;
// a stored choice on this device always wins afterwards.
const prefersReducedMotion =
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const settingsStore = createSettingsStore({ defaults: { reducedMotion: prefersReducedMotion } });

mountApp({
  root,
  arena: createArenaHost(),
  settingsStore,
});

console.info(`Desi Fighter v${APP_VERSION} — menu shell ready`);
