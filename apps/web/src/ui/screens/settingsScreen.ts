import { INPUT_ACTIONS, type InputAction } from '@desi-fighter/shared';

import { DEFAULT_KEY_BINDINGS, formatKeyCode, type SettingsPatch } from '../../settings/settings';
import { el } from '../dom';
import { actionLabel, backButton, liveStatus, pageTitle, setStatus } from '../components';
import type { ScreenContext, ScreenInstance } from '../app';

type VolumeKey = 'masterVolume' | 'musicVolume' | 'sfxVolume';
type ToggleKey = 'reducedMotion' | 'screenShake';

const VOLUME_LABELS: Record<VolumeKey, string> = {
  masterVolume: 'Master volume',
  musicVolume: 'Music',
  sfxVolume: 'Sound effects',
};

const TOGGLES: { key: ToggleKey; label: string; hint: string }[] = [
  {
    key: 'reducedMotion',
    label: 'Reduced motion',
    hint: 'Turns off screen shake and non-essential animation.',
  },
  {
    key: 'screenShake',
    label: 'Screen shake',
    hint: 'Camera punch on heavy hits. Independent of reduced motion.',
  },
];

/**
 * Settings: sound, accessibility and remappable key bindings.
 *
 * Preferences are device-only (localStorage with a safe fallback) and never
 * leave the browser. While a binding is being captured, the capture listener
 * runs in the capture phase so Escape does not also navigate backwards.
 */
export function settingsScreen(ctx: ScreenContext): ScreenInstance {
  const root = el('section', { class: 'screen', ariaLabel: 'Settings' });
  const status = liveStatus();
  const store = ctx.settings;

  // --- Sound -------------------------------------------------------------
  const sound = el('div', { class: 'panel' }, [
    el('h2', { class: 'section-label', text: 'Sound' }),
  ]);
  const volumeKeys = Object.keys(VOLUME_LABELS) as VolumeKey[];
  const sliderOutputs = new Map<VolumeKey, HTMLElement>();

  for (const key of volumeKeys) {
    const label = VOLUME_LABELS[key];
    const id = `setting-${key}`;
    const initial = Math.round(store.get()[key] * 100);
    const output = el('output', { class: 'slider__value', text: `${initial}%` });
    sliderOutputs.set(key, output);
    const input = el('input', {
      id,
      class: 'slider__input',
      type: 'range',
      min: '0',
      max: '100',
      step: '5',
      value: String(initial),
      ariaLabel: label,
    });
    input.addEventListener('input', () => {
      const percent = Number(input.value);
      store.update({ [key]: percent / 100 } as SettingsPatch);
      output.textContent = `${percent}%`;
    });
    sound.append(
      el('div', { class: 'slider' }, [
        el('div', { class: 'slider__head' }, [
          el('label', { class: 'slider__label', htmlFor: id, text: label }),
          output,
        ]),
        input,
      ]),
    );
  }

  // --- Accessibility -----------------------------------------------------
  const accessibility = el('div', { class: 'panel' }, [
    el('h2', { class: 'section-label', text: 'Accessibility' }),
  ]);
  for (const toggle of TOGGLES) {
    const id = `setting-${toggle.key}`;
    const input = el('input', { id, type: 'checkbox', checked: store.get()[toggle.key] });
    input.addEventListener('change', () => {
      store.update({ [toggle.key]: input.checked } as SettingsPatch);
      setStatus(status, `${toggle.label} ${input.checked ? 'on' : 'off'}.`);
    });
    accessibility.append(
      el('div', { class: 'toggle-row' }, [
        el('div', { class: 'toggle-row__text' }, [
          el('label', { class: 'toggle-row__label', htmlFor: id, text: toggle.label }),
          el('p', { class: 'toggle-row__hint', text: toggle.hint }),
        ]),
        input,
      ]),
    );
  }

  // --- Key bindings ------------------------------------------------------
  const controls = el('div', { class: 'panel' }, [
    el('h2', { class: 'section-label', text: 'Controls' }),
    el('p', {
      class: 'panel__hint',
      text: 'Choose a binding, then press any key. Escape cancels while capturing.',
    }),
  ]);

  const bindingList = el('ul', { class: 'bindings' });
  const keyLabels = new Map<InputAction, HTMLElement>();

  type Capture = { action: InputAction; button: HTMLButtonElement };
  let capture: Capture | null = null;

  const stopCapture = (message: string): void => {
    if (capture) {
      window.removeEventListener('keydown', onCaptureKeydown, true);
      capture.button.textContent = 'Change';
      capture = null;
    }
    if (message) setStatus(status, message);
  };

  function onCaptureKeydown(event: KeyboardEvent): void {
    if (!capture) return;
    // Capture phase: stop Escape (and everything else) from reaching the
    // global back-navigation handler while a binding is being chosen.
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      stopCapture('Binding unchanged.');
      return;
    }

    const code = event.code;
    if (!code) {
      setStatus(status, 'That key cannot be bound. Try a different key.');
      return;
    }

    const action = capture.action;
    const clash = INPUT_ACTIONS.find(
      (other) => other !== action && store.get().keyBindings[other] === code,
    );
    if (clash) {
      setStatus(
        status,
        `${formatKeyCode(code)} is already bound to ${actionLabel(clash)}. Pick another key.`,
      );
      return;
    }

    store.update({ keyBindings: { [action]: code } } as SettingsPatch);
    const keyLabel = keyLabels.get(action);
    if (keyLabel) keyLabel.textContent = formatKeyCode(code);
    stopCapture(`${actionLabel(action)} is now ${formatKeyCode(code)}.`);
  }

  for (const action of INPUT_ACTIONS) {
    const keyLabel = el('kbd', {
      class: 'binding__key',
      text: formatKeyCode(store.get().keyBindings[action]),
    });
    keyLabels.set(action, keyLabel);

    const button = el('button', { class: 'btn btn--small', text: 'Change' });
    button.addEventListener('click', () => {
      if (capture?.action === action) {
        stopCapture('Binding unchanged.');
        return;
      }
      stopCapture('');
      capture = { action, button };
      button.textContent = 'Press a key…';
      window.addEventListener('keydown', onCaptureKeydown, true);
      setStatus(status, `Press a key for ${actionLabel(action).toLowerCase()}. Escape cancels.`);
      button.focus();
    });

    bindingList.append(
      el('li', { class: 'binding' }, [
        el('span', { class: 'binding__action', text: actionLabel(action) }),
        keyLabel,
        button,
      ]),
    );
  }

  const resetButton = el('button', {
    class: 'btn btn--ghost',
    text: 'Reset to defaults',
    onPress: () => {
      stopCapture('');
      store.update({ keyBindings: { ...DEFAULT_KEY_BINDINGS } } as SettingsPatch);
      for (const action of INPUT_ACTIONS) {
        const keyLabel = keyLabels.get(action);
        if (keyLabel) keyLabel.textContent = formatKeyCode(DEFAULT_KEY_BINDINGS[action]);
      }
      setStatus(status, 'Controls reset to defaults.');
    },
  });

  controls.append(bindingList, el('div', { class: 'panel__actions' }, [resetButton]));

  root.append(
    pageTitle('Settings', 'Stored on this device only. Nothing is uploaded.'),
    status,
    sound,
    accessibility,
    controls,
    el('div', { class: 'screen__footer' }, [
      backButton(() => {
        stopCapture('');
        ctx.back();
      }),
    ]),
  );

  // Keep outputs in sync if settings change elsewhere (e.g. reset).
  const unsubscribe = store.subscribe((settings) => {
    for (const key of volumeKeys) {
      const output = sliderOutputs.get(key);
      if (output) output.textContent = `${Math.round(settings[key] * 100)}%`;
    }
  });

  return {
    root,
    destroy: () => {
      unsubscribe();
      stopCapture('');
    },
  };
}
