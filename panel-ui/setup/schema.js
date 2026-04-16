import { APP_IDS, PLATFORM_IDS } from '../shared/app-meta.js';
import { createStep } from '../shared/action-schema.js';
import { createEmptyButton, createEmptyPlatformMapping } from '../shared/button-schema.js';
import { createId } from './utils/ids.js';

export function createEmptySequence() {
  return [];
}

export function createEmptyMapping() {
  return {};
}

export function createEmptyButtonDraft() {
  return {
    ...createEmptyButton(),
    id: createId('btn'),
    scope: {
      apps: [APP_IDS[0]],
      platforms: [...PLATFORM_IDS]
    },
    mappings: {
      [APP_IDS[0]]: {
        mac: { steps: [createStep('keyCombo')] },
        win: { steps: [createStep('keyCombo')] }
      }
    }
  };
}

export function createDefaultSingleButton() {
  const draft = createEmptyButtonDraft();
  draft.actionType = 'single';
  draft.mappings[draft.scope.apps[0]].mac = { steps: [createStep('keyCombo')] };
  draft.mappings[draft.scope.apps[0]].win = { steps: [createStep('keyCombo')] };
  return draft;
}

export function createDefaultSequenceButton() {
  const draft = createEmptyButtonDraft();
  draft.actionType = 'sequence';
  draft.mappings[draft.scope.apps[0]].mac = {
    steps: [createStep('keyCombo'), createStep('delay'), createStep('keyPress')]
  };
  draft.mappings[draft.scope.apps[0]].win = {
    steps: [createStep('keyCombo'), createStep('delay'), createStep('keyPress')]
  };
  return draft;
}

export function ensureAppPlatformMapping(button, appId, platform) {
  button.mappings[appId] ||= {};
  button.mappings[appId][platform] ||= createEmptyPlatformMapping();
  button.mappings[appId][platform].steps ||= [];
  return button.mappings[appId][platform];
}

