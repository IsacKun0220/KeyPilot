import { APP_LABELS, STEP_LIMITS, SUPPORTED_PRESS_KEYS } from '../constants.js';

function isModifierToken(token) {
  return ['Command', 'Win', 'Control', 'Ctrl', 'Option', 'Alt', 'Shift'].includes(token);
}

export function validateStep(step, index) {
  if (!step || typeof step !== 'object') {
    return `Step ${index + 1} is missing.`;
  }

  if (step.type === 'keyCombo') {
    const keys = Array.isArray(step.keys) ? step.keys.filter(Boolean) : [];
    if (!keys.length) {
      return `Step ${index + 1} needs shortcut keys.`;
    }
    const primaryCount = keys.filter((token) => !isModifierToken(token)).length;
    if (primaryCount === 0) {
      return `Step ${index + 1} needs one non-modifier key.`;
    }
    if (primaryCount > 1) {
      return `Step ${index + 1} can only use one non-modifier key.`;
    }
  }

  if (step.type === 'keyPress') {
    const modifiers = Array.isArray(step.modifiers) ? step.modifiers.filter(Boolean) : [];
    if (!SUPPORTED_PRESS_KEYS.includes(step.key)) {
      return `Step ${index + 1} uses a key that is not available here.`;
    }
    if (modifiers.length) {
      return `Step ${index + 1} press key does not support modifiers.`;
    }
  }

  if (step.type === 'text') {
    if (!String(step.value || '').trim()) {
      return `Step ${index + 1} needs text to type.`;
    }
  }

  if (step.type === 'delay') {
    if (!Number.isFinite(step.durationMs) || step.durationMs < STEP_LIMITS.delayMin || step.durationMs > STEP_LIMITS.delayMax) {
      return `Step ${index + 1} wait time must be between ${STEP_LIMITS.delayMin} and ${STEP_LIMITS.delayMax} ms.`;
    }
  }

  if (step.type === 'repeatKeyPress') {
    if (!SUPPORTED_PRESS_KEYS.includes(step.key)) {
      return `Step ${index + 1} uses a repeat key that is not available here.`;
    }
    if (!Number.isFinite(step.count) || step.count < STEP_LIMITS.repeatMin || step.count > STEP_LIMITS.repeatMax) {
      return `Step ${index + 1} repeat count must be between ${STEP_LIMITS.repeatMin} and ${STEP_LIMITS.repeatMax}.`;
    }
  }

  return '';
}

export function validateMapping(mapping) {
  const steps = mapping?.steps || [];
  if (!steps.length) {
    return 'Add at least one step.';
  }
  if (steps.length > STEP_LIMITS.maxSteps) {
    return `You can add up to ${STEP_LIMITS.maxSteps} steps.`;
  }
  for (let index = 0; index < steps.length; index += 1) {
    const error = validateStep(steps[index], index);
    if (error) return error;
  }
  return '';
}

export function validateButton(button) {
  if (!String(button.label || '').trim()) {
    return 'Add a button name.';
  }
  if (!button.scope?.apps?.length) {
    return 'Choose at least one app in Works in.';
  }
  if (!button.scope?.platforms?.length) {
    return 'Choose at least one option in Use on.';
  }

  for (const appId of button.scope.apps) {
    for (const platform of button.scope.platforms) {
      const error = validateMapping(button.mappings?.[appId]?.[platform]);
      if (error) {
        return `${APP_LABELS[appId] || appId} ${platform === 'mac' ? 'macOS' : 'Windows'}: ${error}`;
      }
    }
  }

  if (button.actionType === 'single') {
    for (const appId of button.scope.apps) {
      for (const platform of button.scope.platforms) {
        const steps = button.mappings?.[appId]?.[platform]?.steps || [];
        if (steps.length !== 1) {
          return 'Single-step buttons need one step in each setup.';
        }
      }
    }
  }

  return '';
}
