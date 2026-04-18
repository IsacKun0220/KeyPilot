import { APP_IDS, cmdCtrl, preset } from './factory.js';

export const EDITING_PRESETS = [
  preset({
    id: 'undo',
    label: 'Undo',
    iconId: 'undo',
    category: 'editing',
    actionType: 'single',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('Z', APP_IDS)
  }),
  preset({
    id: 'redo',
    label: 'Redo',
    iconId: 'redo',
    category: 'editing',
    actionType: 'single',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('Y', APP_IDS)
  }),
  preset({
    id: 'select-all',
    label: 'Select All',
    iconId: 'select-all',
    category: 'editing',
    actionType: 'single',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('A', APP_IDS)
  }),
  preset({
    id: 'copy',
    label: 'Copy',
    iconId: 'copy',
    category: 'editing',
    actionType: 'single',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('C', APP_IDS)
  }),
  preset({
    id: 'cut',
    label: 'Cut',
    iconId: 'copy',
    category: 'editing',
    actionType: 'single',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('X', APP_IDS)
  }),
  preset({
    id: 'paste',
    label: 'Paste',
    iconId: 'copy',
    category: 'editing',
    actionType: 'single',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('V', APP_IDS)
  }),
  preset({
    id: 'paste-plain',
    label: 'Paste Plain',
    iconId: 'copy',
    category: 'editing',
    actionType: 'single',
    scope: { apps: ['docs', 'sheets', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      docs: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'V'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Shift', 'V'] }] }
      },
      sheets: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'V'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Shift', 'V'] }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'V'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Shift', 'V'] }] }
      }
    }
  })
];
