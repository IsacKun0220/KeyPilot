import { APP_GROUPS, APP_IDS, APP_LABELS, PLATFORM_IDS, PLATFORM_LABELS } from '../shared/app-meta.js';
import { BUTTON_CATEGORIES } from '../shared/button-schema.js';

export { APP_GROUPS, APP_IDS, APP_LABELS, PLATFORM_IDS, PLATFORM_LABELS, BUTTON_CATEGORIES };

export const STEP_LIMITS = {
  maxSteps: 8,
  recommendedMin: 2,
  recommendedMax: 5,
  comboMaxKeys: 4,
  delayMin: 50,
  delayMax: 2000,
  repeatMin: 1,
  repeatMax: 10
};

export const SET_LIMIT = 5;
export const SLOT_LIMIT = 5;

export const SUPPORTED_PRESS_KEYS = [
  'Enter',
  'Tab',
  'Escape',
  'Space',
  'Backspace',
  'Delete',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown'
];

export const COMBO_HELPER_KEYS = [
  'Command',
  'Ctrl',
  'Control',
  'Alt',
  'Option',
  'Shift',
  'Enter',
  'Tab',
  'Space',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown'
];

export const EDITOR_DEFAULTS = {
  category: 'general',
  iconId: 'wand-sparkles',
  actionType: 'single'
};
