import { createStep } from '../../shared/action-schema.js';
import { APP_IDS, PLATFORM_IDS } from '../constants.js';
import { state } from '../state.js';
import { ensureAppPlatformMapping } from '../schema.js';
import { cloneMapping, createDefaultMappings } from '../services/mapping.js';

export function currentSet() {
  return state.config.apps[state.activeApp].sets[state.activeSetIndex];
}

export function getActiveSteps() {
  return ensureAppPlatformMapping(state.editor.draft, state.editor.selectedApp, state.editor.selectedPlatform).steps;
}

export function rerender(renderEditorOnly) {
  state.editor.validationMessage = '';
  renderEditorOnly();
}

export function rerenderPreservingSelection(renderEditorOnly, element) {
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

export function syncScopeMappings() {
  const draft = state.editor.draft;
  const previousMappings = draft.mappings || {};
  const previousApps = Object.keys(previousMappings);
  const previousPlatforms = [...new Set(
    previousApps.flatMap((appId) => Object.keys(previousMappings?.[appId] || {}))
  )];
  const nextMappings = createDefaultMappings(draft.scope.apps, draft.scope.platforms, draft.actionType);
  draft.scope.apps.forEach((appId) => {
    draft.scope.platforms.forEach((platform) => {
      if (previousMappings?.[appId]?.[platform]) {
        nextMappings[appId][platform] = previousMappings[appId][platform];
      }
    });
  });
  draft.mappings = nextMappings;

  const addedPlatforms = draft.scope.platforms.filter((platform) => !previousPlatforms.includes(platform));
  addedPlatforms.forEach((platform) => {
    const sourcePlatform = platform === 'win' ? 'mac' : 'win';
    draft.scope.apps.forEach((appId) => {
      const targetSteps = draft.mappings?.[appId]?.[platform]?.steps || [];
      const sourceSteps = previousMappings?.[appId]?.[sourcePlatform]?.steps || [];
      if (!targetSteps.length && sourceSteps.length) {
        cloneMapping(draft, appId, sourcePlatform, appId, platform, true);
      }
    });
  });

  const addedApps = draft.scope.apps.filter((appId) => !previousApps.includes(appId));
  addedApps.forEach((appId) => {
    draft.scope.platforms.forEach((platform) => {
      const targetSteps = draft.mappings?.[appId]?.[platform]?.steps || [];
      if (targetSteps.length) return;

      const sourceApp = previousApps.find((candidate) => previousMappings?.[candidate]?.[platform]?.steps?.length);
      if (sourceApp) {
        cloneMapping(draft, sourceApp, platform, appId, platform, false);
        return;
      }

      const alternatePlatform = platform === 'win' ? 'mac' : 'win';
      const crossPlatformApp = previousApps.find((candidate) => previousMappings?.[candidate]?.[alternatePlatform]?.steps?.length);
      if (crossPlatformApp) {
        cloneMapping(draft, crossPlatformApp, alternatePlatform, appId, platform, platform !== alternatePlatform);
      }
    });
  });

  state.editor.selectedApp = draft.scope.apps[0] || APP_IDS[0];
  state.editor.selectedPlatform = draft.scope.platforms.includes(state.os)
    ? state.os
    : (draft.scope.platforms[0] || PLATFORM_IDS[0]);
}

export function advanceEditorStep(renderEditorOnly, clearKeystrokeUiState) {
  if (state.editor.currentStep === 1) {
    clearKeystrokeUiState();
  }
  state.editor.openDropdown = null;
  state.editor.currentStep = Math.min(2, state.editor.currentStep + 1);
  rerender(renderEditorOnly);
}

export function parseComboInput(value) {
  return String(value || '').split('+').map((token) => token.trim()).filter(Boolean);
}

export function getDelayUnitKey(index) {
  return `${state.editor.selectedApp}:${state.editor.selectedPlatform}:${index}`;
}

export function getDelayUnit(index) {
  return state.editor.blockEditor.delayUnits[getDelayUnitKey(index)] || 'seconds';
}

export function setDelayUnit(index, unit) {
  state.editor.blockEditor.delayUnits[getDelayUnitKey(index)] = unit;
}

export function clearDelayUnitsForSelection() {
  Object.keys(state.editor.blockEditor.delayUnits).forEach((key) => {
    if (key.startsWith(`${state.editor.selectedApp}:${state.editor.selectedPlatform}:`)) {
      delete state.editor.blockEditor.delayUnits[key];
    }
  });
}

export function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function syncActionTypeFromSteps() {
  const steps = getActiveSteps();
  state.editor.draft.actionType = steps.length > 1 ? 'sequence' : 'single';
}

export function ensureActionTypeSteps(actionType) {
  state.editor.draft.scope.apps.forEach((appId) => {
    state.editor.draft.scope.platforms.forEach((platform) => {
      const mapping = ensureAppPlatformMapping(state.editor.draft, appId, platform);
      if (actionType === 'single') {
        mapping.steps = [mapping.steps[0] || createStep('keyCombo')];
      } else if (mapping.steps.length < 2) {
        mapping.steps = [mapping.steps[0] || createStep('keyCombo'), createStep('delay')];
      }
    });
  });
}
