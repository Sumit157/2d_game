import { APP_VERSION } from '../../config';
import { el } from '../dom';
import { satireNote } from '../components';
import type { ScreenContext, ScreenInstance } from '../app';

/**
 * Main menu: title, Solo Fight, Play Online, How to Play, Settings.
 * Layout is an asymmetric rail — wordmark and actions on the left, a
 * decorative versus poster on the right.
 */
export function mainMenuScreen(ctx: ScreenContext): ScreenInstance {
  const root = el('section', { class: 'screen screen--menu', ariaLabel: 'Main menu' });

  const actions = el('nav', { class: 'menu-rail', ariaLabel: 'Main menu actions' }, [
    el('button', {
      class: 'btn btn--primary menu-rail__item',
      text: 'Solo Fight',
      data: { autofocus: '1' },
      onPress: () => {
        ctx.selection.mode = 'solo';
        ctx.navigate('character-select');
      },
    }),
    el('button', {
      class: 'btn menu-rail__item',
      text: 'Play Online',
      onPress: () => ctx.navigate('mode-select'),
    }),
    el('button', {
      class: 'btn menu-rail__item',
      text: 'How to Play',
      onPress: () => ctx.navigate('how-to-play'),
    }),
    el('button', {
      class: 'btn menu-rail__item',
      text: 'Settings',
      onPress: () => ctx.navigate('settings'),
    }),
  ]);

  const wordmark = el('h1', { class: 'wordmark', tabIndex: '-1', ariaLabel: 'Desi Fighter' }, [
    el('span', { class: 'wordmark__a', text: 'Desi' }),
    el('span', { class: 'wordmark__b', text: 'Fighter' }),
  ]);

  const left = el('div', { class: 'menu-rail__column' }, [
    wordmark,
    el('p', {
      class: 'tagline',
      text: 'A fast, funny browser fighter where fictional political personas settle it with tea, ballots, bulldozers and budgets.',
    }),
    actions,
    el('p', { class: 'build-tag', text: `Development build ${APP_VERSION} · Phase 1 menu shell` }),
  ]);

  const poster = el('div', { class: 'poster', ariaHidden: 'true' }, [
    el('div', { class: 'poster__side poster__side--chai' }, [
      el('span', { class: 'poster__name', text: 'Chai Commander' }),
    ]),
    el('div', { class: 'poster__seal', text: 'VS' }),
    el('div', { class: 'poster__side poster__side--vanguard' }, [
      el('span', { class: 'poster__name', text: 'Vote-Count Vanguard' }),
    ]),
    el('p', { class: 'poster__caption', text: 'Parliament · Jantar Mantar' }),
  ]);

  root.append(left, poster, satireNote());
  return { root, destroy: () => undefined };
}
