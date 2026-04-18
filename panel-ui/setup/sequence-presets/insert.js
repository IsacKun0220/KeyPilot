import { sequencePreset } from './factory.js';

export const INSERT_SEQUENCE_PRESETS = [
  sequencePreset({
    id: 'insert-link',
    label: 'Insert link',
    iconId: 'link',
    category: 'insert',
    appIds: ['word', 'powerpoint', 'docs', 'slides'],
    platforms: ['mac', 'win'],
    mappings: {
      word: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'K'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }]
      },
      powerpoint: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'K'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }]
      },
      docs: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'K'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }]
      },
      slides: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'K'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }]
      }
    }
  })
];
