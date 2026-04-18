const { createButtonNormaliser, createId, createSlug, resolveButtonSteps } = require('../panel-ui/shared/runtime-core.js');

const APP_IDS = ['word', 'excel', 'powerpoint', 'docs', 'sheets', 'slides'];
const PLATFORM_IDS = ['mac', 'win'];
const BUTTON_CATEGORIES = ['editing', 'formatting', 'navigation', 'review', 'insert', 'presentation', 'general'];

const APP_META = {
  word: { id: 'word', name: 'Word', group: 'Microsoft' },
  excel: { id: 'excel', name: 'Excel', group: 'Microsoft' },
  powerpoint: { id: 'powerpoint', name: 'PowerPoint', group: 'Microsoft' },
  docs: { id: 'docs', name: 'Google Docs', group: 'Google' },
  sheets: { id: 'sheets', name: 'Google Sheets', group: 'Google' },
  slides: { id: 'slides', name: 'Google Slides', group: 'Google' }
};

const { normaliseButton } = createButtonNormaliser({
  appIds: APP_IDS,
  platformIds: PLATFORM_IDS,
  buttonCategories: BUTTON_CATEGORIES,
  buttonSchemaVersion: 1,
  invalidStepMode: 'null',
  resolveScope: ({ button, appHint }) => {
    const scopeApps = Array.isArray(button.scope?.apps) && button.scope.apps.length
      ? button.scope.apps.filter((appId) => APP_IDS.includes(appId))
      : [appHint];
    const scopePlatforms = Array.isArray(button.scope?.platforms) && button.scope.platforms.length
      ? button.scope.platforms.filter((platform) => PLATFORM_IDS.includes(platform))
      : [...PLATFORM_IDS];
    return {
      apps: scopeApps,
      platforms: scopePlatforms
    };
  },
  createEmptyButton: () => ({
    id: '',
    label: '',
    iconId: 'wand-sparkles',
    category: 'general',
    actionType: 'single',
    scope: {
      apps: [],
      platforms: [...PLATFORM_IDS]
    },
    mappings: {},
    meta: {
      source: 'custom',
      version: 1
    }
  }),
  createId,
  createSlug
});

function createDefaultConfig() {
  const config = {
    activeProfile: 'default',
    activeApp: 'word',
    autoSwitchEnabled: true,
    apps: {}
  };

  APP_IDS.forEach((appId) => {
    const meta = APP_META[appId];
    config.apps[appId] = {
      id: meta.id,
      name: meta.name,
      group: meta.group,
      customButtons: [],
      sets: [{ id: 'set-1', name: 'Main', buttons: [] }]
    };
  });

  return config;
}

function ensureConfigShape(input) {
  const base = createDefaultConfig();
  const config = input && typeof input === 'object' ? input : {};

  base.activeApp = APP_IDS.includes(config.activeApp) ? config.activeApp : base.activeApp;
  base.activeProfile = typeof config.activeProfile === 'string' ? config.activeProfile : 'default';
  base.autoSwitchEnabled = typeof config.autoSwitchEnabled === 'boolean' ? config.autoSwitchEnabled : true;

  APP_IDS.forEach((appId) => {
    const meta = APP_META[appId];
    const sourceApp = config.apps?.[appId] || {};
    const sourceSets = Array.isArray(sourceApp.sets) && sourceApp.sets.length ? sourceApp.sets : base.apps[appId].sets;
    base.apps[appId] = {
      id: meta.id,
      name: meta.name,
      group: meta.group,
      customButtons: (Array.isArray(sourceApp.customButtons) ? sourceApp.customButtons : []).map((button) => normaliseButton(button, appId)),
      sets: sourceSets.slice(0, 5).map((set, index) => ({
        id: typeof set?.id === 'string' && set.id ? set.id : `set-${index + 1}`,
        name: typeof set?.name === 'string' && set.name.trim() ? set.name.trim() : `Set ${index + 1}`,
        buttons: (Array.isArray(set?.buttons) ? set.buttons : []).slice(0, 5).map((button) => (button ? normaliseButton(button, appId) : null))
      }))
    };
  });

  return base;
}

function findButtonById(config, appId, buttonId) {
  const sets = config.apps?.[appId]?.sets || [];
  for (const set of sets) {
    const match = (set.buttons || []).find((button) => button?.id === buttonId);
    if (match) return match;
  }
  return null;
}

module.exports = {
  APP_IDS,
  APP_META,
  ensureConfigShape,
  findButtonById,
  resolveButtonSteps
};
