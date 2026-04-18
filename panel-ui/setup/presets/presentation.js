import { PRESO_APPS, cmdCtrl, preset, slideTitleMappings } from './factory.js';

export const PRESENTATION_PRESETS = [
  preset({
    id: 'new-slide',
    label: 'New Slide',
    iconId: 'plus',
    category: 'presentation',
    actionType: 'single',
    scope: { apps: PRESO_APPS, platforms: ['mac', 'win'] },
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
    scope: { apps: PRESO_APPS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('D', PRESO_APPS)
  }),
  preset({
    id: 'speaker-notes',
    label: 'Speaker Notes',
    iconId: 'presentation',
    category: 'presentation',
    actionType: 'single',
    scope: { apps: ['powerpoint'], platforms: ['mac', 'win'] },
    mappings: {
      powerpoint: { mac: { steps: [{ type: 'keyCombo', keys: ['Option', 'Command', 'P'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Alt', 'Shift', 'S'] }] } }
    }
  }),
  preset({
    id: 'slide-title',
    label: 'Slide Title',
    iconId: 'plus',
    category: 'presentation',
    actionType: 'sequence',
    scope: { apps: PRESO_APPS, platforms: ['mac', 'win'] },
    mappings: slideTitleMappings('Title')
  }),
  preset({
    id: 'slide-agenda',
    label: 'Slide Agenda',
    iconId: 'plus',
    category: 'presentation',
    actionType: 'sequence',
    scope: { apps: PRESO_APPS, platforms: ['mac', 'win'] },
    mappings: slideTitleMappings('Agenda')
  }),
  preset({
    id: 'slide-summary',
    label: 'Slide Summary',
    iconId: 'plus',
    category: 'presentation',
    actionType: 'sequence',
    scope: { apps: PRESO_APPS, platforms: ['mac', 'win'] },
    mappings: slideTitleMappings('Summary')
  })
];
