import {
  DEFAULT_CHARACTER_ID,
  DEFAULT_STAGE_ID,
  getCharacter,
  getStage,
  type CombatEvent,
  type FighterState,
  type MatchState,
} from '@desi-fighter/shared';
import Phaser from 'phaser';

import { drawStage, hex } from './stageArt';

/** Visual preferences read live from settings at the moment an effect plays. */
export interface ArenaVisuals {
  screenShake: boolean;
  reducedMotion: boolean;
}

export interface WorldSceneData {
  stageId: string;
  /** The authoritative state; the scene only ever reads it. */
  getState(): MatchState;
  /** Pops presentation events produced by the simulation ticks. */
  drainEvents(): CombatEvent[];
  getVisuals(): ArenaVisuals;
}

interface FighterView {
  root: Phaser.GameObjects.Container;
  visual: Phaser.GameObjects.Container;
  guard: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

const BODY_WIDTH = 84;
const BODY_HEIGHT = 170;

/**
 * Arena renderer.
 *
 * Pure presentation: every position, health value and outcome comes from the
 * shared simulation owned by the match runner. Nothing drawn here can change
 * a combat result (see `docs/07_MOVEMENT_COMBAT_AND_ABILITIES.md`).
 */
export class WorldScene extends Phaser.Scene {
  private arenaData!: WorldSceneData;
  private views: [FighterView, FighterView] | null = null;

  public constructor() {
    super('World');
  }

  public init(data: WorldSceneData): void {
    this.arenaData = data;
  }

  public create(): void {
    const { stageId, getState } = this.arenaData;
    drawStage(this, stageId);

    this.views = [this.createFighter(0), this.createFighter(1)];

    const state = getState();
    const names = state.fighters.map((fighter) => this.characterName(fighter));
    const stageName = getStage(state.stageId)?.name ?? getStage(DEFAULT_STAGE_ID)?.name;
    const canvas = this.game.canvas;
    if (canvas) {
      canvas.setAttribute('role', 'img');
      canvas.setAttribute(
        'aria-label',
        `${names[0]} versus ${names[1]} at ${stageName ?? 'arena'} — live match`,
      );
    }
  }

  public override update(): void {
    if (!this.views) return;
    const state = this.arenaData.getState();

    for (let index = 0 as 0 | 1; index < 2; index = (index + 1) as 0 | 1) {
      this.updateFighter(this.views[index], state.fighters[index]);
    }

    for (const event of this.arenaData.drainEvents()) {
      if (event.type === 'hit') this.spawnHit(event);
    }
  }

  private characterName(fighter: FighterState): string {
    const character = getCharacter(fighter.characterId) ?? getCharacter(DEFAULT_CHARACTER_ID);
    return character?.displayName ?? 'Fighter';
  }

  private createFighter(index: 0 | 1): FighterView {
    const fighter = this.arenaData.getState().fighters[index];
    const character = getCharacter(fighter.characterId) ?? getCharacter(DEFAULT_CHARACTER_ID);
    const palette = character?.palette ?? {
      primary: '#6d63b5',
      secondary: '#241d47',
      accent: '#f2a93b',
    };

    const root = this.add.container(fighter.x, fighter.y);
    const visual = this.add.container(0, 0);

    visual.add([
      this.add.rectangle(0, -90, BODY_WIDTH, BODY_HEIGHT, hex(palette.primary)).setOrigin(0.5, 1),
      this.add.rectangle(0, -130, BODY_WIDTH, 22, hex(palette.secondary)),
      this.add.circle(0, -BODY_HEIGHT - 40, 38, hex(palette.accent)),
      // Facing cue: eyes sit on the right so mirroring shows direction.
      this.add.circle(12, -BODY_HEIGHT - 46, 6, 0x0b0912),
      this.add.circle(26, -BODY_HEIGHT - 46, 6, 0x0b0912),
    ]);

    const guard = this.add
      .rectangle(BODY_WIDTH / 2 + 12, -110, 18, 132, hex(palette.accent), 0.9)
      .setVisible(false);
    visual.add(guard);

    const label = this.add
      .text(0, 16, this.characterName(fighter), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fbf6ec',
        stroke: '#0b0912',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0);

    root.add([visual, label]);
    return { root, visual, guard, label };
  }

  private updateFighter(view: FighterView, fighter: FighterState): void {
    view.root.setPosition(fighter.x, fighter.y);
    view.visual.scaleX = fighter.facing;
    view.guard.setVisible(fighter.action === 'blocking');
    view.visual.alpha = fighter.action === 'hitstun' ? 0.7 : 1;
    view.visual.rotation = fighter.action === 'defeated' ? -fighter.facing * 1.4 : 0;
  }

  private spawnHit(event: Extract<CombatEvent, { type: 'hit' }>): void {
    const visuals = this.arenaData.getVisuals();
    const x = event.x;
    const baseY = event.y - 120;

    if (event.blocked) {
      this.floatText(x, baseY, 'BLOCK', '#2fb6a8', visuals.reducedMotion);
      return;
    }

    const spark = this.add.circle(x, baseY, 26, 0xfff2c9, 0.9);
    if (visuals.reducedMotion) {
      this.time.delayedCall(160, () => spark.destroy());
    } else {
      this.tweens.add({
        targets: spark,
        scale: 2.4,
        alpha: 0,
        duration: 180,
        ease: 'quad.out',
        onComplete: () => spark.destroy(),
      });
    }

    this.floatText(x, baseY - 70, `-${event.damage}`, '#fbf6ec', visuals.reducedMotion);

    if (visuals.screenShake && !visuals.reducedMotion) {
      this.cameras.main.shake(120, 0.005);
    }
  }

  private floatText(
    x: number,
    y: number,
    value: string,
    color: string,
    reducedMotion: boolean,
  ): void {
    const text = this.add
      .text(x, y, value, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color,
        stroke: '#0b0912',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    if (reducedMotion) {
      this.time.delayedCall(700, () => text.destroy());
      return;
    }
    this.tweens.add({
      targets: text,
      y: y - 56,
      alpha: 0,
      duration: 700,
      ease: 'quad.out',
      onComplete: () => text.destroy(),
    });
  }
}
