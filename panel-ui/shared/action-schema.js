export const STEP_TYPES = ['keyCombo', 'keyPress', 'text', 'delay', 'repeatKeyPress'];

export const STEP_TYPE_LABELS = {
  keyCombo: 'Shortcut',
  keyPress: 'Press key',
  text: 'Type text',
  delay: 'Wait',
  repeatKeyPress: 'Repeat key'
};

export function createStep(type = 'keyCombo') {
  switch (type) {
    case 'keyPress':
      return { type: 'keyPress', key: 'Enter', modifiers: [] };
    case 'text':
      return { type: 'text', value: '' };
    case 'delay':
      return { type: 'delay', durationMs: 250 };
    case 'repeatKeyPress':
      return { type: 'repeatKeyPress', key: 'ArrowDown', count: 2 };
    case 'keyCombo':
    default:
      return { type: 'keyCombo', keys: [] };
  }
}
