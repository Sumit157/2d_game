import { el } from '../dom';
import { backButton, liveStatus, pageTitle, setStatus } from '../components';
import type { ScreenContext, ScreenInstance } from '../app';

/**
 * Mode selection: Solo / Create Room / Join Room.
 *
 * Online rooms land in Phase 4, so those two actions answer with a visible,
 * announced notice instead of a dead end or a fake lobby.
 */
export function modeSelectScreen(ctx: ScreenContext): ScreenInstance {
  const root = el('section', { class: 'screen', ariaLabel: 'Choose a mode' });
  const status = liveStatus();

  const options = el('div', { class: 'option-list' }, [
    el(
      'button',
      {
        class: 'btn option',
        data: { autofocus: '1' },
        onPress: () => {
          ctx.selection.mode = 'solo';
          ctx.navigate('character-select');
        },
      },
      [
        el('span', { class: 'option__title', text: 'Solo practice' }),
        el('span', { class: 'option__hint', text: 'Fight a basic AI, no account needed' }),
      ],
    ),
    el(
      'button',
      {
        class: 'btn option',
        onPress: () => {
          setStatus(
            status,
            'Create Room arrives in Phase 4 of this build. Solo play is ready now.',
          );
        },
      },
      [
        el('span', { class: 'option__title', text: 'Create Room' }),
        el('span', { class: 'option__hint', text: 'Get a short invite code for a private 1v1' }),
      ],
    ),
    el(
      'button',
      {
        class: 'btn option',
        onPress: () => {
          setStatus(status, 'Join Room arrives in Phase 4 of this build. Solo play is ready now.');
        },
      },
      [
        el('span', { class: 'option__title', text: 'Join Room' }),
        el('span', { class: 'option__hint', text: 'Enter a friend’s invite code' }),
      ],
    ),
  ]);

  root.append(
    pageTitle('Play Online', 'Private room codes for 1v1. No accounts, no matchmaking.'),
    options,
    status,
    el('div', { class: 'screen__footer' }, [backButton(() => ctx.back())]),
  );

  return { root, destroy: () => undefined };
}
