import { describe, expect, it } from 'vitest';

import { APP_VERSION, ASPECT_RATIO, GAME_HEIGHT, GAME_WIDTH } from './config';

describe('game config', () => {
  it('uses a 16:9 logical canvas', () => {
    expect(GAME_WIDTH).toBe(1280);
    expect(GAME_HEIGHT).toBe(720);
    expect(ASPECT_RATIO).toBeCloseTo(16 / 9, 5);
  });

  it('always exposes a non-empty version string', () => {
    expect(APP_VERSION).toMatch(/\S/);
  });
});
