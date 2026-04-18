export const BLOCK_DEFS = [
  {
    type: 'keyCombo',
    label: 'Shortcut',
    toneClass: 'kp-shortcut',
    color: '#7F77DD'
  },
  {
    type: 'keyPress',
    label: 'Press key',
    toneClass: 'kp-keypress',
    color: '#D85A30'
  },
  {
    type: 'text',
    label: 'Type text',
    toneClass: 'kp-text',
    color: '#378ADD'
  },
  {
    type: 'delay',
    label: 'Wait',
    toneClass: 'kp-pause',
    color: '#1D9E75'
  },
  {
    type: 'repeatKeyPress',
    label: 'Repeat key',
    toneClass: 'kp-repeat',
    color: '#BA7517',
    advanced: true
  }
];

export const DEFAULT_BLOCK_CATEGORY = BLOCK_DEFS[0].type;

export function getBlockDef(type) {
  return BLOCK_DEFS.find((entry) => entry.type === type) || BLOCK_DEFS[0];
}
