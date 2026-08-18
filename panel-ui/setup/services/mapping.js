import '../../shared/runtime-core.js';
import { PLATFORM_IDS } from '../../shared/app-meta.js';
import { createStep } from '../../shared/action-schema.js';
import { SEQUENCE_PRESETS } from '../sequence-presets.js';
import { deepClone } from '../utils/clone.js';

const { resolveButtonSteps } = globalThis.KeyPilotCore;

const modifierSwap = {
  Command: 'Ctrl',
  Cmd: 'Ctrl',
  Ctrl: 'Command',
  Control: 'Command',
  Option: 'Alt',
  Alt: 'Option'
};

function convertStepForPlatform(step, convertModifiers = false) {
  if (!step || typeof step !== 'object') {
    return step;
  }

  if (!convertModifiers) {
    return deepClone(step);
  }

  if (step.type === 'keyCombo') {
    return {
      ...deepClone(step),
      keys: (Array.isArray(step.keys) ? step.keys : []).map((key) => modifierSwap[key] || key)
    };
  }

  if (step.type === 'keyPress') {
    return {
      ...deepClone(step),
      modifiers: (Array.isArray(step.modifiers) ? step.modifiers : []).map((key) => modifierSwap[key] || key)
    };
  }

  return deepClone(step);
}

export function cloneMapping(button, sourceApp, sourcePlatform, targetApp, targetPlatform, convertModifiers = false) {
  const sourceSteps = button.mappings?.[sourceApp]?.[sourcePlatform]?.steps || [];
  const clonedSteps = sourceSteps.map((step) => convertStepForPlatform(step, convertModifiers));

  button.mappings[targetApp] ||= {};
  button.mappings[targetApp][targetPlatform] = { steps: clonedSteps };
  return clonedSteps;
}

export function syncMirroredPlatformMappings(button, appId, preferredSourcePlatform = 'mac', targetPlatforms = PLATFORM_IDS) {
  const enabledPlatforms = (Array.isArray(targetPlatforms) ? targetPlatforms : PLATFORM_IDS).filter(Boolean);
  if (!enabledPlatforms.includes('win')) {
    return;
  }
  const sourcePlatform = enabledPlatforms.includes(preferredSourcePlatform)
    ? preferredSourcePlatform
    : enabledPlatforms[0];
  const fallbackSourcePlatform = enabledPlatforms.find((platform) => (button.mappings?.[appId]?.[platform]?.steps || []).length);
  const finalSourcePlatform = (button.mappings?.[appId]?.[sourcePlatform]?.steps || []).length
    ? sourcePlatform
    : fallbackSourcePlatform;

  if (!finalSourcePlatform) {
    return;
  }

  enabledPlatforms.forEach((platform) => {
    if (platform === finalSourcePlatform) return;
    cloneMapping(button, appId, finalSourcePlatform, appId, platform, platform !== finalSourcePlatform);
  });
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
  const steps = resolveButtonSteps(button, appId, platform);
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
    const platformMapping = preset.mappings[targetApp][platform];
    const sourceSteps = Array.isArray(platformMapping) ? platformMapping : platformMapping?.steps;
    if (!sourceSteps) return;
    button.mappings[targetApp][platform] = { steps: deepClone(sourceSteps) };
    appliedPlatforms.push(platform);
  });

  return appliedPlatforms;
}
