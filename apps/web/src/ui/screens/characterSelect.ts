import { CONTENT_FLAGS, type CharacterDefinition, CHARACTERS } from '@desi-fighter/shared';

import { el } from '../dom';
import { backButton, pageTitle, MOVE_KIND_LABELS, satireNote, statRow } from '../components';
import type { ScreenContext, ScreenInstance } from '../app';

/**
 * Character select: roster grid + detail panel.
 *
 * Selection state lives on ctx.selection so stage select and the arena pick it
 * up. Cards show a text "Selected" badge — never colour alone.
 */
export function characterSelectScreen(ctx: ScreenContext): ScreenInstance {
  const root = el('section', { class: 'screen', ariaLabel: 'Select your fighter' });

  const grid = el('div', { class: 'roster', role: 'group', ariaLabel: 'Fighter roster' });
  const details = el('div', { class: 'fighter-details', ariaLive: 'polite' });
  const cards = new Map<string, { card: HTMLButtonElement; badge: HTMLElement }>();

  const renderDetails = (character: CharacterDefinition): void => {
    while (details.firstChild) details.removeChild(details.firstChild);

    details.append(
      el('p', { class: 'fighter-details__archetype', text: character.archetype }),
      el('h2', { class: 'fighter-details__name', text: character.displayName }),
      el('p', { class: 'fighter-details__tagline', text: character.tagline }),
      el('p', { class: 'fighter-details__description', text: character.description }),
    );

    const stats = el('div', { class: 'stats', ariaLabel: 'Relative base stats' }, [
      statRow('Health', character.stats.health),
      statRow('Speed', character.stats.speed),
      statRow('Power', character.stats.power),
      statRow('Range', character.stats.range),
    ]);
    details.append(el('h3', { class: 'section-label', text: 'Base stats' }), stats);

    const moves = el(
      'ul',
      { class: 'moves' },
      character.signatureMoves.map((move) =>
        el('li', { class: 'move' }, [
          el('span', {
            class: `move__kind move__kind--${move.kind}`,
            text: MOVE_KIND_LABELS[move.kind],
          }),
          el('span', { class: 'move__body' }, [
            el('strong', { class: 'move__name', text: move.name }),
            el('span', { class: 'move__description', text: move.description }),
          ]),
        ]),
      ),
    );
    details.append(el('h3', { class: 'section-label', text: 'Signature moves' }), moves);

    if (CONTENT_FLAGS.showInspirationNotes) {
      details.append(
        el('p', {
          class: 'inspiration',
          text: `Inspiration note (fictional parody): ${character.inspirationNote}`,
        }),
      );
    }
  };

  const select = (character: CharacterDefinition): void => {
    ctx.selection.characterId = character.id;
    for (const [id, entry] of cards) {
      const selected = id === character.id;
      entry.card.setAttribute('aria-pressed', String(selected));
      entry.card.classList.toggle('is-selected', selected);
      entry.badge.hidden = !selected;
    }
    renderDetails(character);
    ctx.announce(`${character.displayName} selected.`);
  };

  for (const character of CHARACTERS) {
    const badge = el('span', { class: 'badge', text: 'Selected', hidden: true });
    const portrait = el('span', {
      class: 'roster-card__portrait',
      ariaHidden: 'true',
    });
    portrait.style.setProperty('--p1', character.palette.primary);
    portrait.style.setProperty('--p2', character.palette.secondary);
    const card = el(
      'button',
      {
        class: 'roster-card',
        ariaPressed: 'false',
        onPress: () => select(character),
      },
      [
        portrait,
        el('span', { class: 'roster-card__body' }, [
          el('span', { class: 'roster-card__name', text: character.displayName }),
          el('span', { class: 'roster-card__archetype', text: character.archetype }),
          badge,
        ]),
      ],
    );
    cards.set(character.id, { card, badge });
    grid.append(card);
  }

  const initial =
    CHARACTERS.find((character) => character.id === ctx.selection.characterId) ?? CHARACTERS[0];

  root.append(
    pageTitle(
      'Select your fighter',
      'Four fictional prototypes. More rosters are added as data, not engine code.',
    ),
    satireNote(),
    el('div', { class: 'select-layout' }, [grid, details]),
    el('div', { class: 'screen__footer' }, [
      backButton(() => ctx.back()),
      el('button', {
        class: 'btn btn--primary',
        text: 'Continue to stage',
        onPress: () => ctx.navigate('stage-select'),
      }),
    ]),
  );

  if (initial) select(initial);

  return {
    root,
    destroy: () => undefined,
  };
}
