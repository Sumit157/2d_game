import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../config';

/**
 * Phase 0 placeholder scene.
 *
 * It proves the Phaser bootstrap, render loop and responsive scaling work.
 * It deliberately contains no combat: menus arrive in Phase 1 and the local
 * combat vertical slice in Phase 2.
 */
export class PlaceholderScene extends Phaser.Scene {
  public constructor() {
    super('Placeholder');
  }

  public create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x12101c);

    // Framing box standing in for the future arena.
    this.add
      .rectangle(centerX, centerY, GAME_WIDTH * 0.8, GAME_HEIGHT * 0.6, 0x1c1830, 1)
      .setStrokeStyle(3, 0xe4b151);

    this.add
      .text(centerX, centerY - 60, 'DESI FIGHTER', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '72px',
        fontStyle: 'bold',
        color: '#f5efe2',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 20, 'Phase 0 scaffold — menus and combat not built yet', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#e4b151',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 80, 'Phaser 3 + Vite + TypeScript', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#9d94ad',
      })
      .setOrigin(0.5);
  }
}
