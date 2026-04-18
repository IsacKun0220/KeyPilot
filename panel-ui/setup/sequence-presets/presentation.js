import { sequencePreset } from './factory.js';

export const PRESENTATION_SEQUENCE_PRESETS = [
  sequencePreset({
    id: 'new-slide',
    label: 'New slide',
    iconId: 'plus',
    category: 'presentation',
    appIds: ['powerpoint', 'slides'],
    platforms: ['mac', 'win'],
    mappings: {
      powerpoint: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'N'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }]
      },
      slides: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'M'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }]
      }
    }
  }),
  sequencePreset({
    id: 'duplicate-slide',
    label: 'Duplicate slide',
    iconId: 'copy',
    category: 'presentation',
    appIds: ['powerpoint', 'slides'],
    platforms: ['mac', 'win'],
    mappings: {
      powerpoint: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'D'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'D'] }]
      },
      slides: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'D'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'D'] }]
      }
    }
  }),
  sequencePreset({
    id: 'open-speaker-notes',
    label: 'Open speaker notes',
    iconId: 'presentation',
    category: 'presentation',
    appIds: ['powerpoint'],
    platforms: ['mac', 'win'],
    mappings: {
      powerpoint: {
        mac: [{ type: 'keyCombo', keys: ['Option', 'Command', 'P'] }],
        win: [{ type: 'keyCombo', keys: ['Alt', 'Shift', 'S'] }]
      }
    }
  })
];
