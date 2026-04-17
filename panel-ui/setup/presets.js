import { APP_IDS, PLATFORM_IDS } from '../shared/app-meta.js';
import { normaliseButton } from './services/normalise.js';

const MAX_LABEL_LENGTH = 20;

function preset(definition) {
  if (definition.label.length > MAX_LABEL_LENGTH) {
    throw new Error(`Preset label "${definition.label}" exceeds max length of ${MAX_LABEL_LENGTH}`);
  }
  return normaliseButton({
    ...definition,
    meta: { source: 'preset', version: 1 },
    scope: {
      apps: definition.scope?.apps || APP_IDS,
      platforms: definition.scope?.platforms || PLATFORM_IDS
    }
  }, definition.scope?.apps?.[0] || APP_IDS[0]);
}

// Standard Cmd (Mac) / Ctrl (Win) combo applied uniformly across given apps
function cmdCtrl(key, apps) {
  return apps.reduce((m, id) => {
    m[id] = {
      mac: { steps: [{ type: 'keyCombo', keys: ['Command', key] }] },
      win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', key] }] }
    };
    return m;
  }, {});
}

// Different mac/win key arrays, applied uniformly across given apps
function perPlatform(macKeys, winKeys, apps) {
  return apps.reduce((m, id) => {
    m[id] = {
      mac: { steps: [{ type: 'keyCombo', keys: macKeys }] },
      win: { steps: [{ type: 'keyCombo', keys: winKeys }] }
    };
    return m;
  }, {});
}

const TEXT_APPS  = ['word', 'powerpoint', 'docs', 'slides'];
const SHEET_APPS = ['excel', 'sheets'];
const PRESO_APPS = ['powerpoint', 'slides'];
const REVIEW_APPS = ['word', 'docs', 'slides', 'sheets'];

export const PRESETS = [

  // ── Formatting ─────────────────────────────────────────────────────────────
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

  // ── Editing ────────────────────────────────────────────────────────────────
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

  // ── Navigation ─────────────────────────────────────────────────────────────
  preset({
    id: 'find',
    label: 'Find',
    iconId: 'search',
    category: 'navigation',
    actionType: 'single',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('F', APP_IDS)
  }),

  // ── Insert ─────────────────────────────────────────────────────────────────
  preset({
    id: 'insert-link',
    label: 'Insert Link',
    iconId: 'link',
    category: 'insert',
    actionType: 'single',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('K', TEXT_APPS)
  }),

  // ── Review ─────────────────────────────────────────────────────────────────
  preset({
    id: 'comment',
    label: 'Comment',
    iconId: 'comment',
    category: 'review',
    actionType: 'single',
    scope: { apps: REVIEW_APPS, platforms: ['mac', 'win'] },
    mappings: {
      word:   { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'A'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }] } },
      docs:   { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Option', 'M'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'Alt', 'M'] }] } },
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
  }),

  // ── Spreadsheet ────────────────────────────────────────────────────────────
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
  }),

  // ── Presentation ───────────────────────────────────────────────────────────
  preset({
    id: 'new-slide',
    label: 'New Slide',
    iconId: 'plus',
    category: 'presentation',
    actionType: 'single',
    scope: { apps: PRESO_APPS, platforms: ['mac', 'win'] },
    mappings: {
      powerpoint: { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'N'] }] }, win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }] } },
      slides:     { mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'M'] }] },           win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }] } }
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
  }),
  preset({
    id: 'apply-link',
    label: 'Apply Link',
    iconId: 'link',
    category: 'insert',
    actionType: 'sequence',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: {
      word: {
        mac: {
          steps: [
            { type: 'keyCombo', keys: ['Command', 'K'] },
            { type: 'delay', durationMs: 500 },
            { type: 'text', value: 'https://www.sofascore.com/' },
            { type: 'delay', durationMs: 150 },
            { type: 'keyCombo', keys: ['Command', 'Enter'] }
          ]
        },
        win: {
          steps: [
            { type: 'keyCombo', keys: ['Ctrl', 'K'] },
            { type: 'delay', durationMs: 500 },
            { type: 'text', value: 'https://www.sofascore.com/' },
            { type: 'delay', durationMs: 150 },
            { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }
          ]
        }
      },
      powerpoint: {
        mac: {
          steps: [
            { type: 'keyCombo', keys: ['Command', 'K'] },
            { type: 'delay', durationMs: 500 },
            { type: 'text', value: 'https://www.sofascore.com/'},
            { type: 'delay', durationMs: 150 },
            { type: 'keyCombo', keys: ['Command', 'Enter'] }
          ]
        },
        win: {
          steps: [
            { type: 'keyCombo', keys: ['Ctrl', 'K'] },
            { type: 'delay', durationMs: 500 },
            { type: 'text', value: 'https://www.sofascore.com/' },
            { type: 'delay', durationMs: 150 },
            { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }
          ]
        }
      },
      docs: {
        mac: {
          steps: [
            { type: 'keyCombo', keys: ['Command', 'K'] },
            { type: 'delay', durationMs: 500 },
            { type: 'text', value: 'https://www.sofascore.com/' },
            { type: 'delay', durationMs: 150 },
            { type: 'keyCombo', keys: ['Command', 'Enter'] }
          ]
        },
        win: {
          steps: [
            { type: 'keyCombo', keys: ['Ctrl', 'K'] },
            { type: 'delay', durationMs: 500 },
            { type: 'text', value: 'https://www.sofascore.com/' },
            { type: 'delay', durationMs: 150 },
            { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }
          ]
        }
      },
      slides: {
        mac: {
          steps: [
            { type: 'keyCombo', keys: ['Command', 'K'] },
            { type: 'delay', durationMs: 500 },
            { type: 'text', value: 'https://www.sofascore.com/' },
            { type: 'delay', durationMs: 150 },
            { type: 'keyCombo', keys: ['Command', 'Enter'] }
          ]
        },
        win: {
          steps: [
            { type: 'keyCombo', keys: ['Ctrl', 'K'] },
            { type: 'delay', durationMs: 500 },
            { type: 'text', value: 'https://www.sofascore.com/' },
            { type: 'delay', durationMs: 150 },
            { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }
          ]
        }
      }
    }
  }),
  preset({
    id: 'source-link',
    label: 'Source Link',
    iconId: 'link',
    category: 'insert',
    actionType: 'sequence',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: {
      word: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://source.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Command', 'Enter'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://source.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }] }
      },
      powerpoint: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://source.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Command', 'Enter'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://source.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }] }
      },
      docs: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://source.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Command', 'Enter'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://source.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://source.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Command', 'Enter'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://source.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }] }
      }
    }
  }),
  preset({
    id: 'ref-link',
    label: 'Ref Link',
    iconId: 'link',
    category: 'insert',
    actionType: 'sequence',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: {
      word: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://ref.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Command', 'Enter'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://ref.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }] }
      },
      powerpoint: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://ref.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Command', 'Enter'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://ref.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }] }
      },
      docs: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://ref.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Command', 'Enter'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://ref.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://ref.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Command', 'Enter'] }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'K'] }, { type: 'delay', durationMs: 500 }, { type: 'text', value: 'https://ref.example/' }, { type: 'delay', durationMs: 150 }, { type: 'keyCombo', keys: ['Ctrl', 'Enter'] }] }
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
    mappings: APP_IDS.reduce((m, appId) => {
      m[appId] = {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'TODO' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'TODO' }] }
      };
      return m;
    }, {})
  }),
  preset({
    id: 'find-tbc',
    label: 'Find TBC',
    iconId: 'search',
    category: 'navigation',
    actionType: 'sequence',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: APP_IDS.reduce((m, appId) => {
      m[appId] = {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'TBC' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'TBC' }] }
      };
      return m;
    }, {})
  }),
  preset({
    id: 'find-fixme',
    label: 'Find FIXME',
    iconId: 'search',
    category: 'navigation',
    actionType: 'sequence',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: APP_IDS.reduce((m, appId) => {
      m[appId] = {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'FIXME' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'FIXME' }] }
      };
      return m;
    }, {})
  }),
  preset({
    id: 'find-draft',
    label: 'Find Draft',
    iconId: 'search',
    category: 'navigation',
    actionType: 'sequence',
    scope: { apps: APP_IDS, platforms: ['mac', 'win'] },
    mappings: APP_IDS.reduce((m, appId) => {
      m[appId] = {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'draft' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'F'] }, { type: 'delay', durationMs: 300 }, { type: 'text', value: 'draft' }] }
      };
      return m;
    }, {})
  }),
  preset({
    id: 'slide-title',
    label: 'Slide Title',
    iconId: 'plus',
    category: 'presentation',
    actionType: 'sequence',
    scope: { apps: PRESO_APPS, platforms: ['mac', 'win'] },
    mappings: {
      powerpoint: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'N'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Title' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Title' }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Title' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Title' }] }
      }
    }
  }),
  preset({
    id: 'slide-agenda',
    label: 'Slide Agenda',
    iconId: 'plus',
    category: 'presentation',
    actionType: 'sequence',
    scope: { apps: PRESO_APPS, platforms: ['mac', 'win'] },
    mappings: {
      powerpoint: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'N'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Agenda' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Agenda' }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Agenda' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Agenda' }] }
      }
    }
  }),
  preset({
    id: 'slide-summary',
    label: 'Slide Summary',
    iconId: 'plus',
    category: 'presentation',
    actionType: 'sequence',
    scope: { apps: PRESO_APPS, platforms: ['mac', 'win'] },
    mappings: {
      powerpoint: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'Shift', 'N'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Summary' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Summary' }] }
      },
      slides: {
        mac: { steps: [{ type: 'keyCombo', keys: ['Command', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Summary' }] },
        win: { steps: [{ type: 'keyCombo', keys: ['Ctrl', 'M'] }, { type: 'delay', durationMs: 250 }, { type: 'text', value: 'Summary' }] }
      }
    }
  })

];
