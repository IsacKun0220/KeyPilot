import { APP_IDS, cmdCtrl, findTextMappings, preset } from './factory.js';

export const NAVIGATION_PRESETS = [
  preset({
    id: 'find',
    label: 'Find',
    iconId: 'search',
    category: 'navigation',
    actionType: 'single',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('F', APP_IDS)
  }),
  preset({
    id: 'find-replace',
    label: 'Find Replace',
    iconId: 'search',
    category: 'navigation',
    actionType: 'single',
    scope: { apps: ['docs', 'sheets', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      docs: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'H'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'H'] }] }
      },
      sheets: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'H'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'H'] }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'H'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'H'] }] }
      }
    }
  }),
  preset({
    id: 'find-next',
    label: 'Find Next',
    iconId: 'search',
    category: 'navigation',
    actionType: 'single',
    scope: { apps: ['docs', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      docs: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'G'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'G'] }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'G'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'G'] }] }
      }
    }
  }),
  preset({
    id: 'find-prev',
    label: 'Find Prev',
    iconId: 'search',
    category: 'navigation',
    actionType: 'single',
    scope: { apps: ['docs', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      docs: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'G'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Shift', 'G'] }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'G'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Shift', 'G'] }] }
      }
    }
  }),
  preset({
    id: 'open-link',
    label: 'Open Link',
    iconId: 'link',
    category: 'navigation',
    actionType: 'single',
    scope: { apps: ['docs', 'slides'], platforms: ['mac', 'win'] },
    mappings: {
      docs: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Option', 'Enter'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Alt', 'Enter'] }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Option', 'Enter'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Alt', 'Enter'] }] }
      }
    }
  }),
  preset({
    id: 'find-todo',
    label: 'Find TODO',
    iconId: 'search',
    category: 'navigation',
    actionType: 'sequence',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: findTextMappings(APP_IDS, 'TODO')
  }),
  preset({
    id: 'find-tbc',
    label: 'Find TBC',
    iconId: 'search',
    category: 'navigation',
    actionType: 'sequence',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: findTextMappings(APP_IDS, 'TBC')
  }),
  preset({
    id: 'find-fixme',
    label: 'Find FIXME',
    iconId: 'search',
    category: 'navigation',
    actionType: 'sequence',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: findTextMappings(APP_IDS, 'FIXME')
  }),
  preset({
    id: 'find-draft',
    label: 'Find Draft',
    iconId: 'search',
    category: 'navigation',
    actionType: 'sequence',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: findTextMappings(APP_IDS, 'draft')
  })
];
