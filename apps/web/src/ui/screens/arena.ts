import {
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  ROUNDS_TO_WIN,
  TIMING,
  getCharacter,
  getStage,
  type MatchState,
} from '@desi-fighter/shared';

import { createMatchRunner } from '../../game/matchRunner';
import { createKeyboardInput } from '../../input/keyboard';
import { PLAYER_TWO_KEY_BINDINGS } from '../../settings/settings';
import { pageTitle } from '../components';
import { clear, el } from '../dom';
import type { ScreenContext, ScreenInstance } from '../app';

/**
 * Fight screen: DOM HUD and result overlays around the Phaser world.
 *
 * The screen owns the fixed-timestep loop and the two keyboard adapters; the
 * shared engine owns every rule; Phaser only draws. Health, timer and round
 * outcomes are read from `MatchState`, so what the HUD shows and what the
 * simulation decided can never drift apart.
 */

/** Longest simulated stretch a single frame may replay after a stall. */
const MAX_STEPS_PER_FRAME = 8;

type OverlayKind = 'hidden' | 'countdown' | 'round-result' | 'match-result' | 'paused';

interface OverlayView {
  kind: OverlayKind;
  /** Big centred line. */
  title: string;
  /** Smaller supporting line, empty for the countdown. */
  detail: string;
}

interface PlayerHud {
  root: HTMLElement;
  name: HTMLElement;
  fill: HTMLElement;
  bar: HTMLElement;
  hp: HTMLElement;
  rounds: HTMLElement;
  dots: HTMLElement[];
}

function buildPlayerHud(side: 'left' | 'right'): PlayerHud {
  const name = el('span', { class: 'hud-player__name' });
  const fill = el('span', { class: 'hud-bar__fill' });
  const bar = el('div', { class: 'hud-bar' }, [fill]);
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  const hp = el('span', { class: 'hud-player__hp' });
  const rounds = el('span', { class: 'hud-player__rounds', ariaLabel: 'Rounds won' });
  const dots = Array.from({ length: ROUNDS_TO_WIN }, () => el('span', { class: 'hud-dot' }));
  rounds.append(...dots);

  return {
    root: el('div', { class: `hud-player hud-player--${side}` }, [
      name,
      bar,
      el('div', { class: 'hud-player__meta' }, [hp, rounds]),
    ]),
    name,
    fill,
    bar,
    hp,
    rounds,
    dots,
  };
}

export function arenaScreen(ctx: ScreenContext): ScreenInstance {
  const root = el('section', { class: 'screen screen--arena', ariaLabel: 'Match' });

  // Phase 2: player one picks a fighter, player two occupies the other slot
  // with a second keyboard (an AI takes this slot in Phase 3).
  const opponentId =
    CHARACTERS.find((character) => character.id !== ctx.selection.characterId)?.id ??
    DEFAULT_CHARACTER_ID;
  const fighters: [string, string] = [ctx.selection.characterId, opponentId];

  const runner = createMatchRunner({ characters: fighters, stageId: ctx.selection.stageId });
  const playerOne = createKeyboardInput({ bindings: () => ctx.settings.get().keyBindings });
  const playerTwo = createKeyboardInput({ bindings: () => PLAYER_TWO_KEY_BINDINGS });

  /* ---------------------------------------------------------------- */
  /* DOM                                                               */
  /* ---------------------------------------------------------------- */

  const worldMount = el('div', { class: 'arena-world', id: 'arena-world' });
  const left = buildPlayerHud('left');
  const right = buildPlayerHud('right');
  const timer = el('span', { class: 'hud-timer' });
  const roundLabel = el('span', { class: 'hud-round' });

  const hud = el('div', { class: 'arena-hud' }, [
    left.root,
    el('div', { class: 'hud-centre' }, [timer, roundLabel]),
    right.root,
  ]);

  const overlay = el('div', { class: 'arena-overlay', role: 'status', hidden: true });
  const overlayBody = el('div', { class: 'arena-overlay__body' });
  overlay.append(overlayBody);

  const arenaFrame = el('div', { class: 'arena-frame' }, [worldMount, hud, overlay]);

  const pauseButton = el('button', {
    class: 'btn btn--ghost',
    text: 'Pause',
    onPress: () => setPaused(!paused),
  });

  const stage = getStage(ctx.selection.stageId);
  const footer = el('div', { class: 'screen__footer' }, [
    pauseButton,
    el('p', {
      class: 'arena-hint',
      text:
        'Player 1: WASD-style movement, J light, K heavy, Shift block · ' +
        'Player 2: arrow keys, Comma light, Period heavy, Shift block · Esc pauses' +
        (stage ? ` · ${stage.name}` : ''),
    }),
  ]);

  root.append(
    pageTitle('Fight!', 'Best of three rounds — first to two takes the match.'),
    arenaFrame,
    footer,
  );

  /* ---------------------------------------------------------------- */
  /* HUD                                                               */
  /* ---------------------------------------------------------------- */

  const hudCache = {
    hp: ['', ''],
    width: [-1, -1],
    score: [-1, -1],
    timer: -1,
    round: -1,
    names: ['', ''],
  };

  function syncHud(state: MatchState): void {
    const sides: [PlayerHud, PlayerHud] = [left, right];

    for (const index of [0, 1] as const) {
      const fighter = state.fighters[index];
      const side = sides[index];
      const character = getCharacter(fighter.characterId) ?? getCharacter(DEFAULT_CHARACTER_ID);
      const name = character?.displayName ?? 'Fighter';

      if (hudCache.names[index] !== name) {
        hudCache.names[index] = name;
        side.name.textContent = name;
        side.bar.setAttribute('aria-label', `${name} health`);
        side.rounds.setAttribute('aria-label', `Rounds won by ${name}`);
      }

      const hpText = `${fighter.health}/${fighter.maxHealth}`;
      if (hudCache.hp[index] !== hpText) {
        hudCache.hp[index] = hpText;
        side.hp.textContent = hpText;
        side.bar.setAttribute('aria-valuenow', String(fighter.health));
        side.bar.setAttribute('aria-valuemax', String(fighter.maxHealth));
        side.bar.setAttribute('aria-valuetext', `${fighter.health} of ${fighter.maxHealth} health`);
      }

      const width = Math.round((fighter.health / fighter.maxHealth) * 100);
      if (hudCache.width[index] !== width) {
        hudCache.width[index] = width;
        side.fill.style.width = `${width}%`;
        side.fill.classList.toggle('hud-bar__fill--low', width <= 25);
      }

      const score = state.scores[index];
      if (hudCache.score[index] !== score) {
        hudCache.score[index] = score;
        side.dots.forEach((dot, dotIndex) => {
          dot.classList.toggle('hud-dot--won', dotIndex < score);
        });
        side.rounds.setAttribute(
          'aria-label',
          `Rounds won by ${name}: ${score} of ${ROUNDS_TO_WIN}`,
        );
      }
    }

    const seconds = Math.max(0, Math.ceil(state.roundTicksLeft / state.tickRate));
    if (hudCache.timer !== seconds) {
      hudCache.timer = seconds;
      timer.textContent = String(seconds);
      timer.setAttribute('aria-label', `${seconds} seconds remaining`);
      timer.classList.toggle('hud-timer--urgent', state.phase === 'round-active' && seconds <= 10);
    }

    if (hudCache.round !== state.round) {
      hudCache.round = state.round;
      roundLabel.textContent = `Round ${state.round}`;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Overlay                                                           */
  /* ---------------------------------------------------------------- */

  let overlayKey = '';
  let paused = false;

  function viewFor(state: MatchState): OverlayView {
    if (paused) {
      return { kind: 'paused', title: 'Paused', detail: 'The clock is stopped.' };
    }
    if (state.phase === 'countdown') {
      const showFight = state.countdownTicks <= Math.floor(TIMING.countdownTicks / 3);
      return {
        kind: 'countdown',
        title: showFight ? 'Fight!' : `Round ${state.round}`,
        detail: '',
      };
    }
    if (state.phase === 'round-active') {
      // Nothing overlays live play; the HUD already carries the state.
      return { kind: 'hidden', title: '', detail: '' };
    }
    if (state.phase === 'round-result') {
      const winner = state.lastRoundResult?.winnerIndex ?? null;
      return {
        kind: 'round-result',
        title:
          winner === null ? 'Draw round' : `${nameOf(state, winner)} takes round ${state.round}`,
        detail: `Score ${state.scores[0]}–${state.scores[1]}`,
      };
    }
    const winner = state.winnerIndex;
    return {
      kind: 'match-result',
      title: winner === null ? 'Match drawn' : `${nameOf(state, winner)} wins the match`,
      detail: `Final score ${state.scores[0]}–${state.scores[1]}`,
    };
  }

  function renderOverlay(state: MatchState): void {
    const view = viewFor(state);
    const key = `${view.kind}|${view.title}|${view.detail}`;
    if (key === overlayKey) return;

    const hadFocus = overlay.contains(document.activeElement);
    overlayKey = key;

    clear(overlayBody);
    overlayBody.className = `arena-overlay__body arena-overlay__body--${view.kind}`;
    overlay.hidden = view.kind === 'hidden';
    overlay.classList.toggle('arena-overlay--transparent', view.kind === 'countdown');

    if (view.kind !== 'hidden') {
      overlayBody.append(el('p', { class: 'arena-overlay__title', text: view.title }));
      if (view.detail) {
        overlayBody.append(el('p', { class: 'arena-overlay__detail', text: view.detail }));
      }
    }

    let primary: HTMLElement | null = null;

    if (view.kind === 'paused') {
      primary = el('button', {
        class: 'btn btn--primary',
        text: 'Resume',
        data: { autofocus: '1' },
        onPress: () => setPaused(false),
      });
      overlayBody.append(
        primary,
        el('button', { class: 'btn btn--ghost', text: 'Return to menu', onPress: ctx.leaveToMenu }),
      );
      ctx.announce('Match paused');
    }

    if (view.kind === 'match-result') {
      primary = el('button', {
        class: 'btn btn--primary',
        text: 'Rematch',
        data: { autofocus: '1' },
        onPress: () => {
          runner.restart();
          overlayKey = '';
          syncHud(runner.state);
          renderOverlay(runner.state);
        },
      });
      overlayBody.append(
        primary,
        el('button', { class: 'btn btn--ghost', text: 'Return to menu', onPress: ctx.leaveToMenu }),
      );
      ctx.announce(view.title);
    }

    if (view.kind === 'round-result') {
      ctx.announce(`${view.title}. ${view.detail}`);
    }
    if (view.kind === 'countdown' && view.title === 'Fight!') {
      ctx.announce('Fight!');
    }

    pauseButton.textContent = paused ? 'Resume' : 'Pause';

    if (primary) {
      primary.focus();
    } else if (hadFocus) {
      // The focused control disappeared: keep the keyboard user somewhere real.
      pauseButton.focus();
    }
  }

  function nameOf(state: MatchState, index: 0 | 1): string {
    const character = getCharacter(state.fighters[index].characterId);
    return character?.displayName ?? 'Fighter';
  }

  /* ---------------------------------------------------------------- */
  /* Pause + loop                                                      */
  /* ---------------------------------------------------------------- */

  function setPaused(next: boolean): void {
    if (paused === next) return;
    paused = next;
    overlayKey = '';
    renderOverlay(runner.state);
    if (!next) {
      pauseButton.textContent = 'Pause';
      pauseButton.focus();
    }
  }

  const onPauseKey = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const pauseCode = ctx.settings.get().keyBindings.pause;
    if (keyboardEvent.code !== 'Escape' && keyboardEvent.code !== pauseCode) return;
    // Capture phase: Esc must pause the match, never pop the screen stack.
    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    setPaused(!paused);
  };
  document.addEventListener('keydown', onPauseKey, true);

  const tickMs = 1000 / runner.state.tickRate;
  let handle = 0;
  let lastTime: number | null = null;
  let accumulator = 0;
  let destroyed = false;

  const frame = (timeMs: number): void => {
    if (destroyed) return;
    const delta = lastTime === null ? 0 : Math.max(0, Math.min(timeMs - lastTime, 250));
    lastTime = timeMs;

    if (!paused) {
      accumulator += delta;
      let steps = 0;
      while (accumulator >= tickMs && steps < MAX_STEPS_PER_FRAME) {
        runner.step([playerOne.intent(), playerTwo.intent()]);
        accumulator -= tickMs;
        steps += 1;
      }
      if (steps >= MAX_STEPS_PER_FRAME) {
        // A long stall must not replay hundreds of ticks at once.
        accumulator = 0;
      }
    }

    syncHud(runner.state);
    renderOverlay(runner.state);
    handle = ctx.scheduler.request(frame);
  };

  playerOne.attach();
  playerTwo.attach();

  ctx.arena.mount(worldMount, {
    stageId: ctx.selection.stageId,
    fighters,
    getState: () => runner.state,
    drainEvents: () => runner.drainEvents(),
    getVisuals: () => ({
      screenShake: ctx.settings.get().screenShake,
      reducedMotion: ctx.settings.get().reducedMotion,
    }),
  });

  syncHud(runner.state);
  renderOverlay(runner.state);
  handle = ctx.scheduler.request(frame);

  return {
    root,
    destroy() {
      destroyed = true;
      ctx.scheduler.cancel(handle);
      playerOne.detach();
      playerTwo.detach();
      document.removeEventListener('keydown', onPauseKey, true);
      ctx.arena.unmount();
    },
  };
}
