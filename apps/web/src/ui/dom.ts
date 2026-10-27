/**
 * Tiny DOM helpers.
 *
 * Menus are plain HTML (not canvas) so they are keyboard navigable, focusable
 * and readable by assistive technology — required by `docs/05_UI_UX.md`.
 */

export interface ElementProps {
  class?: string;
  id?: string;
  text?: string;
  title?: string;
  type?: string;
  value?: string;
  name?: string;
  disabled?: boolean;
  checked?: boolean;
  hidden?: boolean;
  min?: string;
  max?: string;
  step?: string;
  htmlFor?: string;
  ariaLabel?: string;
  ariaChecked?: 'true' | 'false';
  ariaHidden?: boolean | 'true' | 'false';
  ariaLive?: 'polite' | 'assertive';
  ariaPressed?: 'true' | 'false';
  ariaSelected?: 'true' | 'false';
  ariaCurrent?: 'page';
  role?: string;
  tabIndex?: string;
  data?: Record<string, string>;
  onPress?: () => void;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (props.class) node.className = props.class;
  if (props.id) node.id = props.id;
  if (props.text !== undefined) node.textContent = props.text;
  if (props.title !== undefined) node.title = props.title;
  if (props.role) node.setAttribute('role', props.role);
  if (props.ariaLabel) node.setAttribute('aria-label', props.ariaLabel);
  if (props.ariaHidden !== undefined) {
    node.setAttribute('aria-hidden', String(props.ariaHidden));
  }
  if (props.ariaLive) node.setAttribute('aria-live', props.ariaLive);
  if (props.tabIndex) node.tabIndex = Number(props.tabIndex);
  if (props.hidden) node.hidden = true;
  if (props.data) {
    for (const [key, value] of Object.entries(props.data)) node.dataset[key] = value;
  }

  if (tag === 'button') {
    const button = node as HTMLButtonElement;
    button.type = (props.type as HTMLButtonElement['type']) ?? 'button';
    if (props.disabled) button.disabled = true;
    if (props.ariaPressed) button.setAttribute('aria-pressed', props.ariaPressed);
    if (props.onPress) button.addEventListener('click', props.onPress);
  }

  if (tag === 'input') {
    const input = node as HTMLInputElement;
    input.type = props.type ?? 'text';
    if (props.value !== undefined) input.value = props.value;
    if (props.name) input.name = props.name;
    if (props.disabled) input.disabled = true;
    if (props.checked) input.checked = true;
    if (props.min) input.min = props.min;
    if (props.max) input.max = props.max;
    if (props.step) input.step = props.step;
    if (props.ariaLabel) input.setAttribute('aria-label', props.ariaLabel);
    if (props.onPress) input.addEventListener('input', props.onPress);
  }

  if (tag === 'label' && props.htmlFor) {
    (node as HTMLLabelElement).htmlFor = props.htmlFor;
  }

  if (props.ariaChecked) node.setAttribute('aria-checked', props.ariaChecked);
  if (props.ariaSelected) node.setAttribute('aria-selected', props.ariaSelected);
  if (props.ariaCurrent) node.setAttribute('aria-current', props.ariaCurrent);

  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }

  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Moves focus into a freshly rendered screen: the element marked
 * `data-autofocus`, else the first focusable control, else the screen heading.
 * Focus must follow navigation so keyboard users are never stranded.
 */
export function focusFirst(container: HTMLElement): void {
  const preferred = container.querySelector<HTMLElement>('[data-autofocus]');
  const target =
    preferred ??
    container.querySelector<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]',
    ) ??
    container.querySelector<HTMLElement>('h1, h2');
  target?.focus();
}
