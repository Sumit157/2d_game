import {
  DEFAULT_CHARACTER_ID,
  DEFAULT_STAGE_ID,
  getCharacter,
  getStage,
} from '@desi-fighter/shared';
import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../config';

interface ArenaData {
  stageId?: string;
  characterId?: string;
}

/**
 * Placeholder arena scene (Phase 1).
 *
 * Draws the selected stage palette and two labelled fighter blocks so the
 * menu flow visibly reaches a game surface. No combat rules live here — the
 * simulation arrives in Phase 2 and remains independent of rendering.
 */
export class PlaceholderArenaScene extends Phaser.Scene {
  private stageId: string = DEFAULT_STAGE_ID;
  private characterId: string = DEFAULT_CHARACTER_ID;

  public constructor() {
    super('PlaceholderArena');
  }

  public init(data: ArenaData): void {
    if (data.stageId) this.stageId = data.stageId;
    if (data.characterId) this.characterId = data.characterId;
  }

  public create(): void {
    const stage = getStage(this.stageId) ?? getStage(DEFAULT_STAGE_ID);
    const opponent = getCharacter(DEFAULT_CHARACTER_ID) ?? getCharacter(this.characterId);
    const player = getCharacter(this.characterId) ?? getCharacter(DEFAULT_CHARACTER_ID);

    if (!stage || !opponent || !player) {
      // Data is version-controlled, so this only fires on a broken build.
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Roster data missing', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '32px',
          color: '#ff8f7a',
        })
        .setOrigin(0.5);
      return;
    }

    const palette = stage.palette;
    const groundY = Math.round(GAME_HEIGHT * 0.78);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, hex(palette.sky));
    this.add.rectangle(
      GAME_WIDTH / 2,
      groundY + (GAME_HEIGHT - groundY) / 2,
      GAME_WIDTH,
      GAME_HEIGHT - groundY,
      hex(palette.ground),
    );
    this.add.rectangle(GAME_WIDTH / 2, groundY, GAME_WIDTH, 6, hex(palette.accent));

    if (stage.id === 'parliament') this.drawParliament(palette);
    else this.drawJantarMantar(palette);

    this.drawFighter(Math.round(GAME_WIDTH * 0.3), groundY, player);
    this.drawFighter(Math.round(GAME_WIDTH * 0.7), groundY, opponent);

    this.add
      .text(32, 28, stage.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#fbf6ec',
      })
      .setOrigin(0, 0);

    this.add
      .text(32, 78, stage.tagline, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: palette.accent,
      })
      .setOrigin(0, 0);

    this.add
      .text(GAME_WIDTH / 2, Math.round(GAME_HEIGHT * 0.42), 'Placeholder arena', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#fbf6ec',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        Math.round(GAME_HEIGHT * 0.52),
        'Combat, HUD and rounds arrive in Phase 2',
        { fontFamily: 'system-ui, sans-serif', fontSize: '26px', color: '#a99fc4' },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 36, 'Fictional satire — placeholder art only', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#a99fc4',
      })
      .setOrigin(0.5);
  }

  private drawParliament(palette: { accent: string; prop: string }): void {
    const accent = hex(palette.accent);
    const prop = hex(palette.prop);
    const domeX = GAME_WIDTH / 2;
    const domeY = Math.round(GAME_HEIGHT * 0.62);

    // Cartoon dome + colonnade, deliberately not a real building's likeness.
    this.add.ellipse(domeX, domeY, 360, 240, prop).setOrigin(0.5, 1);
    this.add.rectangle(domeX, domeY, 420, 18, prop);
    for (let i = -3; i <= 3; i += 1) {
      this.add.rectangle(domeX + i * 62, domeY + 70, 26, 120, prop);
    }
    this.add.rectangle(domeX, domeY + 140, 480, 20, accent);
    this.add.ellipse(domeX, domeY - 40, 46, 46, accent);
  }

  private drawJantarMantar(palette: { accent: string; prop: string }): void {
    const accent = hex(palette.accent);
    const prop = hex(palette.prop);
    const baseY = Math.round(GAME_HEIGHT * 0.78);

    // Oversized sundial ramp and stepped blocks (geometric fantasy, not a
    // depiction of any real monument).
    this.add.triangle(GAME_WIDTH / 2, baseY, 0, 0, 260, 0, 0, -300, prop).setOrigin(0, 1);
    this.add.rectangle(Math.round(GAME_WIDTH * 0.24), baseY - 40, 140, 80, prop);
    this.add.rectangle(Math.round(GAME_WIDTH * 0.24), baseY - 90, 90, 40, accent);
    this.add.rectangle(Math.round(GAME_WIDTH * 0.78), baseY - 55, 170, 110, prop);
    this.add.rectangle(Math.round(GAME_WIDTH * 0.78), baseY - 120, 110, 30, accent);
    this.add.circle(Math.round(GAME_WIDTH * 0.5), Math.round(GAME_HEIGHT * 0.3), 70, accent, 0.35);
  }

  private drawFighter(
    x: number,
    groundY: number,
    fighter: {
      displayName: string;
      palette: { primary: string; secondary: string; accent: string };
    },
  ): void {
    this.add.rectangle(x, groundY - 90, 84, 170, hex(fighter.palette.primary)).setOrigin(0.5, 1);
    this.add.circle(x, groundY - 210, 38, hex(fighter.palette.accent));
    this.add.rectangle(x, groundY - 130, 84, 22, hex(fighter.palette.secondary));

    this.add
      .text(x, groundY + 16, fighter.displayName, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#fbf6ec',
      })
      .setOrigin(0.5, 0);
  }
}

/** Converts a `#rrggbb` string to Phaser's number colour. */
function hex(color: string): number {
  return Number.parseInt(color.replace('#', ''), 16);
}
