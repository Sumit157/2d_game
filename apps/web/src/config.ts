/** Logical canvas size. Desktop-first 16:9, scaled responsively by Phaser. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** 16:9 aspect ratio used by the responsive layout. */
export const ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT;

/** Build version, injected from `.env` / `VITE_APP_VERSION`. */
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? '0.1.0';
