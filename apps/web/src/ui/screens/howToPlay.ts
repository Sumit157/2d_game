import {
  INPUT_ACTIONS,
  INPUT_ACTION_LABELS,
  ROUNDS_TO_WIN,
  DEFAULT_ROUND_SECONDS,
} from '@desi-fighter/shared';

import { formatKeyCode } from '../../settings/settings';
import { el } from '../dom';
import { backButton, pageTitle, satireNote } from '../components';
import type { ScreenContext, ScreenInstance } from '../app';

/** Static explainer content drawn from `docs/07_MOVEMENT_COMBAT_AND_ABILITIES.md`. */
export function howToPlayScreen(ctx: ScreenContext): ScreenInstance {
  const root = el('section', { class: 'screen screen--prose', ariaLabel: 'How to play' });

  const bindings = ctx.settings.get().keyBindings;
  const controlRows = INPUT_ACTIONS.filter((action) => action !== 'pause').map((action) =>
    el('tr', {}, [
      el('td', { text: INPUT_ACTION_LABELS[action] }),
      el('td', {}, [el('kbd', { class: 'binding__key', text: formatKeyCode(bindings[action]) })]),
    ]),
  );

  const controls = el('div', { class: 'panel' }, [
    el('h2', { class: 'section-label', text: 'Controls' }),
    el('p', {
      class: 'panel__hint',
      text: 'Bindings come from Settings and can be changed there. Touch buttons arrive with Phase 5.',
    }),
    el('table', { class: 'controls-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: 'Action' }), el('th', { text: 'Key' })])]),
      el('tbody', {}, controlRows),
    ]),
  ]);

  const rules = el('div', { class: 'panel' }, [
    el('h2', { class: 'section-label', text: 'How a match works' }),
    el('ul', { class: 'prose-list' }, [
      el('li', {
        text: `Best of three rounds. The first fighter to win ${ROUNDS_TO_WIN} rounds takes the match.`,
      }),
      el('li', {
        text: `Each round runs ${DEFAULT_ROUND_SECONDS} seconds. On time-out, the fighter with more health wins the round.`,
      }),
      el('li', {
        text: 'Attacks follow startup, active and recovery frames — a missed heavy attack leaves you open to a punish.',
      }),
      el('li', {
        text: 'Blocking reduces incoming damage, but you cannot block while stunned or mid-attack.',
      }),
      el('li', {
        text: 'Meter builds from landing hits and from defending. Spend it on specials; fill it completely for an ultimate, which has a clear wind-up.',
      }),
      el('li', {
        text: 'Ultimates are dramatic, never an instant win. Every fighter has a weakness to exploit.',
      }),
    ]),
  ]);

  root.append(
    pageTitle('How to Play', 'Everything you need before your first fight.'),
    controls,
    rules,
    satireNote(),
    el('div', { class: 'screen__footer' }, [backButton(() => ctx.back())]),
  );

  return { root, destroy: () => undefined };
}
