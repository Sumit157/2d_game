import { describe, expect, it } from 'vitest';

import { ROOM_CODE_LENGTH } from './constants.js';
import { isValidRoomCode, normaliseRoomCode, ROOM_CODE_ALPHABET } from './roomCode.js';

describe('roomCode', () => {
  it('accepts a well-formed code', () => {
    expect(isValidRoomCode('ABCD2')).toBe(true);
    expect(ROOM_CODE_LENGTH).toBe(5);
  });

  it('normalises lower-case and padded input', () => {
    expect(normaliseRoomCode('  abcd2 ')).toBe('ABCD2');
    expect(isValidRoomCode('  abcd2 ')).toBe(true);
  });

  it('rejects wrong lengths', () => {
    expect(isValidRoomCode('ABC')).toBe(false);
    expect(isValidRoomCode('ABCDEFG')).toBe(false);
    expect(isValidRoomCode('')).toBe(false);
  });

  it('rejects ambiguous or out-of-alphabet characters', () => {
    expect(isValidRoomCode('ABCD1')).toBe(false); // 1 is excluded (I/1 confusion)
    expect(isValidRoomCode('ABCD0')).toBe(false); // 0 is excluded (O/0 confusion)
    expect(isValidRoomCode('ABCD@')).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidRoomCode(null)).toBe(false);
    expect(isValidRoomCode(undefined)).toBe(false);
    expect(isValidRoomCode(42424)).toBe(false);
  });

  it('never contains ambiguous characters in its alphabet', () => {
    expect(ROOM_CODE_ALPHABET).not.toContain('I');
    expect(ROOM_CODE_ALPHABET).not.toContain('O');
    expect(ROOM_CODE_ALPHABET).not.toContain('1');
    expect(ROOM_CODE_ALPHABET).not.toContain('0');
  });

  it('has a duplicate-free alphabet large enough for short invite codes', () => {
    // 32 symbols -> 32^5 ~= 33.5M possible codes, plenty for private invites.
    expect(new Set(ROOM_CODE_ALPHABET).size).toBe(ROOM_CODE_ALPHABET.length);
    expect(ROOM_CODE_ALPHABET.length).toBeGreaterThanOrEqual(30);
  });
});
