import { SHEET_APPS, preset } from './factory.js';

export const SPREADSHEET_PRESETS = [
  preset({
    id: 'fill-down',
    label: 'Fill Down',
    iconId: 'copy',
    category: 'spreadsheet',
    actionType: 'single',
    scope: { apps: SHEET_APPS, platforms: ['mac', 'win'] },
    mappings: {
      excel: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'D'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'D'] }] }
      },
      sheets: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'D'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'D'] }] }
      }
    }
  }),
  preset({
    id: 'fill-right',
    label: 'Fill Right',
    iconId: 'copy',
    category: 'spreadsheet',
    actionType: 'single',
    scope: { apps: SHEET_APPS, platforms: ['mac', 'win'] },
    mappings: {
      excel: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'R'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'R'] }] }
      },
      sheets: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'R'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'R'] }] }
      }
    }
  })
];
