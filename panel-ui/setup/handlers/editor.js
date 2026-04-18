import '../../shared/runtime-core.js';
import { createStep } from '../../shared/action-schema.js';
import { DEFAULT_ICON_ID } from '../../shared/icons/index.js';
import { APP_IDS, PLATFORM_IDS, STEP_LIMITS } from '../constants.js';
import { state } from '../state.js';
import { cloneMapping, applySequencePreset } from '../services/mapping.js';
import { hasBlockEditorDrake, syncBlockEditorDragula, destroyBlockEditorDrake } from './editor-dnd.js';
import {
  clearKeystrokeUiState,
  commitComboDraft,
  createRecordingHandlers,
  enableRecordingCapture,
  ensureComboDraft,
  resetCombo,
  resetComboDraftState,
  resetRecordingState,
  setComboDraft,
  startShortcutRecording,
  stopShortcutRecording
} from './editor-recording.js';
import { closeEditor, deleteEditorDraft, openEditor, requestCloseEditor, saveEditorDraft, syncSuggestedIcon } from './editor-save.js';
import {
  advanceEditorStep,
  clampNumber,
  clearDelayUnitsForSelection,
  getActiveSteps,
  getDelayUnit,
  parseComboInput,
  rerender,
  rerenderPreservingSelection,
  setDelayUnit,
  syncActionTypeFromSteps,
  syncScopeMappings,
  ensureActionTypeSteps
} from './editor-shared.js';

export { openEditor, closeEditor };

let editorBound = false;
let labelInputTimer = null;
let iconSearchTimer = null;

function updateStepDropdownPlacement(els) {
  const editorBody = els.editorBody;
  if (!(editorBody instanceof HTMLElement)) {
    return;
  }

  const sheetBody = editorBody.closest('.sheet-body');
  const footer = editorBody.querySelector('.editor-footer');
  const bodyRect = (sheetBody instanceof HTMLElement ? sheetBody : editorBody).getBoundingClientRect();
  const footerRect = footer instanceof HTMLElement ? footer.getBoundingClientRect() : null;
  const clipTop = Math.max(bodyRect.top + 12, 12);
  const clipBottom = Math.min(
    footerRect ? footerRect.top - 10 : bodyRect.bottom - 12,
    bodyRect.bottom - 12,
    window.innerHeight - 12
  );

  editorBody.querySelectorAll('.kp-canvas-brick .setup-select').forEach((select) => {
    if (!(select instanceof HTMLElement)) {
      return;
    }

    const menu = select.querySelector('.setup-select-menu');
    if (!(menu instanceof HTMLElement)) {
      return;
    }

    select.classList.remove('setup-select--drop-up');
    select.style.removeProperty('--setup-select-menu-max-height');

    if (!select.classList.contains('is-open')) {
      return;
    }

    const triggerRect = select.getBoundingClientRect();
    const desiredHeight = Math.min(menu.scrollHeight || 0, Math.round(window.innerHeight * 0.4), 280);
    const spaceBelow = Math.max(0, Math.floor(clipBottom - triggerRect.bottom - 8));
    const spaceAbove = Math.max(0, Math.floor(triggerRect.top - clipTop - 8));
    const shouldDropUp = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
    const availableHeight = shouldDropUp ? spaceAbove : spaceBelow;

    if (shouldDropUp) {
      select.classList.add('setup-select--drop-up');
    }

    if (availableHeight > 0) {
      select.style.setProperty('--setup-select-menu-max-height', `${Math.max(120, availableHeight)}px`);
    }
  });
}

function syncAutoTextareaHeight(textarea) {
  if (!(textarea instanceof HTMLTextAreaElement) || !textarea.classList.contains('kp-textarea--auto')) {
    return;
  }
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export function initEditorHandlers(els, { markDirty, renderAll, renderEditorOnly }) {
  if (editorBound) {
    return;
  }
  editorBound = true;
  const recordingHandlers = createRecordingHandlers(renderEditorOnly);

  els.editorCancel.addEventListener('click', () => {
    requestCloseEditor(renderAll);
  });

  els.editorDone.addEventListener('click', () => {
    if (state.editor.mode !== 'edit' && state.editor.currentStep < 2) {
      advanceEditorStep(renderEditorOnly, clearKeystrokeUiState);
      return;
    }
    saveEditorDraft(markDirty, renderAll, renderEditorOnly);
  });

  els.editorRemove.addEventListener('click', () => {
    if (state.editor.mode !== 'edit') return;
    deleteEditorDraft(markDirty, renderAll);
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
        ensureActionTypeSteps(dropdownValue);
        renderEditorOnly();
        return;
      }
      if (dropdownKey.startsWith('step:')) {
        const [, indexValue, field] = dropdownKey.split(':');
        const stepIndex = Number(indexValue);
        const step = getActiveSteps()[stepIndex];
        if (step) {
          if (field === 'key' || field === 'repeatKey' || field === 'pressKey') {
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
      const nextSlot = Number(slotButton.dataset.editorSlot);
      state.editor.targetSlot = state.editor.targetSlot === nextSlot ? null : nextSlot;
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

    if (event.target.closest('[data-editor-nav="cancel"]')) {
      els.editorCancel.click();
      return;
    }

    if (event.target.closest('[data-editor-nav="next"]')) {
      advanceEditorStep(renderEditorOnly, clearKeystrokeUiState);
      return;
    }

    if (event.target.closest('[data-editor-nav="save"]')) {
      els.editorDone.click();
      return;
    }

    if (event.target.closest('[data-editor-nav="delete"]')) {
      els.editorRemove.click();
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
      state.editor.blockEditor.expandedCategory = category;
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
      syncAutoTextareaHeight(event.target);
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

  window.addEventListener('keydown', recordingHandlers.handleRecordingKeydown, true);
  window.addEventListener('keyup', recordingHandlers.handleRecordingKeyup, true);
  document.addEventListener('keydown', recordingHandlers.handleRecordingKeydown, true);
  document.addEventListener('keyup', recordingHandlers.handleRecordingKeyup, true);

  window.addEventListener('blur', recordingHandlers.handleWindowBlur);

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
  const meta = els._editorRenderMeta || {};
  els.editorBody.querySelectorAll('.kp-textarea--auto').forEach((textarea) => {
    syncAutoTextareaHeight(textarea);
  });
  updateStepDropdownPlacement(els);
  if (!meta.open || meta.currentStep !== 1) {
    destroyBlockEditorDrake();
    return;
  }
  if (els._editorDndSignature === meta.dndSignature && hasBlockEditorDrake()) {
    if (meta.stepContentChanged) {
      syncBlockEditorDragula(renderEditorOnly, els.editorBody);
    }
    return;
  }
  els._editorDndSignature = meta.dndSignature;
  syncBlockEditorDragula(renderEditorOnly, els.editorBody);
}
