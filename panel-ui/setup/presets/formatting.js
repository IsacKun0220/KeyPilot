import { TEXT_APPS, SHEET_APPS, cmdCtrl, perPlatform, preset } from './factory.js';

export const FORMATTING_PRESETS = [
  preset({
    id: 'bold',
    label: 'Bold',
    iconId: 'bold',
    category: 'formatting',
    actionType: 'single',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('B', TEXT_APPS)
  }),
  preset({
    id: 'italic',
    label: 'Italic',
    iconId: 'italic',
    category: 'formatting',
    actionType: 'single',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('I', TEXT_APPS)
  }),
  preset({
    id: 'underline',
    label: 'Underline',
    iconId: 'underline',
    category: 'formatting',
    actionType: 'single',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('U', TEXT_APPS)
  }),
  preset({
    id: 'format-as-date',
    label: 'Format as Date',
    iconId: 'calendar',
    category: 'spreadsheet',
    actionType: 'sequence',
    scope: { apps: SHEET_APPS, platforms: ['mac', 'win'] },
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
  }),
  preset({
    id: 'format-currency',
    label: 'Format Currency',
    iconId: 'currency',
    category: 'spreadsheet',
    actionType: 'single',
    scope: { apps: SHEET_APPS, platforms: ['mac', 'win'] },
    mappings: perPlatform(['Command', 'Shift', '4'], ['Ctrl', 'Shift', '4'], SHEET_APPS)
  }),
  preset({
    id: 'format-percent',
    label: 'Format Percent',
    iconId: 'percent',
    category: 'spreadsheet',
    actionType: 'single',
    scope: { apps: SHEET_APPS, platforms: ['mac', 'win'] },
    mappings: perPlatform(['Command', 'Shift', '5'], ['Ctrl', 'Shift', '5'], SHEET_APPS)
  })
];
