/**
 * Data-driven character roster.
 *
 * Every entry is fictional satire for gameplay: display names are invented,
 * moves are cartoonish, and nothing here asserts that a real event happened or
 * that any allegation is proven (see `docs/06_CHARACTER_DESIGN.md`).
 *
 * Adding a fighter means adding data here — never bespoke engine code.
 */

export type MoveKind = 'light' | 'heavy' | 'anti-air' | 'special' | 'defensive' | 'ultimate';

export interface SignatureMove {
  name: string;
  /** One line, written as fictional gameplay rather than a factual claim. */
  description: string;
  kind: MoveKind;
}

/** Relative base stats, 1 (low) to 5 (high). Totals stay close across the roster. */
export interface CharacterStats {
  health: number;
  speed: number;
  power: number;
  range: number;
}

export interface CharacterPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export interface CharacterDefinition {
  id: string;
  displayName: string;
  tagline: string;
  /** Combat archetype shown on the select screen. */
  archetype: string;
  description: string;
  palette: CharacterPalette;
  stats: CharacterStats;
  /** Ordered light/heavy/anti-air/special/defensive/ultimate preview. */
  signatureMoves: SignatureMove[];
  /** One-sentence, clearly-labelled parody inspiration note. */
  inspirationNote: string;
}

export const CHARACTERS: readonly CharacterDefinition[] = [
  {
    id: 'chai-commander',
    displayName: 'Chai Commander',
    tagline: 'Balanced all-rounder with a steaming mid-range game.',
    archetype: 'Balanced · mid-range',
    description:
      'A cartoon strongman of the tea stall: throws cups, swings kettles and ends every ' +
      'round with a speech. Predictable projectile recovery keeps him honest.',
    palette: { primary: '#c96f2f', secondary: '#3d2b1f', accent: '#f7d488' },
    stats: { health: 4, speed: 3, power: 3, range: 4 },
    signatureMoves: [
      { kind: 'light', name: 'Saucer Flick', description: 'Quick jab with a flying saucer.' },
      { kind: 'heavy', name: 'Kettle Swing', description: 'Slow two-handed kettle swing.' },
      { kind: 'anti-air', name: 'Steam Vent', description: 'Upward burst of boiling steam.' },
      {
        kind: 'special',
        name: 'Cutting Chai',
        description: 'Tosses a steaming cup-shaped energy projectile. Purely cartoonish.',
      },
      {
        kind: 'defensive',
        name: 'Tea Break',
        description: 'Brief guarded stance with reduced meter gain.',
      },
      {
        kind: 'ultimate',
        name: 'Mann Ki Mic Drop',
        description: 'Speech-wave pushback from a giant animated microphone.',
      },
    ],
    inspirationNote:
      'Fictional parody of public chai-and-speech political branding; no real speech is quoted.',
  },
  {
    id: 'vote-count-vanguard',
    displayName: 'Vote-Count Vanguard',
    tagline: 'Fast rushdown with feints, parries and short reach.',
    archetype: 'Rushdown · feints',
    description:
      'A fleet-footed campaigner who fights with paper ballots and crowd energy. The ' +
      'underlying vote-counting rhetoric is contested political debate, not a proven fact.',
    palette: { primary: '#2f7fd8', secondary: '#16233c', accent: '#f2e9d8' },
    stats: { health: 3, speed: 5, power: 3, range: 2 },
    signatureMoves: [
      { kind: 'light', name: 'Flyer Flick', description: 'Fast jab with a folded flyer.' },
      {
        kind: 'heavy',
        name: 'Manifesto Slam',
        description: 'Heavy overhead with a bundle of posters.',
      },
      {
        kind: 'anti-air',
        name: 'Banner Sweep',
        description: 'Wide rising swing of a rolled banner.',
      },
      {
        kind: 'special',
        name: 'Ballot Blitz',
        description: 'A fan of paper ballots creates a short-range multi-hit effect.',
      },
      {
        kind: 'defensive',
        name: 'Count It Again',
        description: 'Briefly parries one hit if timed correctly; punished when mistimed.',
      },
      {
        kind: 'ultimate',
        name: "People's Mandate",
        description: 'A crowd-shaped visual wave. No real election result is implied.',
      },
    ],
    inspirationNote:
      'Fictional parody of ballot-counting debate rhetoric; any underlying claims are ' +
      'contested allegations, not established facts.',
  },
  {
    id: 'bulldozer-baba',
    displayName: 'Bulldozer Baba',
    tagline: 'Slow, armoured bruiser who owns the middle of the stage.',
    archetype: 'Armour · bruiser',
    description:
      'A toy-like construction titan in saffron-tinted hardhat caricature: heavy armour, ' +
      'telegraphed lanes and an easy sidestep window.',
    palette: { primary: '#e2a93b', secondary: '#2b2413', accent: '#f7f1e3' },
    stats: { health: 5, speed: 2, power: 4, range: 3 },
    signatureMoves: [
      { kind: 'light', name: 'Hard Hat Jab', description: 'Short armoured jab.' },
      { kind: 'heavy', name: 'Wrecking Hook', description: 'Slow hook with huge damage.' },
      { kind: 'anti-air', name: 'Bucket Scoop', description: 'Rising scoop of the front bucket.' },
      {
        kind: 'special',
        name: 'JCB Entrance',
        description: 'A cartoon mini-bulldozer pushes forward in a telegraphed lane.',
      },
      {
        kind: 'defensive',
        name: 'Heavy Barricade',
        description: 'Temporary armour with slowed movement.',
      },
      {
        kind: 'ultimate',
        name: 'Road-Roller Rumble',
        description: 'An oversized toy construction machine sweeps the stage. Strictly fantasy.',
      },
    ],
    inspirationNote:
      'Fictional parody of widely reported bulldozer political imagery; the machines are toys.',
  },
  {
    id: 'tax-calculator',
    displayName: 'Tax Calculator',
    tagline: 'Zoner who taxes your approach with traps and receipts.',
    archetype: 'Trap · zone control',
    description:
      'A budget-day bureaucrat of comedy: calculator tiles, receipt storms and shields ' +
      'bought with meter. Weak in close range, deadly at distance.',
    palette: { primary: '#3fae9b', secondary: '#122b2a', accent: '#f6d365' },
    stats: { health: 3, speed: 3, power: 3, range: 5 },
    signatureMoves: [
      { kind: 'light', name: 'Pen Tap', description: 'Quick poke with a steel ruler.' },
      { kind: 'heavy', name: 'Ledger Slam', description: 'Heavy slam of a giant ledger.' },
      { kind: 'anti-air', name: 'Receipt Fan', description: 'Fan of receipts deflects jumpers.' },
      {
        kind: 'special',
        name: 'Cess Cascade',
        description: 'Floating calculator tiles briefly limit opponent movement.',
      },
      {
        kind: 'defensive',
        name: 'Budget Buffer',
        description: 'Converts a small amount of meter into a short shield.',
      },
      {
        kind: 'ultimate',
        name: 'Audit Avalanche',
        description: 'A storm of oversized receipts and spreadsheets.',
      },
    ],
    inspirationNote:
      'Fictional parody of budget and taxation discourse; no personal wrongdoing is implied.',
  },
];

export const DEFAULT_CHARACTER_ID = CHARACTERS[0]?.id ?? 'chai-commander';

export function getCharacter(id: string): CharacterDefinition | undefined {
  return CHARACTERS.find((character) => character.id === id);
}
