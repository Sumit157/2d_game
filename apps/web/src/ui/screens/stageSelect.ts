import { getCharacter, getStage, STAGES } from '@desi-fighter/shared';

import { el } from '../dom';
import { backButton, pageTitle, satireNote } from '../components';
import type { ScreenContext, ScreenInstance } from '../app';

/**
 * Stage select: two wide bands with CSS-drawn previews built from each
 * stage's palette. Selected state is shown with a text badge, not colour.
 */
export function stageSelectScreen(ctx: ScreenContext): ScreenInstance {
  const root = el('section', { class: 'screen', ariaLabel: 'Choose a stage' });
  const cards = new Map<string, { card: HTMLButtonElement; badge: HTMLElement }>();

  const select = (stageId: string): void => {
    ctx.selection.stageId = stageId;
    for (const [id, entry] of cards) {
      const selected = id === stageId;
      entry.card.setAttribute('aria-pressed', String(selected));
      entry.card.classList.toggle('is-selected', selected);
      entry.badge.hidden = !selected;
    }
    ctx.announce(`${getStage(stageId)?.name ?? stageId} selected.`);
  };

  for (const stage of STAGES) {
    const badge = el('span', { class: 'badge', text: 'Selected', hidden: true });
    const preview = el('div', { class: 'stage-preview', ariaHidden: 'true' }, [
      el('span', { class: 'stage-preview__sky' }),
      el('span', { class: `stage-preview__prop stage-preview__prop--${stage.id}` }),
      el('span', { class: 'stage-preview__ground' }),
    ]);
    preview.style.setProperty('--sky', stage.palette.sky);
    preview.style.setProperty('--ground', stage.palette.ground);
    preview.style.setProperty('--accent', stage.palette.accent);
    preview.style.setProperty('--prop', stage.palette.prop);

    const card = el(
      'button',
      { class: 'stage-card', ariaPressed: 'false', onPress: () => select(stage.id) },
      [
        preview,
        el('span', { class: 'stage-card__body' }, [
          el('span', { class: 'stage-card__title', text: stage.name }),
          el('span', { class: 'stage-card__tagline', text: stage.tagline }),
          el('span', { class: 'stage-card__description', text: stage.description }),
          badge,
        ]),
      ],
    );
    cards.set(stage.id, { card, badge });
    root.append(card);
  }

  const character = getCharacter(ctx.selection.characterId);

  root.prepend(
    pageTitle(
      'Choose a stage',
      'Both stages are original placeholder art, selected before the fight.',
    ),
    satireNote(),
  );

  root.append(
    el('p', {
      class: 'matchup',
      text: `${character?.displayName ?? 'Your fighter'} vs CPU · best of three rounds`,
    }),
    el('div', { class: 'screen__footer' }, [
      backButton(() => ctx.back()),
      el('button', {
        class: 'btn btn--primary',
        text: 'Start match',
        onPress: () => ctx.navigate('arena'),
      }),
    ]),
  );

  const initialStage = ctx.selection.stageId;
  select(cards.has(initialStage) ? initialStage : (STAGES[0]?.id ?? ''));

  return { root, destroy: () => undefined };
}
