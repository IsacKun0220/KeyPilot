import { REVIEW_APPS, SHEET_APPS, perPlatform, preset } from './factory.js';

export const REVIEW_PRESETS = [
  preset({
    id: 'comment',
    label: 'Comment',
    iconId: 'comment',
    category: 'review',
    actionType: 'single',
    scope: { apps: REVIEW_APPS, platforms: ['mac', 'win'] },
    mappings: {
      word: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'A'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }] } },
      docs: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }] } },
      slides: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }] } },
      sheets: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }] } }
    }
  }),
  preset({
    id: 'needs-revision',
    label: 'Needs Revision',
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
    id: 'cell-note',
    label: 'Cell Note',
    iconId: 'comment',
    category: 'review',
    actionType: 'single',
    scope: { apps: SHEET_APPS, platforms: ['mac', 'win'] },
    mappings: perPlatform(['Shift', 'F2'], ['Shift', 'F2'], SHEET_APPS)
  })
];
