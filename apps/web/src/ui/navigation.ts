/**
 * Screen stack for the menu shell.
 *
 * Pure data structure (no DOM) so navigation can be unit tested: push, back,
 * replace and reset. The router subscribes and re-renders on change.
 */

export type ScreenId =
  | 'main-menu'
  | 'mode-select'
  | 'character-select'
  | 'stage-select'
  | 'settings'
  | 'how-to-play'
  | 'arena';

export interface Navigation {
  current(): ScreenId;
  /** True when there is a previous screen to return to. */
  canGoBack(): boolean;
  push(screen: ScreenId): void;
  back(): boolean;
  /** Clears the stack (used when leaving a match). */
  reset(screen: ScreenId): void;
  subscribe(listener: (screen: ScreenId) => void): () => void;
}

export function createNavigation(initial: ScreenId = 'main-menu'): Navigation {
  const stack: ScreenId[] = [initial];
  const listeners = new Set<(screen: ScreenId) => void>();

  const notify = (): void => {
    const screen = stack[stack.length - 1] as ScreenId;
    for (const listener of listeners) listener(screen);
  };

  return {
    current: () => stack[stack.length - 1] as ScreenId,
    canGoBack: () => stack.length > 1,
    push(screen) {
      if (stack[stack.length - 1] === screen) return;
      stack.push(screen);
      notify();
    },
    back() {
      if (stack.length <= 1) return false;
      stack.pop();
      notify();
      return true;
    },
    reset(screen) {
      stack.length = 0;
      stack.push(screen);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
