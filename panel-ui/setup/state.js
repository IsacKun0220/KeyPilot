import { APP_IDS } from '../shared/app-meta.js';
import { createDefaultSingleButton } from './schema.js';

export const state = {
  config: null,
  pairing: null,
  os: detectOS(),
  activeProfile: 'default',
  activeApp: APP_IDS[0],
  activeSetIndex: 0,
  activeSetByApp: {},
  editingSetIndex: null,
  editingSetDraft: '',
  manualAppSelectionUntil: 0,
  dirty: false,
  saveState: 'idle',
  libraryFilters: {
    query: '',
    category: 'all',
    source: 'all',
    openDropdown: null
  },
  editor: {
    open: false,
    mode: 'create',
    currentStep: 0,
    targetSlot: 0,
    draft: createDefaultSingleButton(),
    selectedApp: APP_IDS[0],
    selectedPlatform: 'mac',
    validationMessage: '',
    initialSnapshot: '',
    presetPickerOpen: false,
    recordingTarget: null,
    recordingKeys: [],
    recordingPreviewKeys: [],
    recordingHeldKeys: {},
    comboDraftTarget: null,
    comboDraftKeys: [],
    openDropdown: null,
    blockEditor: {
      expandedCategory: '',
      collapsedCategories: {},
      delayUnits: {}
    },
    iconManuallySelected: false,
    lastAutoSuggestedIconId: null,
    iconBrowser: {
      open: false,
      query: '',
      category: 'all',
      pendingIconId: null
    }
  },
  connectionState: {
    connected: false,
    lastSeenAt: null
  }
};

function detectOS() {
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  return /win/i.test(platform) ? 'win' : 'mac';
}
