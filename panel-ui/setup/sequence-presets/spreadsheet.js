import { sequencePreset } from './factory.js';

export const SPREADSHEET_SEQUENCE_PRESETS = [
  sequencePreset({
    id: 'format-as-date',
    label: 'Format as date',
    iconId: 'highlighter',
    category: 'formatting',
    appIds: ['excel', 'sheets'],
    platforms: ['mac', 'win'],
    mappings: {
      excel: {
        mac: [
          { type: 'keyCombo', keys: ['Command', '1'] },
          { type: 'delay', durationMs: 150 },
          { type: 'keyPress', key: 'Tab' }
        ],
        win: [
          { type: 'keyCombo', keys: ['Ctrl', '1'] },
          { type: 'delay', durationMs: 150 },
          { type: 'keyPress', key: 'Tab' }
        ]
      },
      sheets: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'Shift', '3'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'Shift', '3'] }]
      }
    }
  })
];
