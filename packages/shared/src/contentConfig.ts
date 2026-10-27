/**
 * Content flags.
 *
 * Keeps satire-adjacent presentation choices in one configurable place so a
 * reviewer or a future build can disable inspiration notes without touching
 * engine code (see `docs/09_ACCEPTANCE_CRITERIA.md`, guest-character content
 * must be easy to disable through configuration).
 */
export const CONTENT_FLAGS = {
  /**
   * Show the clearly-labelled "inspiration note" line on character select.
   * Display names are always fictionalised; these notes only explain the
   * public-persona parody in one sentence.
   */
  showInspirationNotes: true,
} as const;

export type ContentFlags = typeof CONTENT_FLAGS;
