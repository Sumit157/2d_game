import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { ArenaHost } from '../ui/app';
import { PlaceholderArenaScene } from './placeholderArenaScene';

/**
 * Owns the Phaser game instance for the placeholder arena.
 *
 * The game is created on entry and destroyed on exit so the menu stays a
 * lightweight DOM app. Phase 2 replaces the scene with the combat simulator;
 * rendering never becomes the source of truth for combat results.
 */
export function createArenaHost(): ArenaHost {
  let game: Phaser.Game | null = null;

  const unmount = (): void => {
    if (!game) return;
    game.destroy(true);
    game = null;
  };

  return {
    mount(container, stageId, characterId) {
      unmount();
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: container,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: '#0b0912',
        banner: false,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [],
      });
      game.scene.add('arena', new PlaceholderArenaScene(), true, { stageId, characterId });
    },
    unmount,
  };
}
