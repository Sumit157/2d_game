import { describe, expect, it, vi } from 'vitest';

import { createNavigation } from './navigation';

describe('createNavigation', () => {
  it('starts on the main menu with nothing to go back to', () => {
    const nav = createNavigation();
    expect(nav.current()).toBe('main-menu');
    expect(nav.canGoBack()).toBe(false);
    expect(nav.back()).toBe(false);
  });

  it('pushes and pops screens', () => {
    const nav = createNavigation();
    nav.push('character-select');
    nav.push('stage-select');
    expect(nav.current()).toBe('stage-select');
    expect(nav.canGoBack()).toBe(true);
    expect(nav.back()).toBe(true);
    expect(nav.current()).toBe('character-select');
    expect(nav.back()).toBe(true);
    expect(nav.current()).toBe('main-menu');
    expect(nav.back()).toBe(false);
  });

  it('ignores a push of the screen already on top (no self-loop)', () => {
    const nav = createNavigation();
    const listener = vi.fn();
    nav.subscribe(listener);
    nav.push('main-menu');
    expect(nav.current()).toBe('main-menu');
    expect(listener).not.toHaveBeenCalled();
  });

  it('clears the stack on reset so back cannot re-enter a finished match', () => {
    const nav = createNavigation();
    nav.push('character-select');
    nav.push('stage-select');
    nav.push('arena');
    nav.reset('main-menu');
    expect(nav.current()).toBe('main-menu');
    expect(nav.canGoBack()).toBe(false);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const nav = createNavigation();
    const seen: string[] = [];
    const unsubscribe = nav.subscribe((screen) => seen.push(screen));
    nav.push('settings');
    unsubscribe();
    nav.push('how-to-play');
    expect(seen).toEqual(['settings']);
  });
});
