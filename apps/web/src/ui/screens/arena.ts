import { getCharacter, getStage } from '@desi-fighter/shared';

import { el } from '../dom';
import { pageTitle } from '../components';
import type { ScreenContext, ScreenInstance } from '../app'; /**
 * Placeholder arena.
 *
 * Phase 1 only proves that a selection reaches a playable surface. Combat
 * rules, HUD and round flow arrive in Phase 2; the Phaser scene is mounted
 * here and torn down on leave.
 */
export function arenaScreen(ctx: ScreenContext): ScreenInstance {
  const root = el('section', { class: 'screen screen--arena', ariaLabel: 'Match' });

  const character = getCharacter(ctx.selection.characterId);
  const stage = getStage(ctx.selection.stageId);

  const stageMount = el('div', { class: 'arena-stage', id: 'arena-stage' });

  root.append(
    pageTitle(
      `${character?.displayName ?? 'Fighter'} at ${stage?.name ?? 'stage'}`,
      'Placeholder arena — combat, HUD and rounds land in Phase 2.',
    ),
    stageMount,
    el('div', { class: 'screen__footer' }, [
      el('button', {
        class: 'btn btn--primary',
        text: 'Return to menu',
        data: { autofocus: '1' },
        onPress: () => ctx.leaveToMenu(),
      }),
    ]),
  );

  ctx.arena.mount(stageMount, ctx.selection.stageId, ctx.selection.characterId);

  return {
    root,
    destroy: () => {
      ctx.arena.unmount();
    },
  };
}
