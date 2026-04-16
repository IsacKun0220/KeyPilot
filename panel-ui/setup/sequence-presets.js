export const SEQUENCE_PRESETS = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  }
];

export function getSequencePresetsForApp(appId) {
  const matching = SEQUENCE_PRESETS.filter((preset) => preset.appIds.includes(appId));
  return matching.length ? matching : SEQUENCE_PRESETS;
}
