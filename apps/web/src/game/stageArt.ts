import { DEFAULT_STAGE_ID, PHYSICS, getStage } from '@desi-fighter/shared';
import type Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../config';

/**
 * Stage backdrops, drawn from palette data only.
 *
 * Everything here is original geometric placeholder art: cartoon stone built
 * from primitive shapes, never a real building, emblem or interior (see
 * `docs/05_UI_UX.md`). The floor height comes from the combat physics so the
 * art and the simulation can never disagree about where the ground is.
 */

/** Converts a `#rrggbb` string to Phaser's number colour. */
export function hex(color: string): number {
  return Number.parseInt(color.replace('#', ''), 16);
}

/** Draws sky, floor and props for the stage. */
export function drawStage(scene: Phaser.Scene, stageId: string): void {
  const stage = getStage(stageId) ?? getStage(DEFAULT_STAGE_ID);
  const palette = stage?.palette ?? {
    sky: '#171233',
    ground: '#241d47',
    accent: '#f2a93b',
    prop: '#6d63b5',
  };
  const groundY = PHYSICS.groundY;

  scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, hex(palette.sky));
  scene.add.rectangle(
    GAME_WIDTH / 2,
    groundY + (GAME_HEIGHT - groundY) / 2,
    GAME_WIDTH,
    GAME_HEIGHT - groundY,
    hex(palette.ground),
  );
  scene.add.rectangle(GAME_WIDTH / 2, groundY, GAME_WIDTH, 6, hex(palette.accent));

  if (stage?.id === 'jantar-mantar') drawJantarMantar(scene, palette);
  else drawParliament(scene, palette);

  if (!stage) {
    // Version-controlled data, so this only fires on a broken build.
    scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 36, 'Roster data missing', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#ff8f7a',
      })
      .setOrigin(0.5);
  }
}

function drawParliament(scene: Phaser.Scene, palette: { accent: string; prop: string }): void {
  const accent = hex(palette.accent);
  const prop = hex(palette.prop);
  const domeX = GAME_WIDTH / 2;
  const domeY = PHYSICS.groundY - 140; // base line sits exactly on the floor

  // Cartoon dome + colonnade, deliberately not a real building's likeness.
  scene.add.ellipse(domeX, domeY, 360, 240, prop).setOrigin(0.5, 1);
  scene.add.rectangle(domeX, domeY, 420, 18, prop);
  for (let i = -3; i <= 3; i += 1) {
    scene.add.rectangle(domeX + i * 62, domeY + 70, 26, 120, prop);
  }
  scene.add.rectangle(domeX, domeY + 140, 480, 20, accent);
  scene.add.ellipse(domeX, domeY - 40, 46, 46, accent);
}

function drawJantarMantar(scene: Phaser.Scene, palette: { accent: string; prop: string }): void {
  const accent = hex(palette.accent);
  const prop = hex(palette.prop);
  const baseY = PHYSICS.groundY;

  // Oversized sundial ramp and stepped blocks (geometric fantasy, not a
  // depiction of any real monument).
  scene.add.triangle(GAME_WIDTH / 2, baseY, 0, 0, 260, 0, 0, -300, prop).setOrigin(0, 1);
  scene.add.rectangle(Math.round(GAME_WIDTH * 0.24), baseY - 40, 140, 80, prop);
  scene.add.rectangle(Math.round(GAME_WIDTH * 0.24), baseY - 90, 90, 40, accent);
  scene.add.rectangle(Math.round(GAME_WIDTH * 0.78), baseY - 55, 170, 110, prop);
  scene.add.rectangle(Math.round(GAME_WIDTH * 0.78), baseY - 120, 110, 30, accent);
  scene.add.circle(Math.round(GAME_WIDTH * 0.5), Math.round(GAME_HEIGHT * 0.3), 70, accent, 0.35);
}
