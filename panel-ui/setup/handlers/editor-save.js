import { DEFAULT_ICON_ID } from '../../shared/icons/index.js';
import { APP_IDS, PLATFORM_IDS } from '../constants.js';
import { state } from '../state.js';
import { validateButton } from '../services/validation.js';
import { normaliseButton } from '../services/normalise.js';
import { getSuggestedIcons } from '../render/icon-suggestions.js';
import { DEFAULT_BLOCK_CATEGORY } from '../render/mapping-editor-defs.js';
import { deepClone } from '../utils/clone.js';
import { createId } from '../utils/ids.js';
import { destroyBlockEditorDrake } from './editor-dnd.js';
import { resetComboDraftState, resetRecordingState } from './editor-recording.js';
import { currentSet, syncScopeMappings } from './editor-shared.js';

function currentAppConfig() {
  return state.config.apps[state.activeApp];
}

export function syncSuggestedIcon() {
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

export function hasEditorChanges() {
  return serialiseDraft(state.editor.draft) !== state.editor.initialSnapshot;
}

export function openEditor(prefill, mode = 'create', sourceButton = null) {
  const existing = typeof prefill === 'number' ? currentSet().buttons[prefill] : (prefill || sourceButton);
  state.editor.open = true;
  state.editor.mode = typeof prefill === 'number' ? 'edit' : mode;
  state.editor.currentStep = 0;
  state.editor.targetSlot = typeof prefill === 'number' ? prefill : null;
  state.editor.draft = normaliseButton(existing || { id: createId('btn') }, state.activeApp);
  if (typeof prefill !== 'number' && sourceButton?.id) {
    const assignedIndex = currentSet().buttons.findIndex((entry) => entry?.id === sourceButton.id);
    state.editor.targetSlot = assignedIndex >= 0 ? assignedIndex : null;
  }
  if (!existing) {
    state.editor.draft.id ||= createId('btn');
    state.editor.draft.scope.apps = state.editor.draft.scope.apps.length ? state.editor.draft.scope.apps : [state.activeApp];
    state.editor.draft.scope.platforms = state.editor.draft.scope.platforms.length ? state.editor.draft.scope.platforms : [...PLATFORM_IDS];
    syncScopeMappings();
  }
  state.editor.selectedApp = state.editor.draft.scope.apps[0] || state.activeApp;
  state.editor.selectedPlatform = state.editor.draft.scope.platforms[0] || 'mac';
  state.editor.validationMessage = '';
  resetRecordingState();
  resetComboDraftState();
  state.editor.openDropdown = null;
  state.editor.presetPickerOpen = false;
  state.editor.blockEditor.expandedCategory = DEFAULT_BLOCK_CATEGORY;
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

export function requestCloseEditor(renderAll) {
  if (hasEditorChanges() && !window.confirm('Discard your unsaved button changes?')) {
    return;
  }
  closeEditor();
  renderAll();
}

function upsertCustomButton(button) {
  const app = currentAppConfig();
  app.customButtons ||= [];
  const nextButton = deepClone(button);
  nextButton.meta ||= {};
  nextButton.meta.source = 'custom';
  const index = app.customButtons.findIndex((entry) => entry?.id === nextButton.id);
  if (index === -1) {
    app.customButtons.unshift(nextButton);
    return;
  }
  app.customButtons[index] = nextButton;
}

export function deleteButtonDefinition(buttonId) {
  if (!buttonId) return false;
  const app = currentAppConfig();
  let changed = false;

  app.customButtons = (app.customButtons || []).filter((button) => {
    const shouldKeep = button?.id !== buttonId;
    if (!shouldKeep) {
      changed = true;
    }
    return shouldKeep;
  });

  app.sets = (app.sets || []).map((set) => {
    let setChanged = false;
    const buttons = (set.buttons || []).map((button) => {
      if (button?.id === buttonId) {
        setChanged = true;
        return null;
      }
      return button;
    });
    if (setChanged) {
      changed = true;
      return { ...set, buttons };
    }
    return set;
  });

  return changed;
}

function removePreviousSlotAssignment(buttonId, keepIndex = null) {
  currentSet().buttons = currentSet().buttons.map((button, index) => {
    if (index === keepIndex) return button;
    return button?.id === buttonId ? null : button;
  });
}

export function deleteEditorDraft(markDirty, renderAll) {
  const changed = deleteButtonDefinition(state.editor.draft?.id);
  closeEditor();
  if (changed) {
    markDirty();
  }
  renderAll();
  return changed;
}

export function saveEditorDraft(markDirty, renderAll, renderEditorOnly) {
  const error = validateButton(state.editor.draft);
  state.editor.validationMessage = error;
  if (error) {
    renderEditorOnly();
    return false;
  }
  if (state.editor.draft.meta?.source === 'preset') {
    state.editor.draft.id = createId('btn');
  }
  state.editor.draft.meta ||= {};
  state.editor.draft.meta.source = 'custom';
  removePreviousSlotAssignment(state.editor.draft.id, state.editor.targetSlot);
  if (state.editor.targetSlot !== null) {
    currentSet().buttons[state.editor.targetSlot] = deepClone(state.editor.draft);
  }
  upsertCustomButton(state.editor.draft);
  closeEditor();
  markDirty();
  renderAll();
  return true;
}
