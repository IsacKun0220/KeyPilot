export function describeButtonBehavior(button, steps = [], { emptyLabel = 'No action set' } = {}) {
  if (!steps.length) return emptyLabel;
  if (button?.actionType === 'sequence') {
    if (steps.some((step) => step.type === 'text' && step.value)) return 'Types text as part of a short sequence';
    if (steps.some((step) => step.type === 'repeatKeyPress')) return 'Runs a short repeated action';
    return 'Runs a short multi-step action';
  }
  const first = steps[0];
  if (first?.type === 'text' && first.value) return 'Types text';
  if (first?.type === 'repeatKeyPress') return 'Repeats a key action';
  if (first?.type === 'delay') return 'Pause action';
  if (first?.type === 'keyPress') return 'Single key action';
  return 'Single shortcut';
}

export function formatActionTypeLabel(actionType) {
  return actionType === 'sequence' ? 'Sequence' : 'Shortcut';
}

export function truncateValue(value = '', maxLength = 22) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}
