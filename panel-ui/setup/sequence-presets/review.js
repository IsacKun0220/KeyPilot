import { sequencePreset } from './factory.js';

export const REVIEW_SEQUENCE_PRESETS = [
  sequencePreset({
    id: 'comment',
    label: 'Comment',
    iconId: 'comment',
    category: 'review',
    appIds: ['word', 'docs', 'slides', 'sheets'],
    platforms: ['mac', 'win'],
    mappings: {
      word: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'Option', 'A'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }]
      },
      docs: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }]
      },
      slides: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }]
      },
      sheets: {
        mac: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }],
        win: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }]
      }
    }
  }),
  sequencePreset({
    id: 'comment-needs-revision',
    label: 'Comment: Needs revision',
    iconId: 'comment',
    category: 'review',
    appIds: ['docs', 'slides'],
    platforms: ['mac', 'win'],
    mappings: {
      docs: {
        mac: [
          { type: 'keyCombo', keys: ['Command', 'Option', 'M'] },
          { type: 'delay', durationMs: 400 },
          { type: 'text', value: 'Needs revision' },
          { type: 'delay', durationMs: 120 },
          { type: 'keyPress', key: 'Tab' },
          { type: 'delay', durationMs: 120 },
          { type: 'keyPress', key: 'Enter' }
        ],
        win: [
          { type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] },
          { type: 'delay', durationMs: 400 },
          { type: 'text', value: 'Needs revision' },
          { type: 'delay', durationMs: 120 },
          { type: 'keyPress', key: 'Tab' },
          { type: 'delay', durationMs: 120 },
          { type: 'keyPress', key: 'Enter' }
        ]
      },
      slides: {
        mac: [
          { type: 'keyCombo', keys: ['Command', 'Option', 'M'] },
          { type: 'delay', durationMs: 200 },
          { type: 'text', value: 'Needs revision' },
          { type: 'keyPress', key: 'Enter' }
        ],
        win: [
          { type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] },
          { type: 'delay', durationMs: 200 },
          { type: 'text', value: 'Needs revision' },
          { type: 'keyPress', key: 'Enter' }
        ]
      }
    }
  }),
  sequencePreset({
    id: 'cell-note',
    label: 'Cell note',
    iconId: 'comment',
    category: 'review',
    appIds: ['excel', 'sheets'],
    platforms: ['mac', 'win'],
    mappings: {
      excel: {
        mac: [{ type: 'keyCombo', keys: ['Shift', 'F2'] }],
        win: [{ type: 'keyCombo', keys: ['Shift', 'F2'] }]
      },
      sheets: {
        mac: [{ type: 'keyCombo', keys: ['Shift', 'F2'] }],
        win: [{ type: 'keyCombo', keys: ['Shift', 'F2'] }]
      }
    }
  })
];
