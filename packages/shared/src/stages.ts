/**
 * Stage definitions.
 *
 * Stages are version-controlled data, not database records. Backgrounds are
 * drawn from the palette by the renderer; no official insignia or government
 * branding is used (see `docs/05_UI_UX.md`).
 */

export interface StagePalette {
  /** Upper background colour. */
  sky: string;
  /** Floor/ground colour. */
  ground: string;
  /** Primary accent (props, trim). */
  accent: string;
  /** Secondary prop colour. */
  prop: string;
}

export interface StageDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  palette: StagePalette;
}

export const STAGES: readonly StageDefinition[] = [
  {
    id: 'parliament',
    name: 'Parliament',
    tagline: 'A domed debating hall, rendered as pure cartoon stone.',
    description:
      'A stylised, fictionalised assembly chamber: curved benches, a raised podium and a ' +
      'cartoon dome. No official emblem or real interior is reproduced.',
    palette: {
      sky: '#171233',
      ground: '#241d47',
      accent: '#f2a93b',
      prop: '#6d63b5',
    },
  },
  {
    id: 'jantar-mantar',
    name: 'Jantar Mantar',
    tagline: 'Ancient stone instruments under a festival-night sky.',
    description:
      'A fantasy observatory of oversized sundials and stair-stepped ramps, drawn as flat ' +
      'geometric shapes. Original placeholder art, not a depiction of a real monument.',
    palette: {
      sky: '#1d1030',
      ground: '#3a2340',
      accent: '#2fb6a8',
      prop: '#e2694f',
    },
  },
];

export const DEFAULT_STAGE_ID = STAGES[0]?.id ?? 'parliament';

export function getStage(id: string): StageDefinition | undefined {
  return STAGES.find((stage) => stage.id === id);
}
