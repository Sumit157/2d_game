import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { ArenaHost, ArenaMountOptions } from '../ui/app';
import { WorldScene } from './worldScene';

/**
 * Owns the Phaser game instance for the arena.
 *
 * The game is created on entry and destroyed on exit so the menu stays a
 * lightweight DOM app. The scene receives read-only access to the simulation
 * state owned by the screen — rendering is never the source of truth.
 */
export function createArenaHost(): ArenaHost {
  let game: Phaser.Game | null = null;

  const unmount = (): void => {
    if (!game) return;
    game.destroy(true);
    game = null;
  };

  return {
    mount(container, options: ArenaMountOptions) {
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
      game.scene.add('world', new WorldScene(), true, {
        stageId: options.stageId,
        getState: options.getState,
        drainEvents: options.drainEvents,
        getVisuals: options.getVisuals,
      });
    },
    unmount,
  };
}
