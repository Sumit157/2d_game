import { ROOM_CODE_LENGTH } from './constants.js';

/**
 * Characters that are easy to read aloud over voice or chat and that avoid
 * the usual confusions (0/O and 1/I), so a player never mistypes an invite.
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Normalises user-typed input: trims whitespace and upper-cases. */
export function normaliseRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Type guard for a syntactically valid room code.
 *
 * This validates *shape only*. Room codes are private invites, not
 * authentication: existence and occupancy checks stay server-side.
 */
export function isValidRoomCode(code: unknown): code is string {
  if (typeof code !== 'string') {
    return false;
  }
  const normalised = normaliseRoomCode(code);
  if (normalised.length !== ROOM_CODE_LENGTH) {
    return false;
  }
  return [...normalised].every((character) => ROOM_CODE_ALPHABET.includes(character));
}
