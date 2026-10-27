/**
 * Shared constants used by both the browser client and the authoritative server.
 *
 * Balance values belong in data/config, not scattered constants (see
 * `docs/07_MOVEMENT_COMBAT_AND_ABILITIES.md`). This file only holds protocol
 * and room-lifecycle constants for Phase 0.
 */

/** Maximum number of players supported in a single room for the first release. */
export const MAX_PLAYERS_PER_ROOM = 2;

/** Length of the short, human-readable room invite code. */
export const ROOM_CODE_LENGTH = 5;

/** Default authoritative simulation tick rate in ticks per second. */
export const DEFAULT_TICK_RATE = 30;

/** Idle room expiry: a room with no activity is destroyed after this long. */
export const ROOM_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Grace period after a disconnect before a player slot is released. */
export const RECONNECT_GRACE_MS = 30 * 1000;

/** Default round timer in seconds. Configurable per match later. */
export const DEFAULT_ROUND_SECONDS = 60;

/** Rounds required to win a best-of-three match. */
export const ROUNDS_TO_WIN = 2;
