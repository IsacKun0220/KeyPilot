import '../../shared/runtime-core.js';
import { STEP_LIMITS, SUPPORTED_PRESS_KEYS } from '../constants.js';
import { state } from '../state.js';
import { getActiveSteps } from './editor-shared.js';

const { isModifierToken } = globalThis.KeyPilotCore;

let recordingFrame = 0;
let recordingCaptureCleanup = null;

function getStepComboKeys(step) {
  return Array.isArray(step?.keys) ? step.keys.filter(Boolean) : [];
}

function getStepPressKeys(step) {
  return [...(Array.isArray(step?.modifiers) ? step.modifiers : []), step?.key].filter(Boolean);
}

function getStepRecordedKeys(step) {
  if (!step) return [];
  if (step.type === 'keyCombo') return getStepComboKeys(step);
  if (step.type === 'keyPress') return getStepPressKeys(step);
  return [];
}

export function resetRecordingState() {
  state.editor.recordingTarget = null;
  state.editor.recordingKeys = [];
  state.editor.recordingPreviewKeys = [];
  state.editor.recordingHeldKeys = {};
  if (typeof recordingCaptureCleanup === 'function') {
    recordingCaptureCleanup();
    recordingCaptureCleanup = null;
  }
}

export function resetComboDraftState() {
  state.editor.comboDraftTarget = null;
  state.editor.comboDraftKeys = [];
}

export function clearRecordingState() {
  resetRecordingState();
  state.editor.validationMessage = '';
}

export function clearComboEditingState() {
  resetComboDraftState();
}

export function clearKeystrokeUiState() {
  clearRecordingState();
  clearComboEditingState();
}

export function setComboDraft(index, keys) {
  state.editor.comboDraftTarget = index;
  state.editor.comboDraftKeys = Array.isArray(keys) ? [...keys].slice(0, STEP_LIMITS.comboMaxKeys) : [];
}

export function ensureComboDraft(index) {
  const step = getActiveSteps()[index];
  if (!step || !['keyCombo', 'keyPress'].includes(step.type)) return [];
  if (state.editor.comboDraftTarget !== index) {
    setComboDraft(index, getStepRecordedKeys(step));
  }
  return state.editor.comboDraftKeys;
}

export function getOrderedModifierTokens(modifiers = []) {
  const modifierOrder = ['Command', 'Win', 'Control', 'Ctrl', 'Option', 'Alt', 'Shift'];
  return [...new Set((Array.isArray(modifiers) ? modifiers : []).filter((token) => isModifierToken(token)))]
    .sort((left, right) => modifierOrder.indexOf(left) - modifierOrder.indexOf(right));
}

export function commitComboDraft(index) {
  const step = getActiveSteps()[index];
  if (!step || !['keyCombo', 'keyPress'].includes(step.type)) return false;
  const nextKeys = state.editor.comboDraftTarget === index
    ? [...state.editor.comboDraftKeys]
    : getStepRecordedKeys(step);

  if (step.type === 'keyCombo') {
    const primaryCount = nextKeys.filter((token) => !isModifierToken(token)).length;
    if (primaryCount !== 1) {
      state.editor.validationMessage = primaryCount === 0
        ? 'Shortcut needs one non-modifier key.'
        : 'Shortcut can only use one non-modifier key.';
      return false;
    }
    step.keys = nextKeys;
    resetComboDraftState();
    state.editor.validationMessage = nextKeys.length ? 'Shortcut saved.' : 'Shortcut cleared.';
    return true;
  }

  const primaryKeys = nextKeys.filter((token) => !isModifierToken(token));
  if (primaryKeys.length !== 1) {
    state.editor.validationMessage = primaryKeys.length === 0
      ? 'Press key needs one key plus optional modifiers.'
      : 'Press key can only use one key plus optional modifiers.';
    return false;
  }
  if (!SUPPORTED_PRESS_KEYS.includes(primaryKeys[0])) {
    state.editor.validationMessage = 'Press key recording works with Enter, Tab, Escape, arrows, function keys, and other supported navigation keys.';
    return false;
  }
  step.key = primaryKeys[0];
  step.modifiers = getOrderedModifierTokens(nextKeys.filter((token) => isModifierToken(token)));
  resetComboDraftState();
  state.editor.validationMessage = 'Key press saved.';
  return true;
}

export function resetCombo(index) {
  const step = getActiveSteps()[index];
  if (!step || !['keyCombo', 'keyPress'].includes(step.type)) return false;
  if (step.type === 'keyCombo') {
    step.keys = [];
  } else {
    step.key = '';
    step.modifiers = [];
  }
  if (state.editor.comboDraftTarget === index) {
    resetComboDraftState();
  }
  if (state.editor.recordingTarget === index) {
    resetRecordingState();
  }
  state.editor.validationMessage = step.type === 'keyCombo' ? 'Shortcut cleared.' : 'Key press cleared.';
  return true;
}

export function startShortcutRecording(index) {
  const step = getActiveSteps()[index];
  if (!step || !['keyCombo', 'keyPress'].includes(step.type)) return false;
  state.editor.recordingTarget = index;
  state.editor.recordingKeys = [];
  state.editor.recordingPreviewKeys = [];
  setComboDraft(index, getStepRecordedKeys(step));
  state.editor.validationMessage = 'Press the keys you want, then stop.';
  return true;
}

export function stopShortcutRecording(renderEditorOnly, { preserveMessage = false } = {}) {
  const activeTarget = state.editor.recordingTarget;
  const committed = activeTarget !== null ? commitComboDraft(activeTarget) : false;
  if (!preserveMessage && !committed) {
    state.editor.validationMessage = '';
  }
  resetRecordingState();
  renderEditorOnly();
}

export function enableRecordingCapture(els) {
  if (typeof recordingCaptureCleanup === 'function') {
    recordingCaptureCleanup();
    recordingCaptureCleanup = null;
  }

  const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const target = els?.editorBody || els?.editorSheet || document.body;

  if (target instanceof HTMLElement) {
    if (!target.hasAttribute('tabindex')) {
      target.dataset.recordingTabindexAdded = 'true';
      target.tabIndex = -1;
    }
    target.focus({ preventScroll: true });
  }

  let released = false;
  const unlockKeyboard = async () => {
    if (!navigator.keyboard?.unlock) return;
    try {
      navigator.keyboard.unlock();
    } catch (_) {}
  };

  const lockKeyboard = async () => {
    if (!navigator.keyboard?.lock) return;
    try {
      await navigator.keyboard.lock();
    } catch (_) {}
  };

  lockKeyboard().catch(() => {});

  recordingCaptureCleanup = () => {
    if (released) return;
    released = true;
    unlockKeyboard().catch(() => {});
    if (target instanceof HTMLElement && target.dataset.recordingTabindexAdded === 'true') {
      target.removeAttribute('tabindex');
      delete target.dataset.recordingTabindexAdded;
    }
    if (previousActive && previousActive.isConnected) {
      previousActive.focus({ preventScroll: true });
    }
  };
}

function normaliseModifierToken(key, platform) {
  if (key === 'Meta') {
    return platform === 'mac' ? 'Command' : 'Win';
  }
  if (key === 'Alt') {
    return platform === 'mac' ? 'Option' : 'Alt';
  }
  if (key === 'Control') {
    return platform === 'mac' ? 'Control' : 'Ctrl';
  }
  if (key === 'Shift') {
    return 'Shift';
  }
  return '';
}

function getHeldComboKeys() {
  const entries = Object.values(state.editor.recordingHeldKeys || {});
  const modifierOrder = ['Command', 'Win', 'Control', 'Ctrl', 'Option', 'Alt', 'Shift'];
  const modifiers = [];
  const regularKeys = [];

  entries.forEach((token) => {
    if (isModifierToken(token)) {
      modifiers.push(token);
    } else {
      regularKeys.push(token);
    }
  });

  modifiers.sort((left, right) => modifierOrder.indexOf(left) - modifierOrder.indexOf(right));
  return [...modifiers, ...regularKeys].slice(0, STEP_LIMITS.comboMaxKeys);
}

function normaliseKeyboardToken(event, platform) {
  const modifierToken = normaliseModifierToken(event.key, platform);
  if (modifierToken) {
    return modifierToken;
  }

  const code = String(event.code || '');
  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3);
  }
  if (/^Digit[0-9]$/.test(code)) {
    return code.slice(5);
  }
  if (/^Numpad[0-9]$/.test(code)) {
    return code.replace('Numpad', 'Num');
  }
  if (/^F([1-9]|1[0-2])$/.test(event.key)) {
    return event.key.toUpperCase();
  }

  const codeMap = {
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    NumpadDecimal: 'Num.',
    NumpadAdd: 'Num+',
    NumpadSubtract: 'Num-',
    NumpadMultiply: 'Num*',
    NumpadDivide: 'Num/',
    NumpadEnter: 'Enter'
  };
  if (codeMap[code]) {
    return codeMap[code];
  }

  const keyMap = {
    ' ': 'Space',
    Spacebar: 'Space',
    Escape: 'Escape',
    Esc: 'Escape',
    Enter: 'Enter',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    CapsLock: 'CapsLock',
    PrintScreen: 'PrintScreen'
  };

  const rawKey = String(event.key || '');
  if (keyMap[rawKey]) {
    return keyMap[rawKey];
  }
  if (rawKey.length === 1) {
    return rawKey.toUpperCase();
  }
  return rawKey;
}

function swallowRecordingShortcutEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === 'function') {
    event.stopImmediatePropagation();
  }
}

function scheduleRecordingRender(renderEditorOnly) {
  if (recordingFrame) {
    return;
  }
  recordingFrame = window.requestAnimationFrame(() => {
    recordingFrame = 0;
    renderEditorOnly();
  });
}

export function createRecordingHandlers(renderEditorOnly) {
  const handleRecordingKeydown = (event) => {
    if (!state.editor.open || state.editor.recordingTarget === null) return;
    const step = getActiveSteps()[state.editor.recordingTarget];
    if (!step || !['keyCombo', 'keyPress'].includes(step.type)) return;
    swallowRecordingShortcutEvent(event);
    if (event.repeat) return;

    const token = normaliseKeyboardToken(event, state.editor.selectedPlatform);
    const heldKeys = state.editor.recordingHeldKeys || {};
    const alreadyHeld = Object.values(heldKeys).includes(token);
    const heldCount = Object.keys(heldKeys).length;
    if (!alreadyHeld && heldCount < STEP_LIMITS.comboMaxKeys) {
      heldKeys[event.code || token] = token;
    }

    const keys = getHeldComboKeys();
    state.editor.recordingKeys = keys;
    if (keys.length) {
      state.editor.recordingPreviewKeys = keys;
      setComboDraft(state.editor.recordingTarget, keys);
      if (keys.length === STEP_LIMITS.comboMaxKeys) {
        state.editor.validationMessage = `You can use up to ${STEP_LIMITS.comboMaxKeys} keys together.`;
      } else {
        state.editor.validationMessage = 'Press the keys you want, then stop.';
      }
    }
    scheduleRecordingRender(renderEditorOnly);
  };

  const handleRecordingKeyup = (event) => {
    if (!state.editor.open || state.editor.recordingTarget === null) return;
    const step = getActiveSteps()[state.editor.recordingTarget];
    if (!step || !['keyCombo', 'keyPress'].includes(step.type)) return;
    swallowRecordingShortcutEvent(event);
    const releaseKey = event.code || normaliseKeyboardToken(event, state.editor.selectedPlatform);
    delete state.editor.recordingHeldKeys[releaseKey];
    const keys = getHeldComboKeys();
    state.editor.recordingKeys = keys;
    state.editor.recordingPreviewKeys = keys;
    scheduleRecordingRender(renderEditorOnly);
  };

  const handleWindowBlur = () => {
    if (!state.editor.open || state.editor.recordingTarget === null) return;
    stopShortcutRecording(renderEditorOnly, { preserveMessage: true });
    state.editor.validationMessage = 'Recording stopped because this window was no longer active.';
    renderEditorOnly();
  };

  return {
    handleRecordingKeydown,
    handleRecordingKeyup,
    handleWindowBlur
  };
}
