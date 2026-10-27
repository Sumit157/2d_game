// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_KEY_BINDINGS, PLAYER_TWO_KEY_BINDINGS } from '../settings/settings';
import { createKeyboardInput, type KeyBindings, type KeyboardInput } from './keyboard';

const attached: KeyboardInput[] = [];

function input(bindings: () => KeyBindings): KeyboardInput {
  const instance = createKeyboardInput({ bindings, target: window });
  instance.attach();
  attached.push(instance);
  return instance;
}

function dispatch(type: 'keydown' | 'keyup', code: string): KeyboardEvent {
  const event = new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true });
  window.dispatchEvent(event);
  return event;
}

afterEach(() => {
  for (const instance of attached.splice(0)) instance.detach();
});

describe('keyboard input adapter', () => {
  it('turns held keys into abstract intent for both binding maps', () => {
    const playerOne = input(() => DEFAULT_KEY_BINDINGS);
    const playerTwo = input(() => PLAYER_TWO_KEY_BINDINGS);

    dispatch('keydown', 'KeyD');
    dispatch('keydown', 'ArrowLeft');
    dispatch('keydown', 'KeyJ');

    expect(playerOne.intent()).toMatchObject({
      moveRight: true,
      moveLeft: false,
      jump: false,
      block: false,
      light: true,
      heavy: false,
    });
    // Player two's arrows are independent of the primary bindings.
    expect(playerTwo.intent()).toMatchObject({ moveLeft: true, moveRight: false, light: false });

    dispatch('keyup', 'KeyD');
    dispatch('keyup', 'ArrowLeft');
    dispatch('keyup', 'KeyJ');

    expect(playerOne.intent().moveRight).toBe(false);
    expect(playerOne.intent().light).toBe(false);
    expect(playerTwo.intent().moveLeft).toBe(false);
  });

  it('suppresses browser defaults only for keys bound to that player', () => {
    input(() => DEFAULT_KEY_BINDINGS);

    // Arrows are not bound to player one, so their default (page scroll) stays.
    expect(dispatch('keydown', 'ArrowUp').defaultPrevented).toBe(false);
    expect(dispatch('keydown', 'KeyW').defaultPrevented).toBe(true);
    expect(dispatch('keydown', 'KeyD').defaultPrevented).toBe(true);

    dispatch('keyup', 'KeyW');
    dispatch('keyup', 'KeyD');
    dispatch('keyup', 'ArrowUp');
  });

  it('follows rebinding immediately without reattaching', () => {
    let bindings = { ...DEFAULT_KEY_BINDINGS };
    const player = createKeyboardInput({ bindings: () => bindings, target: window });
    player.attach();
    attached.push(player);

    dispatch('keydown', 'KeyX');
    expect(player.intent().moveRight).toBe(false);

    bindings = { ...DEFAULT_KEY_BINDINGS, moveRight: 'KeyX' };
    expect(player.intent().moveRight).toBe(true);

    dispatch('keyup', 'KeyX');
    expect(player.intent().moveRight).toBe(false);
  });

  it('drops held keys when focus is lost so a fighter never runs forever', () => {
    const player = input(() => DEFAULT_KEY_BINDINGS);

    dispatch('keydown', 'KeyA');
    expect(player.intent().moveLeft).toBe(true);

    window.dispatchEvent(new Event('blur'));
    expect(player.intent().moveLeft).toBe(false);
    expect(player.isHeld()).toBe(false);
  });

  it('detaches cleanly and ignores keys afterwards', () => {
    const player = input(() => DEFAULT_KEY_BINDINGS);
    dispatch('keydown', 'KeyJ');
    expect(player.intent().light).toBe(true);

    player.detach();
    player.detach(); // idempotent
    expect(player.intent().light).toBe(false);

    const event = dispatch('keydown', 'KeyJ');
    expect(event.defaultPrevented).toBe(false);
    expect(player.intent().light).toBe(false);
    dispatch('keyup', 'KeyJ');
  });

  it('reports player two keys through isHeld for UI hints', () => {
    const player = input(() => PLAYER_TWO_KEY_BINDINGS);
    expect(player.isHeld()).toBe(false);
    dispatch('keydown', 'Comma');
    expect(player.isHeld()).toBe(true);
    expect(player.intent().light).toBe(true);
    dispatch('keyup', 'Comma');
    expect(player.isHeld()).toBe(false);
  });
});
