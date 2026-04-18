import { APP_IDS, PLATFORM_IDS } from '../../shared/app-meta.js';
import { normaliseButton } from '../services/normalise.js';

const MAX_LABEL_LENGTH = 20;

export const TEXT_APPS = ['word', 'powerpoint', 'docs', 'slides'];
export const SHEET_APPS = ['excel', 'sheets'];
export const PRESO_APPS = ['powerpoint', 'slides'];
export const REVIEW_APPS = ['word', 'docs', 'slides', 'sheets'];

export { APP_IDS, PLATFORM_IDS };

export function preset(definition) {
  if (definition.label.length > MAX_LABEL_LENGTH) {
    throw new Error(`Preset label "${definition.label}" exceeds max length of ${MAX_LABEL_LENGTH}`);
  }

  return normaliseButton({
    ...definition,
    meta: { source: 'preset', version: 1 },
    scope: {
      apps: definition.scope?.apps || APP_IDS,
      platforms: definition.scope?.platforms || PLATFORM_IDS
    }
  }, definition.scope?.apps?.[0] || APP_IDS[0]);
}

export function cmdCtrl(key, apps) {
  return apps.reduce((mappings, appId) => {
    mappings[appId] = {
      mac: { steps: [{ type: 'keyCombo', keys: ['Command', key] }] },
      win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', key] }] }
    };
    return mappings;
  }, {});
}

export function perPlatform(macKeys, winKeys, apps) {
  return apps.reduce((mappings, appId) => {
    mappings[appId] = {
      mac: { steps: [{ type: 'keyCombo', keys: macKeys }] },
      win: { steps: [{ type: 'keyCombo', keys: winKeys }] }
    };
    return mappings;
  }, {});
}

export function buildMappingsForApps(apps, createPlatformMapping) {
  return apps.reduce((mappings, appId) => {
    mappings[appId] = createPlatformMapping(appId);
    return mappings;
  }, {});
}

export function linkInsertMappings(apps, url) {
  return buildMappingsForApps(apps, () => ({
    mac: {
      steps: [
        { type: 'keyCombo', keys: ['Command', 'K'] },
        { type: 'delay', durationMs: 500 },
        { type: 'text', value: url },
        { type: 'delay', durationMs: 150 },
        { type: 'keyCombo', keys: ['Command', 'Enter'] }
      ]
    },
    win: {
      steps: [
        { type: 'keyCombo', keys: ['Ctrl', 'K'] },
        { type: 'delay', durationMs: 500 },
        { type: 'text', value: url },
        { type: 'delay', durationMs: 150 },
        { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }
      ]
    }
  }));
}

export function findTextMappings(apps, value) {
  return buildMappingsForApps(apps, () => ({
    mac: {
      steps: [
        { type: 'keyCombo', keys: ['Command', 'F'] },
        { type: 'delay', durationMs: 300 },
        { type: 'text', value }
      ]
    },
    win: {
      steps: [
        { type: 'keyCombo', keys: ['Ctrl', 'F'] },
        { type: 'delay', durationMs: 300 },
        { type: 'text', value }
      ]
    }
  }));
}

export function slideTitleMappings(value) {
  return {
    powerpoint: {
      mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'N'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value }] },
      win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value }] }
    },
    slides: {
      mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value }] },
      win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value }] }
    }
  };
}
