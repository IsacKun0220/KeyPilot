import { EDITING_PRESETS } from './editing.js';
import { FORMATTING_PRESETS } from './formatting.js';
import { INSERT_PRESETS } from './insert.js';
import { NAVIGATION_PRESETS } from './navigation.js';
import { PRESENTATION_PRESETS } from './presentation.js';
import { REVIEW_PRESETS } from './review.js';
import { SPREADSHEET_PRESETS } from './spreadsheet.js';

export const PRESETS = [
  ...FORMATTING_PRESETS,
  ...EDITING_PRESETS,
  ...NAVIGATION_PRESETS,
  ...INSERT_PRESETS,
  ...REVIEW_PRESETS,
  ...SPREADSHEET_PRESETS,
  ...PRESENTATION_PRESETS
];
