import { createStep } from '../../shared/action-schema.js';
import { DEFAULT_ICON_ID } from '../../shared/icons/index.js';
import dragula from '../dragula.js';
import { APP_IDS, PLATFORM_IDS, STEP_LIMITS } from '../constants.js';
import { state } from '../state.js';
import { ensureAppPlatformMapping } from '../schema.js';
import { createDefaultMappings, cloneMapping, applySequencePreset } from '../services/mapping.js';
import { validateButton } from '../services/validation.js';
import { normaliseButton } from '../services/normalise.js';
import { getSuggestedIcons } from '../render/icon-suggestions.js';
import { deepClone } from '../utils/clone.js';
import { createId } from '../utils/ids.js';

let editorBound = false;
let blockEditorDrake = null;
let labelInputTimer = null;
let iconSearchTimer = null;
let recordingFrame = 0;
let recordingCaptureCleanup = null;

function currentSet() {
  return state.config.apps[state.activeApp].sets[state.activeSetIndex];
}

function getActiveSteps() {
  return ensureAppPlatformMapping(state.editor.draft, state.editor.selectedApp, state.editor.selectedPlatform).steps;
}

function rerender(renderEditorOnly) {
  state.editor.validationMessage = '';
  renderEditorOnly();
}

function rerenderPreservingSelection(renderEditorOnly, element) {
  const selector = element?.id ? `#${element.id}` : null;
  const start = typeof element?.selectionStart === 'number' ? element.selectionStart : null;
  const end = typeof element?.selectionEnd === 'number' ? element.selectionEnd : null;
  rerender(renderEditorOnly);
  if (!selector) return;
  const next = document.querySelector(selector);
  if (!next) return;
  next.focus();
  if (start !== null && end !== null && typeof next.setSelectionRange === 'function') {
    next.setSelectionRange(start, end);
  }
}

function syncScopeMappings() {
  const draft = state.editor.draft;
  const nextMappings = createDefaultMappings(draft.scope.apps, draft.scope.platforms, draft.actionType);
  draft.scope.apps.forEach((appId) => {
    draft.scope.platforms.forEach((platform) => {
      if (draft.mappings?.[appId]?.[platform]) {
        nextMappings[appId][platform] = draft.mappings[appId][platform];
      }
    });
  });
  draft.mappings = nextMappings;
  state.editor.selectedApp = draft.scope.apps[0] || APP_IDS[0];
  state.editor.selectedPlatform = draft.scope.platforms[0] || PLATFORM_IDS[0];
}

function advanceEditorStep(renderEditorOnly) {
  if (state.editor.currentStep === 1) {
    clearKeystrokeUiState();
  }
  state.editor.openDropdown = null;
  state.editor.currentStep = Math.min(2, state.editor.currentStep + 1);
  rerender(renderEditorOnly);
}

function parseComboInput(value) {
  return String(value || '').split('+').map((token) => token.trim()).filter(Boolean);
}

function resetRecordingState() {
  state.editor.recordingTarget = null;
  state.editor.recordingKeys = [];
  state.editor.recordingPreviewKeys = [];
  state.editor.recordingHeldKeys = {};
  if (typeof recordingCaptureCleanup === 'function') {
    recordingCaptureCleanup();
    recordingCaptureCleanup = null;
  }
}

function resetComboDraftState() {
  state.editor.comboDraftTarget = null;
  state.editor.comboDraftKeys = [];
}

function stopShortcutRecording(renderEditorOnly, { preserveMessage = false } = {}) {
  const activeTarget = state.editor.recordingTarget;
  const committed = activeTarget !== null ? commitComboDraft(activeTarget) : false;
  if (!preserveMessage && !committed) {
    state.editor.validationMessage = '';
  }
  resetRecordingState();
  renderEditorOnly();
}

function clearRecordingState() {
  resetRecordingState();
  state.editor.validationMessage = '';
}

function clearComboEditingState() {
  resetComboDraftState();
}

function clearKeystrokeUiState() {
  clearRecordingState();
  clearComboEditingState();
}

function setComboDraft(index, keys) {
  state.editor.comboDraftTarget = index;
  state.editor.comboDraftKeys = Array.isArray(keys) ? [...keys].slice(0, STEP_LIMITS.comboMaxKeys) : [];
}

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

function ensureComboDraft(index) {
  const step = getActiveSteps()[index];
  if (!step || !['keyCombo', 'keyPress'].includes(step.type)) return [];
  if (state.editor.comboDraftTarget !== index) {
    setComboDraft(index, getStepRecordedKeys(step));
  }
  return state.editor.comboDraftKeys;
}

function commitComboDraft(index) {
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

function resetCombo(index) {
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

function startShortcutRecording(index) {
  const step = getActiveSteps()[index];
  if (!step || !['keyCombo', 'keyPress'].includes(step.type)) return false;
  state.editor.recordingTarget = index;
  state.editor.recordingKeys = [];
  state.editor.recordingPreviewKeys = [];
  setComboDraft(index, getStepRecordedKeys(step));
  state.editor.validationMessage = 'Press the keys you want, then stop.';
  return true;
}

function enableRecordingCapture(els) {
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

function getDelayUnitKey(index) {
  return `${state.editor.selectedApp}:${state.editor.selectedPlatform}:${index}`;
}

function getDelayUnit(index) {
  return state.editor.blockEditor.delayUnits[getDelayUnitKey(index)] || 'seconds';
}

function setDelayUnit(index, unit) {
  state.editor.blockEditor.delayUnits[getDelayUnitKey(index)] = unit;
}

function clearDelayUnitsForSelection() {
  Object.keys(state.editor.blockEditor.delayUnits).forEach((key) => {
    if (key.startsWith(`${state.editor.selectedApp}:${state.editor.selectedPlatform}:`)) {
      delete state.editor.blockEditor.delayUnits[key];
    }
  });
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function syncActionTypeFromSteps() {
  const steps = getActiveSteps();
  state.editor.draft.actionType = steps.length > 1 ? 'sequence' : 'single';
}

function rerenderAfterDrag(renderEditorOnly) {
  window.setTimeout(() => {
    renderEditorOnly();
  }, 0);
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

function getRenderedStepIndex(element) {
  const stepEl = element?.matches?.('[data-step-index]') ? element : element?.querySelector?.('[data-step-index]');
  return stepEl ? Number(stepEl.dataset.stepIndex) : null;
}

function destroyBlockEditorDrake() {
  if (blockEditorDrake) {
    blockEditorDrake.destroy();
    blockEditorDrake = null;
  }
}

function setPaletteDeleteState(root, active) {
  const palette = root?.querySelector?.('[data-kp-palette]');
  if (!palette) return;
  palette.classList.toggle('is-delete-target', active);
}

function clearPaletteDeleteState(root) {
  setPaletteDeleteState(root, false);
}

function syncBlockEditorDragula(renderEditorOnly, root = document) {
  destroyBlockEditorDrake();
  clearPaletteDeleteState(root);

  if (!state.editor.open || state.editor.currentStep !== 1) {
    return;
  }

  const menuEl = root.querySelector('[data-kp-palette]');
  const scriptEl = root.querySelector('[data-kp-canvas]');
  const paletteSources = [...root.querySelectorAll('.kp-cat-blocks')].filter((element) => !element.classList.contains('hidden') && element.querySelector('.kp-step'));
  if (!menuEl || !scriptEl) {
    return;
  }

  const containers = [menuEl, scriptEl, ...paletteSources];

  blockEditorDrake = dragula(containers, {
    copy: (_el, source) => source !== scriptEl,
    accepts: (_el, target) => target === scriptEl
      || target === menuEl
      || paletteSources.includes(target),
    revertOnSpill: true,
    moves: (el, source, handle) => {
      if (source !== scriptEl) {
        return el.classList.contains('kp-step')
          && !handle?.closest?.('button, input, select, textarea, [data-toggle-dropdown], [data-kp-key-chip], .setup-select, .setup-select-trigger')
          && getActiveSteps().length < STEP_LIMITS.maxSteps;
      }
      return !handle?.closest?.('input, select, button, textarea, [data-toggle-dropdown], [data-kp-key-chip], .setup-select, .setup-select-trigger');
    }
  });

  blockEditorDrake.on('drag', (_el, source) => {
    setPaletteDeleteState(root, source === scriptEl);
  });

  blockEditorDrake.on('over', (_el, container) => {
    setPaletteDeleteState(root, container === menuEl);
  });

  blockEditorDrake.on('out', (_el, container) => {
    if (container === menuEl) {
      clearPaletteDeleteState(root);
    }
  });

  blockEditorDrake.on('drop', (el, target, source, sibling) => {
    clearPaletteDeleteState(root);
    if (!target) {
      rerenderAfterDrag(renderEditorOnly);
      return;
    }

    const steps = getActiveSteps();

    if (source !== scriptEl) {
      if (steps.length >= STEP_LIMITS.maxSteps) {
        state.editor.validationMessage = `You can add up to ${STEP_LIMITS.maxSteps} steps.`;
        rerenderAfterDrag(renderEditorOnly);
        return;
      }

      const type = el.dataset.paletteStepType;
      const siblingIndex = getRenderedStepIndex(sibling);
      const insertIndex = Number.isInteger(siblingIndex) ? siblingIndex : steps.length;
      steps.splice(insertIndex, 0, createStep(type));
      syncActionTypeFromSteps();
      state.editor.validationMessage = '';
      rerenderAfterDrag(renderEditorOnly);
      return;
    }

    if (source === scriptEl) {
      const fromIndex = getRenderedStepIndex(el);
      if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= steps.length) {
        renderEditorOnly();
        return;
      }

      if (target !== scriptEl) {
        steps.splice(fromIndex, 1);
        clearDelayUnitsForSelection();
        syncActionTypeFromSteps();
        state.editor.validationMessage = '';
        rerenderAfterDrag(renderEditorOnly);
        return;
      }

      const siblingIndex = getRenderedStepIndex(sibling);
      let toIndex = Number.isInteger(siblingIndex) ? siblingIndex : steps.length;
      const [step] = steps.splice(fromIndex, 1);
      if (fromIndex < toIndex) {
        toIndex -= 1;
      }
      steps.splice(toIndex, 0, step);
      clearDelayUnitsForSelection();
      state.editor.validationMessage = '';
      rerenderAfterDrag(renderEditorOnly);
    }
  });

  blockEditorDrake.on('cancel', () => {
    clearPaletteDeleteState(root);
    rerenderAfterDrag(renderEditorOnly);
  });

  blockEditorDrake.on('dragend', () => {
    clearPaletteDeleteState(root);
  });
}

function syncSuggestedIcon() {
  const suggestions = getSuggestedIcons(state.editor.draft, 1);
  const topSuggestion = suggestions[0]?.id;
  const currentIconId = state.editor.draft.iconId;
  const canAutoApply = !state.editor.iconManuallySelected
    && (currentIconId === DEFAULT_ICON_ID || currentIconId === state.editor.lastAutoSuggestedIconId || !currentIconId);

  if (topSuggestion && canAutoApply) {
    state.editor.draft.iconId = topSuggestion;
    state.editor.lastAutoSuggestedIconId = topSuggestion;
  }
}

function serialiseDraft(draft) {
  return JSON.stringify(draft);
}

function hasEditorChanges() {
  return serialiseDraft(state.editor.draft) !== state.editor.initialSnapshot;
}

function requestCloseEditor(renderAll) {
  if (hasEditorChanges() && !window.confirm('Discard your unsaved button changes?')) {
    return;
  }
  closeEditor();
  renderAll();
}

function saveEditorDraft(renderAll, renderEditorOnly) {
  const error = validateButton(state.editor.draft);
  state.editor.validationMessage = error;
  if (error) {
    renderEditorOnly();
    return false;
  }
  currentSet().buttons[state.editor.targetSlot] = deepClone(state.editor.draft);
  closeEditor();
  state.dirty = true;
  renderAll();
  return true;
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

function isModifierToken(token) {
  return ['Command', 'Win', 'Shift', 'Control', 'Ctrl', 'Option', 'Alt'].includes(token);
}

function getOrderedModifierTokens(modifiers = []) {
  const modifierOrder = ['Command', 'Win', 'Control', 'Ctrl', 'Option', 'Alt', 'Shift'];
  return [...new Set((Array.isArray(modifiers) ? modifiers : []).filter((token) => isModifierToken(token)))]
    .sort((left, right) => modifierOrder.indexOf(left) - modifierOrder.indexOf(right));
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

export function openEditor(prefill, mode = 'create', sourceButton = null) {
  const existing = typeof prefill === 'number' ? currentSet().buttons[prefill] : (prefill || sourceButton);
  state.editor.open = true;
  state.editor.mode = existing ? (typeof prefill === 'number' ? 'edit' : 'create') : mode;
  state.editor.currentStep = 0;
  state.editor.targetSlot = typeof prefill === 'number' ? prefill : Math.max(currentSet().buttons.findIndex((entry) => !entry), 0);
  state.editor.draft = normaliseButton(existing || { id: createId('btn') }, state.activeApp);
  if (!existing) {
    state.editor.draft.id ||= createId('btn');
    state.editor.draft.scope.apps = state.editor.draft.scope.apps.length ? state.editor.draft.scope.apps : [state.activeApp];
    state.editor.draft.scope.platforms = state.editor.draft.scope.platforms.length ? state.editor.draft.scope.platforms : ['mac', 'win'];
    syncScopeMappings();
  }
  state.editor.selectedApp = state.editor.draft.scope.apps[0] || state.activeApp;
  state.editor.selectedPlatform = state.editor.draft.scope.platforms[0] || 'mac';
  state.editor.validationMessage = '';
  resetRecordingState();
  resetComboDraftState();
  state.editor.openDropdown = null;
  state.editor.presetPickerOpen = false;
  state.editor.blockEditor.expandedCategory = '';
  state.editor.blockEditor.collapsedCategories = {};
  state.editor.blockEditor.delayUnits = {};
  state.editor.blockEditor.showAdvancedSteps = false;
  state.editor.iconManuallySelected = Boolean(existing?.iconId && existing.iconId !== DEFAULT_ICON_ID);
  state.editor.lastAutoSuggestedIconId = null;
  state.editor.iconBrowser.open = false;
  state.editor.iconBrowser.query = '';
  state.editor.iconBrowser.category = 'all';
  state.editor.iconBrowser.pendingIconId = state.editor.draft.iconId;
  syncSuggestedIcon();
  state.editor.initialSnapshot = serialiseDraft(state.editor.draft);
}

export function closeEditor() {
  state.editor.open = false;
  resetRecordingState();
  resetComboDraftState();
  state.editor.validationMessage = '';
  state.editor.iconBrowser.open = false;
  state.editor.openDropdown = null;
  state.editor.currentStep = 0;
  state.editor.initialSnapshot = '';
  state.editor.presetPickerOpen = false;
  destroyBlockEditorDrake();
}

export function initEditorHandlers(els, { renderAll, renderEditorOnly }) {
  if (editorBound) {
    return;
  }
  editorBound = true;

  els.editorCancel.addEventListener('click', () => {
    requestCloseEditor(renderAll);
  });

  els.editorDone.addEventListener('click', () => {
    if (state.editor.mode !== 'edit' && state.editor.currentStep < 2) {
      advanceEditorStep(renderEditorOnly);
      return;
    }
    saveEditorDraft(renderAll, renderEditorOnly);
  });

  els.editorRemove.addEventListener('click', () => {
    if (state.editor.mode !== 'edit') return;
    requestCloseEditor(renderAll);
  });

  els.editorBody.addEventListener('click', (event) => {
    const dropdownChoice = event.target.closest('[data-dropdown-choice]');
    if (dropdownChoice) {
      const dropdownKey = dropdownChoice.dataset.dropdownChoice;
      const dropdownValue = dropdownChoice.dataset.dropdownValue;
      state.editor.openDropdown = null;
      if (dropdownKey === 'editorCategorySelect') {
        state.editor.draft.category = dropdownValue;
        syncSuggestedIcon();
        renderEditorOnly();
        return;
      }
      if (dropdownKey === 'editorActionType') {
        state.editor.draft.actionType = dropdownValue;
        syncSuggestedIcon();
        state.editor.draft.scope.apps.forEach((appId) => {
          state.editor.draft.scope.platforms.forEach((platform) => {
            const mapping = ensureAppPlatformMapping(state.editor.draft, appId, platform);
            if (dropdownValue === 'single') {
              mapping.steps = [mapping.steps[0] || createStep('keyCombo')];
            } else if (mapping.steps.length < 2) {
              mapping.steps = [mapping.steps[0] || createStep('keyCombo'), createStep('delay')];
            }
          });
        });
        renderEditorOnly();
        return;
      }
      if (dropdownKey.startsWith('step:')) {
        const [, indexValue, field] = dropdownKey.split(':');
        const stepIndex = Number(indexValue);
        const step = getActiveSteps()[stepIndex];
        if (step) {
          if (field === 'key' || field === 'repeatKey') {
            step.key = dropdownValue;
          } else if (field === 'delayUnit') {
            setDelayUnit(stepIndex, dropdownValue);
          }
        }
      }
      renderEditorOnly();
      return;
    }

    const dropdownToggle = event.target.closest('[data-toggle-dropdown]');
    if (dropdownToggle) {
      const dropdownKey = dropdownToggle.dataset.toggleDropdown;
      state.editor.openDropdown = state.editor.openDropdown === dropdownKey ? null : dropdownKey;
      renderEditorOnly();
      return;
    }

    const shouldCloseDropdown = !event.target.closest('[data-dropdown]') && state.editor.openDropdown;
    if (shouldCloseDropdown) {
      state.editor.openDropdown = null;
    }

    const slotButton = event.target.closest('[data-editor-slot]');
    if (slotButton) {
      state.editor.targetSlot = Number(slotButton.dataset.editorSlot);
      rerender(renderEditorOnly);
      return;
    }

    const wizardButton = event.target.closest('[data-editor-step]');
    if (wizardButton) {
      if (Number(wizardButton.dataset.editorStep) !== 1) {
        clearKeystrokeUiState();
      }
      state.editor.openDropdown = null;
      state.editor.currentStep = Number(wizardButton.dataset.editorStep);
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-editor-nav="back"]')) {
      if (state.editor.currentStep === 1) {
        clearKeystrokeUiState();
      }
      state.editor.openDropdown = null;
      state.editor.currentStep = Math.max(0, state.editor.currentStep - 1);
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-editor-nav="next"]')) {
      advanceEditorStep(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-editor-nav="save"]')) {
      els.editorDone.click();
      return;
    }

    if (event.target.closest('[data-open-sequence-presets="true"]')) {
      state.editor.presetPickerOpen = !state.editor.presetPickerOpen;
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-close-sequence-presets="true"]')) {
      state.editor.presetPickerOpen = false;
      rerender(renderEditorOnly);
      return;
    }

    const presetButton = event.target.closest('[data-sequence-preset]');
    if (presetButton) {
      clearKeystrokeUiState();
      const appliedPlatforms = applySequencePreset(
        state.editor.draft,
        presetButton.dataset.sequencePreset,
        state.editor.selectedApp,
        state.editor.draft.scope.platforms
      );
      if (appliedPlatforms.length) {
        state.editor.presetPickerOpen = false;
        state.editor.currentStep = 1;
        rerender(renderEditorOnly);
      }
      return;
    }

    const iconButton = event.target.closest('[data-editor-icon]');
    if (iconButton) {
      clearKeystrokeUiState();
      state.editor.draft.iconId = iconButton.dataset.editorIcon;
      state.editor.iconManuallySelected = true;
      state.editor.lastAutoSuggestedIconId = state.editor.draft.iconId;
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-open-icon-browser="true"]')) {
      clearKeystrokeUiState();
      state.editor.iconBrowser.open = true;
      state.editor.iconBrowser.pendingIconId = state.editor.draft.iconId;
      state.editor.openDropdown = null;
      state.editor.currentStep = 2;
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-close-icon-browser="true"]')) {
      state.editor.iconBrowser.open = false;
      rerender(renderEditorOnly);
      return;
    }

    const iconBrowserChoice = event.target.closest('[data-icon-browser-choice]');
    if (iconBrowserChoice) {
      state.editor.iconBrowser.pendingIconId = iconBrowserChoice.dataset.iconBrowserChoice;
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-apply-icon-browser="true"]')) {
      state.editor.draft.iconId = state.editor.iconBrowser.pendingIconId || DEFAULT_ICON_ID;
      state.editor.iconManuallySelected = true;
      state.editor.lastAutoSuggestedIconId = state.editor.draft.iconId;
      state.editor.iconBrowser.open = false;
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-reset-icon="true"]')) {
      state.editor.iconManuallySelected = false;
      state.editor.draft.iconId = DEFAULT_ICON_ID;
      state.editor.iconBrowser.pendingIconId = DEFAULT_ICON_ID;
      syncSuggestedIcon();
      rerender(renderEditorOnly);
      return;
    }

    const iconFilter = event.target.closest('[data-icon-filter]');
    if (iconFilter) {
      state.editor.iconBrowser.category = iconFilter.dataset.iconFilter;
      rerender(renderEditorOnly);
      return;
    }

    const appButton = event.target.closest('[data-editor-app]');
    if (appButton) {
      clearKeystrokeUiState();
      state.editor.selectedApp = appButton.dataset.editorApp;
      state.editor.currentStep = 1;
      rerender(renderEditorOnly);
      return;
    }

    const platformButton = event.target.closest('[data-editor-platform]');
    if (platformButton) {
      clearKeystrokeUiState();
      state.editor.selectedPlatform = platformButton.dataset.editorPlatform;
      state.editor.currentStep = 1;
      rerender(renderEditorOnly);
      return;
    }

    const categoryToggle = event.target.closest('[data-kp-toggle-category]');
    if (categoryToggle) {
      const category = categoryToggle.dataset.kpToggleCategory;
      state.editor.blockEditor.expandedCategory = state.editor.blockEditor.expandedCategory === category ? '' : category;
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-kp-toggle-advanced-steps]')) {
      state.editor.blockEditor.showAdvancedSteps = !state.editor.blockEditor.showAdvancedSteps;
      rerender(renderEditorOnly);
      return;
    }

    const addStepButton = event.target.closest('[data-kp-add-step]');
    if (addStepButton) {
      const steps = getActiveSteps();
      if (steps.length >= STEP_LIMITS.maxSteps) {
        state.editor.validationMessage = `You can add up to ${STEP_LIMITS.maxSteps} steps.`;
        rerender(renderEditorOnly);
        return;
      }
      steps.push(createStep(addStepButton.dataset.kpAddStep));
      syncActionTypeFromSteps();
      state.editor.validationMessage = '';
      rerender(renderEditorOnly);
      return;
    }

    const insertStepButton = event.target.closest('[data-kp-insert-after]');
    if (insertStepButton) {
      const steps = getActiveSteps();
      if (steps.length >= STEP_LIMITS.maxSteps) {
        state.editor.validationMessage = `You can add up to ${STEP_LIMITS.maxSteps} steps.`;
        rerender(renderEditorOnly);
        return;
      }
      const insertAfter = Number(insertStepButton.dataset.kpInsertAfter);
      const insertIndex = Number.isInteger(insertAfter) ? insertAfter + 1 : steps.length;
      steps.splice(insertIndex, 0, createStep('keyCombo'));
      syncActionTypeFromSteps();
      state.editor.validationMessage = '';
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-clone-same-app="true"]')) {
      clearKeystrokeUiState();
      const target = state.editor.selectedPlatform === 'mac' ? 'win' : 'mac';
      cloneMapping(state.editor.draft, state.editor.selectedApp, state.editor.selectedPlatform, state.editor.selectedApp, target, false);
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-clone-same-platform="true"]')) {
      clearKeystrokeUiState();
      state.editor.draft.scope.apps.forEach((appId) => {
        cloneMapping(state.editor.draft, state.editor.selectedApp, state.editor.selectedPlatform, appId, state.editor.selectedPlatform, false);
      });
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.closest('[data-convert-clone="true"]')) {
      clearKeystrokeUiState();
      const target = state.editor.selectedPlatform === 'mac' ? 'win' : 'mac';
      cloneMapping(state.editor.draft, state.editor.selectedApp, state.editor.selectedPlatform, state.editor.selectedApp, target, true);
      rerender(renderEditorOnly);
      return;
    }

    const deleteButton = event.target.closest('[data-kp-delete], [data-step-delete]');
    if (deleteButton) {
      const deletedIndex = Number(deleteButton.dataset.kpDelete ?? deleteButton.dataset.stepDelete);
      if (state.editor.recordingTarget === deletedIndex) {
        resetRecordingState();
      } else if (state.editor.recordingTarget !== null && deletedIndex < state.editor.recordingTarget) {
        state.editor.recordingTarget -= 1;
      }
      if (state.editor.comboDraftTarget === deletedIndex) {
        resetComboDraftState();
      } else if (state.editor.comboDraftTarget !== null && deletedIndex < state.editor.comboDraftTarget) {
        state.editor.comboDraftTarget -= 1;
      }
      getActiveSteps().splice(deletedIndex, 1);
      clearDelayUnitsForSelection();
      syncActionTypeFromSteps();
      rerender(renderEditorOnly);
      return;
    }

    const stopButton = event.target.closest('[data-kp-stop-recording]');
    if (stopButton) {
      stopShortcutRecording(renderEditorOnly);
      return;
    }

    const saveButton = event.target.closest('[data-kp-save-combo]');
    if (saveButton) {
      const stepIndex = Number(saveButton.dataset.kpSaveCombo);
      if (commitComboDraft(stepIndex)) {
        renderEditorOnly();
      }
      return;
    }

    const resetButton = event.target.closest('[data-kp-reset-combo]');
    if (resetButton) {
      const stepIndex = Number(resetButton.dataset.kpResetCombo);
      if (resetCombo(stepIndex)) {
        renderEditorOnly();
      }
      return;
    }

    const recordButton = event.target.closest('[data-kp-record], [data-record-step]');
    if (recordButton) {
      const targetIndex = Number(recordButton.dataset.kpRecord ?? recordButton.dataset.recordStep);
      if (startShortcutRecording(targetIndex)) {
        enableRecordingCapture(els);
        renderEditorOnly();
      }
    }
  });

  els.editorBody.addEventListener('input', (event) => {
    if (event.target.id === 'editorLabelInput') {
      state.editor.draft.label = event.target.value;
      syncSuggestedIcon();
      clearTimeout(labelInputTimer);
      labelInputTimer = window.setTimeout(() => {
        rerenderPreservingSelection(renderEditorOnly, event.target);
      }, 120);
      return;
    }

    if (event.target.id === 'iconBrowserSearch') {
      state.editor.iconBrowser.query = event.target.value;
      clearTimeout(iconSearchTimer);
      iconSearchTimer = window.setTimeout(() => {
        rerenderPreservingSelection(renderEditorOnly, event.target);
      }, 120);
      return;
    }

    const stepField = event.target.dataset.quandoName || event.target.dataset.stepField;
    if (!stepField) return;
    const step = getActiveSteps()[Number(event.target.dataset.stepIndex)];
    if (!step) return;
    if (stepField === 'keys') {
      const stepIndex = Number(event.target.dataset.stepIndex);
      const nextKeys = parseComboInput(event.target.value);
      setComboDraft(stepIndex, nextKeys);
      rerenderPreservingSelection(renderEditorOnly, event.target);
      return;
    }
    if (stepField === 'value') {
      step.value = event.target.value;
      return;
    }
    if (stepField === 'durationMs') {
      const stepIndex = Number(event.target.dataset.stepIndex);
      const unit = getDelayUnit(stepIndex);
      const rawValue = Number(event.target.value);
      const durationMs = unit === 'milliseconds' ? rawValue : rawValue * 1000;
      step.durationMs = clampNumber(durationMs, STEP_LIMITS.delayMin, STEP_LIMITS.delayMax, 150);
      return;
    }
    if (stepField === 'count') {
      step.count = clampNumber(Number(event.target.value), STEP_LIMITS.repeatMin, STEP_LIMITS.repeatMax, 1);
      return;
    }
    if (stepField === 'key') {
      step.key = event.target.value;
    }
  });

  els.editorBody.addEventListener('change', (event) => {
    if (event.target.id === 'editorLabelInput') {
      clearTimeout(labelInputTimer);
      renderEditorOnly();
      return;
    }

    const scopeApp = event.target.dataset.scopeApp;
    if (scopeApp) {
      clearKeystrokeUiState();
      state.editor.draft.scope.apps = APP_IDS.filter((appId) => els.editorBody.querySelector(`[data-scope-app="${appId}"]`)?.checked);
      syncScopeMappings();
      rerender(renderEditorOnly);
      return;
    }

    const scopePlatform = event.target.dataset.scopePlatform;
    if (scopePlatform) {
      clearKeystrokeUiState();
      state.editor.draft.scope.platforms = PLATFORM_IDS.filter((platform) => els.editorBody.querySelector(`[data-scope-platform="${platform}"]`)?.checked);
      syncScopeMappings();
      rerender(renderEditorOnly);
      return;
    }

    if (event.target.dataset.delayUnit !== undefined) {
      setDelayUnit(Number(event.target.dataset.delayUnit), event.target.value);
      renderEditorOnly();
      return;
    }

    const stepField = event.target.dataset.quandoName || event.target.dataset.stepField;
    if (stepField) {
      const step = getActiveSteps()[Number(event.target.dataset.stepIndex)];
      if (stepField === 'durationMs' && step) {
        const stepIndex = Number(event.target.dataset.stepIndex);
        const unit = getDelayUnit(stepIndex);
        const rawValue = Number(event.target.value);
        const durationMs = unit === 'milliseconds' ? rawValue : rawValue * 1000;
        step.durationMs = clampNumber(durationMs, STEP_LIMITS.delayMin, STEP_LIMITS.delayMax, 150);
      }
      renderEditorOnly();
    }
  });

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

  window.addEventListener('keydown', handleRecordingKeydown, true);
  window.addEventListener('keyup', handleRecordingKeyup, true);
  document.addEventListener('keydown', handleRecordingKeydown, true);
  document.addEventListener('keyup', handleRecordingKeyup, true);

  window.addEventListener('blur', () => {
    if (!state.editor.open || state.editor.recordingTarget === null) return;
    stopShortcutRecording(renderEditorOnly, { preserveMessage: true });
    state.editor.validationMessage = 'Recording stopped because this window was no longer active.';
    renderEditorOnly();
  });

  els.editorBody.addEventListener('dragstart', (event) => {
    const chip = event.target.closest('[data-kp-key-chip]');
    if (!chip) return;
    const stepIndex = Number(chip.dataset.stepIndex);
    const chipIndex = Number(chip.dataset.chipIndex);
    const draftKeys = ensureComboDraft(stepIndex);
    if (!draftKeys.length) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({ stepIndex, chipIndex }));
  });

  els.editorBody.addEventListener('dragover', (event) => {
    const chip = event.target.closest('[data-kp-key-chip]');
    if (chip) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  });

  els.editorBody.addEventListener('drop', (event) => {
    const chip = event.target.closest('[data-kp-key-chip]');
    if (!chip) return;
    const raw = event.dataTransfer.getData('text/plain');
    if (!raw) return;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const fromStepIndex = Number(payload.stepIndex);
    const fromChipIndex = Number(payload.chipIndex);
    const toStepIndex = Number(chip.dataset.stepIndex);
    const toChipIndex = Number(chip.dataset.chipIndex);
    if (!Number.isInteger(fromStepIndex) || !Number.isInteger(fromChipIndex) || fromStepIndex !== toStepIndex || !Number.isInteger(toChipIndex)) {
      return;
    }
    const draftKeys = ensureComboDraft(toStepIndex);
    if (fromChipIndex === toChipIndex || fromChipIndex < 0 || toChipIndex < 0 || fromChipIndex >= draftKeys.length || toChipIndex >= draftKeys.length) {
      return;
    }
    event.preventDefault();
    const [movedKey] = draftKeys.splice(fromChipIndex, 1);
    draftKeys.splice(toChipIndex, 0, movedKey);
    state.editor.comboDraftKeys = [...draftKeys];
    state.editor.validationMessage = 'Shortcut order updated. Save to keep it.';
    renderEditorOnly();
  });
}

export function refreshEditorInteractions(els, renderEditorOnly) {
  syncBlockEditorDragula(renderEditorOnly, els.editorBody);
}
