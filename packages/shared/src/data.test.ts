import { describe, expect, it } from 'vitest';

import { CHARACTERS, DEFAULT_CHARACTER_ID, getCharacter } from './roster.js';
import { DEFAULT_STAGE_ID, STAGES, getStage } from './stages.js';
import { CONTENT_FLAGS } from './contentConfig.js';
import { INPUT_ACTIONS, INPUT_ACTION_LABELS, isInputAction } from './input.js';

const MOVE_KINDS = ['light', 'heavy', 'anti-air', 'special', 'defensive', 'ultimate'] as const;

describe('roster data', () => {
  it('ships exactly the four prototype fighters', () => {
    expect(CHARACTERS).toHaveLength(4);
    expect(DEFAULT_CHARACTER_ID).toBe('chai-commander');
  });

  it('has unique, URL-safe ids and non-empty display names', () => {
    const ids = CHARACTERS.map((character) => character.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const character of CHARACTERS) {
      expect(character.id).toMatch(/^[a-z0-9-]+$/);
      expect(character.displayName.trim().length).toBeGreaterThan(0);
      expect(character.archetype.trim().length).toBeGreaterThan(0);
      expect(character.inspirationNote.trim().length).toBeGreaterThan(0);
    }
  });

  it('gives every fighter a complete move preview', () => {
    for (const character of CHARACTERS) {
      const kinds = character.signatureMoves.map((move) => move.kind);
      expect(new Set(kinds).size, `${character.id} has duplicate move kinds`).toBe(
        character.signatureMoves.length,
      );
      for (const kind of MOVE_KINDS) {
        expect(kinds, `${character.id} is missing ${kind}`).toContain(kind);
      }
      for (const move of character.signatureMoves) {
        expect(move.name.trim().length).toBeGreaterThan(0);
        expect(move.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps base stats within the balance band and close in total', () => {
    const totals = CHARACTERS.map((character) => {
      const { health, speed, power, range } = character.stats;
      for (const value of [health, speed, power, range]) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
        expect(Number.isInteger(value)).toBe(true);
      }
      return health + speed + power + range;
    });
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    expect(max - min).toBeLessThanOrEqual(2);
  });

  it('resolves characters by id and rejects unknown ids', () => {
    expect(getCharacter('chai-commander')?.displayName).toBe('Chai Commander');
    expect(getCharacter('nobody')).toBeUndefined();
  });

  it('keeps satire wording clearly fictional', () => {
    for (const character of CHARACTERS) {
      const text = `${character.description} ${character.inspirationNote} ${character.signatureMoves
        .map((move) => move.description)
        .join(' ')}`.toLowerCase();
      // No affirmative claim that a real person committed a crime or that an
      // allegation is established (disclaimers such as "not a proven fact"
      // are exactly what we want to see).
      expect(text).not.toMatch(
        /\bis proven\b|\bare proven\b|\bactually stole\b|\bstole the election\b|\bis guilty\b|\bconvicted\b|\bdefinitely committed\b/,
      );
      expect(text).toMatch(/fictional|cartoon|toy|no real|not a proven|contested|implied|parody/);
    }
  });
});

describe('stage data', () => {
  it('ships both MVP stages with unique ids', () => {
    expect(STAGES.map((stage) => stage.id)).toEqual(['parliament', 'jantar-mantar']);
    expect(DEFAULT_STAGE_ID).toBe('parliament');
    expect(getStage('jantar-mantar')?.name).toBe('Jantar Mantar');
    expect(getStage('missing')).toBeUndefined();
  });

  it('defines a full palette for placeholder rendering', () => {
    for (const stage of STAGES) {
      for (const key of ['sky', 'ground', 'accent', 'prop'] as const) {
        expect(stage.palette[key], `${stage.id}.${key}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
      expect(stage.description.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('input actions', () => {
  it('exposes one label per action', () => {
    for (const action of INPUT_ACTIONS) {
      expect(INPUT_ACTION_LABELS[action]).toBeTruthy();
      expect(isInputAction(action)).toBe(true);
    }
    expect(isInputAction('dropKick')).toBe(false);
    expect(isInputAction(7)).toBe(false);
  });
});

describe('content flags', () => {
  it('keeps inspiration notes configurable in one place', () => {
    expect(typeof CONTENT_FLAGS.showInspirationNotes).toBe('boolean');
  });
});
