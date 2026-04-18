import { INSERT_SEQUENCE_PRESETS } from './insert.js';
import { PRESENTATION_SEQUENCE_PRESETS } from './presentation.js';
import { REVIEW_SEQUENCE_PRESETS } from './review.js';
import { SPREADSHEET_SEQUENCE_PRESETS } from './spreadsheet.js';

export const SEQUENCE_PRESETS = [
  ...REVIEW_SEQUENCE_PRESETS,
  ...INSERT_SEQUENCE_PRESETS,
  ...PRESENTATION_SEQUENCE_PRESETS,
  ...SPREADSHEET_SEQUENCE_PRESETS
];

export function getSequencePresetsForApp(appId) {
  const matching = SEQUENCE_PRESETS.filter((preset) => (preset.scope?.apps || preset.appIds || []).includes(appId));
  return matching.length ? matching : SEQUENCE_PRESETS;
}
