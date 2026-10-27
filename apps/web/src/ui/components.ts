import { INPUT_ACTION_LABELS, type InputAction, type MoveKind } from '@desi-fighter/shared';

import { el } from './dom';

/** Page heading: focusable so screen readers and keyboard users land here. */
export function pageTitle(text: string, subtitle?: string): HTMLElement {
  const children: (Node | string)[] = [];
  const heading = el('h1', {
    class: 'screen__title',
    text,
    tabIndex: '-1',
    data: { autofocus: '1' },
  });
  children.push(heading);
  if (subtitle) children.push(el('p', { class: 'screen__subtitle', text: subtitle }));
  return el('header', { class: 'screen__header' }, children);
}

export function backButton(onBack: () => void, label = 'Back'): HTMLButtonElement {
  return el('button', { class: 'btn btn--ghost', text: label, onPress: onBack });
}

/** Visible, announced status line (aria-live) for messages such as Phase notices. */
export function liveStatus(text = ''): HTMLElement {
  return el('p', { class: 'status', role: 'status', ariaLive: 'polite', text });
}

export function setStatus(node: HTMLElement, message: string): void {
  node.textContent = message;
}

export const MOVE_KIND_LABELS: Record<MoveKind, string> = {
  light: 'Light',
  heavy: 'Heavy',
  'anti-air': 'Anti-air',
  special: 'Special',
  defensive: 'Defensive',
  ultimate: 'Ultimate',
};

export function actionLabel(action: InputAction): string {
  return INPUT_ACTION_LABELS[action];
}

/** Stat row: label + bar + explicit numeric value (never colour alone). */
export function statRow(label: string, value: number, max = 5): HTMLElement {
  const percent = Math.round((value / max) * 100);
  const fill = el('span', { class: 'stat__fill' });
  fill.style.width = `${percent}%`;
  return el('div', { class: 'stat' }, [
    el('span', { class: 'stat__label', text: label }),
    el('span', { class: 'stat__track' }, [fill]),
    el('span', { class: 'stat__value', text: `${value}/${max}` }),
  ]);
}

/** Fictional-satire disclaimer shown wherever moves are presented. */
export function satireNote(): HTMLElement {
  return el('p', {
    class: 'disclaimer',
    text:
      'All fighters, moves and stages are original fictional satire for gameplay. ' +
      'Nothing here depicts real events or asserts that any allegation is proven.',
  });
}
