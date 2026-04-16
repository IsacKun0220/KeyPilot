import { PLATFORM_IDS } from '../../shared/app-meta.js';
import { createStep } from '../../shared/action-schema.js';
import { SEQUENCE_PRESETS } from '../sequence-presets.js';
import { deepClone } from '../utils/clone.js';

const modifierSwap = {
  Command: 'Ctrl',
  Cmd: 'Ctrl',
  Ctrl: 'Command',
  Control: 'Command',
  Option: 'Alt',
  Alt: 'Option'
};

export function cloneMapping(button, sourceApp, sourcePlatform, targetApp, targetPlatform, convertModifiers = false) {
  const sourceSteps = button.mappings?.[sourceApp]?.[sourcePlatform]?.steps || [];
  const clonedSteps = deepClone(sourceSteps).map((step) => {
    if (!convertModifiers || step.type !== 'keyCombo') {
      return step;
    }
    return {
      ...step,
      keys: step.keys.map((key) => modifierSwap[key] || key)
    };
  });

  button.mappings[targetApp] ||= {};
  button.mappings[targetApp][targetPlatform] = { steps: clonedSteps };
  return clonedSteps;
}

export function createDefaultMappings(appIds = [], platforms = PLATFORM_IDS, actionType = 'single') {
  return appIds.reduce((mappings, appId) => {
    mappings[appId] = {};
    platforms.forEach((platform) => {
      mappings[appId][platform] = {
        steps: actionType === 'sequence'
          ? [createStep('keyCombo'), createStep('delay'), createStep('keyPress')]
          : [createStep('keyCombo')]
      };
    });
    return mappings;
  }, {});
}

export function getResolvedSteps(button, appId, platform) {
  const steps = button.mappings?.[appId]?.[platform]?.steps
    || button.mappings?.[appId]?.[platform === 'mac' ? 'win' : 'mac']?.steps
    || [];
  if (button?.id) {
    console.debug('[KeyPilot] getResolvedSteps', {
      buttonId: button.id,
      label: button.label,
      actionType: button.actionType,
      appId,
      platform,
      stepCount: steps.length,
      stepTypes: steps.map((step) => step?.type || 'unknown')
    });
  }
  return steps;
}

export function applySequencePreset(button, presetId, targetApp, targetPlatforms = PLATFORM_IDS) {
  const preset = SEQUENCE_PRESETS.find((entry) => entry.id === presetId);
  if (!preset || !preset.mappings[targetApp]) {
    return [];
  }

  button.actionType = 'sequence';
  button.mappings ||= {};
  button.mappings[targetApp] ||= {};

  const appliedPlatforms = [];
  targetPlatforms.forEach((platform) => {
    const sourceSteps = preset.mappings[targetApp][platform];
    if (!sourceSteps) return;
    button.mappings[targetApp][platform] = { steps: deepClone(sourceSteps) };
    appliedPlatforms.push(platform);
  });

  return appliedPlatforms;
}
