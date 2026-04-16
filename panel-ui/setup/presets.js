import { APP_IDS, PLATFORM_IDS } from '../shared/app-meta.js';
import { normaliseButton } from './services/normalise.js';

function preset(definition) {
  return normaliseButton({
    ...definition,
    meta: { source: 'preset', version: 1 },
    scope: {
      apps: definition.scope?.apps || APP_IDS,
      platforms: definition.scope?.platforms || PLATFORM_IDS
    }
  }, definition.scope?.apps?.[0] || APP_IDS[0]);
}

export const PRESETS = [
  preset({
    id: 'bold',
    label: 'Bold',
    iconId: 'bold',
    category: 'formatting',
    actionType: 'single',
    scope: { apps: ['word', 'powerpoint', 'docs', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      word: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'B'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'B'] }] } },
      powerpoint: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'B'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'B'] }] } },
      docs: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'B'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'B'] }] } },
      slides: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'B'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'B'] }] } }
    }
  }),
  preset({
    id: 'test-new-line',
    label: 'New line',
    iconId: 'pilcrow',
    category: 'editing',
    actionType: 'single',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: APP_IDS.reduce((mappings, appId) => {
      mappings[appId] = {
        mac: { steps: [{ type: 'keyPress', key: 'Enter' }] },
        win: { steps: [{ type: 'keyPress', key: 'Enter' }] }
      };
      return mappings;
    }, {})
  }),
  preset({
    id: 'test-insert-text',
    label: 'Insert test text',
    iconId: 'text-cursor',
    category: 'editing',
    actionType: 'single',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: APP_IDS.reduce((mappings, appId) => {
      mappings[appId] = {
        mac: { steps: [{ type: 'text', value: 'TEST' }] },
        win: { steps: [{ type: 'text', value: 'TEST' }] }
      };
      return mappings;
    }, {})
  }),
  preset({
    id: 'test-delayed-text',
    label: 'Delayed text',
    iconId: 'timer',
    category: 'editing',
    actionType: 'sequence',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: APP_IDS.reduce((mappings, appId) => {
      mappings[appId] = {
        mac: { steps: [{ type: 'delay', durationMs: 500 }, { type: 'text', value: 'DELAY TEST' }] },
        win: { steps: [{ type: 'delay', durationMs: 500 }, { type: 'text', value: 'DELAY TEST' }] }
      };
      return mappings;
    }, {})
  }),
  preset({
    id: 'test-find-text',
    label: 'Find "test"',
    iconId: 'search',
    category: 'navigation',
    actionType: 'sequence',
    scope: { apps: ['word', 'powerpoint', 'docs', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      word: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'test' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'test' }] }
      },
      powerpoint: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'test' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'test' }] }
      },
      docs: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'test' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'test' }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'test' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'test' }] }
      }
    }
  }),
  preset({
    id: 'test-add-comment',
    label: 'Add comment: TEST',
    iconId: 'comment',
    category: 'review',
    actionType: 'sequence',
    scope: { apps: ['docs'], platforms: ['mac', 'win'] },
    mappings: {
      docs: {
        mac: {
          steps: [
            { type: 'keyCombo', keys: ['Command', 'Option', 'M'] },
            { type: 'delay', durationMs: 400 },
            { type: 'text', value: 'TEST' },
            { type: 'keyPress', key: 'Tab' },
            { type: 'delay', durationMs: 100 },
            { type: 'keyPress', key: 'Enter' }
          ]
        },
        win: {
          steps: [
            { type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] },
            { type: 'delay', durationMs: 400 },
            { type: 'text', value: 'TEST' },
            { type: 'keyPress', key: 'Tab' },
            { type: 'delay', durationMs: 100 },
            { type: 'keyPress', key: 'Enter' }
          ]
        }
      }
    }
  }),
  preset({
    id: 'comment',
    label: 'Comment',
    iconId: 'comment',
    category: 'review',
    actionType: 'single',
    scope: { apps: ['word', 'docs', 'slides', 'sheets'], platforms: ['mac', 'win'] },
    mappings: {
      word: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'A'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }] } },
      docs: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }] } },
      slides: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }] } },
      sheets: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }] } }
    }
  }),
  preset({
    id: 'comment-needs-revision',
    label: 'Comment: Needs revision',
    iconId: 'comment',
    category: 'review',
    actionType: 'sequence',
    scope: { apps: ['docs', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      docs: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }, { type: 'delay', durationMs: 200 }, { type: 'text', value: 'Needs revision' }, { type: 'keyPress', key: 'Enter' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }, { type: 'delay', durationMs: 200 }, { type: 'text', value: 'Needs revision' }, { type: 'keyPress', key: 'Enter' }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }, { type: 'delay', durationMs: 200 }, { type: 'text', value: 'Needs revision' }, { type: 'keyPress', key: 'Enter' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }, { type: 'delay', durationMs: 200 }, { type: 'text', value: 'Needs revision' }, { type: 'keyPress', key: 'Enter' }] }
      }
    }
  }),
  preset({
    id: 'insert-link',
    label: 'Insert Link',
    iconId: 'link',
    category: 'insert',
    actionType: 'single',
    scope: { apps: ['word', 'powerpoint', 'docs', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      word: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }] } },
      powerpoint: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }] } },
      docs: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }] } },
      slides: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }] } }
    }
  }),
  preset({
    id: 'new-slide',
    label: 'New Slide',
    iconId: 'plus',
    category: 'presentation',
    actionType: 'single',
    scope: { apps: ['powerpoint', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      powerpoint: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'N'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }] } },
      slides: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'M'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }] } }
    }
  }),
  preset({
    id: 'duplicate-slide',
    label: 'Duplicate Slide',
    iconId: 'copy',
    category: 'presentation',
    actionType: 'single',
    scope: { apps: ['powerpoint', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      powerpoint: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'D'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'D'] }] } },
      slides: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'D'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'D'] }] } }
    }
  }),
  preset({
    id: 'open-speaker-notes',
    label: 'Open Speaker Notes',
    iconId: 'presentation',
    category: 'presentation',
    actionType: 'single',
    scope: { apps: ['powerpoint'], platforms: ['mac', 'win'] },
    mappings: {
      powerpoint: { mac: { steps: [{ type: 'keyCombo', keys: ['Option', 'Command', 'P'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Alt', 'Shift', 'S'] }] } }
    }
  }),
  preset({
    id: 'cell-note',
    label: 'Cell Note',
    iconId: 'comment',
    category: 'review',
    actionType: 'single',
    scope: { apps: ['excel', 'sheets'], platforms: ['mac', 'win'] },
    mappings: {
      excel: { mac: { steps: [{ type: 'keyCombo', keys: ['Shift', 'F2'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Shift', 'F2'] }] } },
      sheets: { mac: { steps: [{ type: 'keyCombo', keys: ['Shift', 'F2'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Shift', 'F2'] }] } }
    }
  }),
  preset({
    id: 'format-as-date',
    label: 'Format as Date',
    iconId: 'highlighter',
    category: 'formatting',
    actionType: 'sequence',
    scope: { apps: ['excel', 'sheets'], platforms: ['mac', 'win'] },
    mappings: {
      excel: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', '1'] }, { type: 'delay', durationMs: 150 }, { type: 'keyPress', key: 'Tab' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', '1'] }, { type: 'delay', durationMs: 150 }, { type: 'keyPress', key: 'Tab' }] }
      },
      sheets: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', '3'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Shift', '3'] }] }
      }
    }
  })
];
