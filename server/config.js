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

function createId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSlug(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normaliseKeyToken(token, platform = 'mac') {
  const key = String(token || '').trim();
  const map = {
    command: 'Command',
    cmd: 'Command',
    option: 'Option',
    alt: platform === 'mac' ? 'Option' : 'Alt',
    shift: 'Shift',
    control: platform === 'mac' ? 'Control' : 'Ctrl',
    ctrl: 'Ctrl',
    return: 'Enter',
    esc: 'Escape',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
    spacebar: 'Space'
  };
  return map[key.toLowerCase()] || key;
}

function shortcutStringToSteps(shortcut, platform) {
  const keys = String(shortcut || '').split('+').map((part) => normaliseKeyToken(part, platform)).filter(Boolean);
  return keys.length ? [{ type: 'keyCombo', keys }] : [];
}

function normaliseModifierList(modifiers, platform) {
  const seen = new Set();
  return (Array.isArray(modifiers) ? modifiers : [])
    .map((token) => normaliseKeyToken(token, platform))
    .filter((token) => ['Command', 'Win', 'Control', 'Ctrl', 'Option', 'Alt', 'Shift'].includes(token))
    .filter((token) => {
      if (seen.has(token)) return false;
      seen.add(token);
      return true;
    });
}

function normaliseKeyPressStep(step, platform) {
  const rawKey = String(step.key || '').trim();
  const parts = rawKey.includes('+')
    ? rawKey.split('+').map((token) => normaliseKeyToken(token, platform)).filter(Boolean)
    : [];
  const explicitModifiers = normaliseModifierList(step.modifiers, platform);
  const inferredModifiers = parts.slice(0, -1);
  return {
    type: 'keyPress',
    key: normaliseKeyToken(parts.at(-1) || rawKey, platform),
    modifiers: normaliseModifierList([...explicitModifiers, ...inferredModifiers], platform)
  };
}

function normaliseStep(step, platform) {
  if (!step || typeof step !== 'object') return null;
  if (step.type === 'keyCombo') return { type: 'keyCombo', keys: Array.isArray(step.keys) ? step.keys.map((key) => normaliseKeyToken(key, platform)).filter(Boolean) : [] };
  if (step.type === 'keyPress') return normaliseKeyPressStep(step, platform);
  if (step.type === 'text') return { type: 'text', value: String(step.value || '') };
  if (step.type === 'delay') return { type: 'delay', durationMs: Number(step.durationMs) || 150 };
  if (step.type === 'repeatKeyPress') return { type: 'repeatKeyPress', key: normaliseKeyToken(step.key, platform), count: Number(step.count) || 1 };
  return null;
}

function normalisePlatformMapping(rawPlatformMapping, platform) {
  if (!rawPlatformMapping) return { steps: [] };
  if (typeof rawPlatformMapping === 'string') return { steps: shortcutStringToSteps(rawPlatformMapping, platform) };
  if (Array.isArray(rawPlatformMapping.steps)) return { steps: rawPlatformMapping.steps.map((step) => normaliseStep(step, platform)).filter(Boolean) };
  return { steps: [] };
}

function normaliseButton(button = {}, appHint) {
  const scopeApps = Array.isArray(button.scope?.apps) && button.scope.apps.length
    ? button.scope.apps.filter((appId) => APP_IDS.includes(appId))
    : [appHint];
  const scopePlatforms = Array.isArray(button.scope?.platforms) && button.scope.platforms.length
    ? button.scope.platforms.filter((platform) => PLATFORM_IDS.includes(platform))
    : [...PLATFORM_IDS];

  const mappings = {};
  scopeApps.forEach((appId) => {
    mappings[appId] = {};
    scopePlatforms.forEach((platform) => {
      mappings[appId][platform] = normalisePlatformMapping(
        button.mappings?.[appId]?.[platform]
          || button.mappings?.[platform]
          || (platform === 'mac' ? button.shortcut : button.shortcutWin),
        platform
      );
    });
  });

  const isSequence = Object.values(mappings).some((appMapping) =>
    Object.values(appMapping).some((platformMapping) => (platformMapping.steps || []).length > 1)
  );

  const iconId = typeof button.iconId === 'string' && button.iconId
    ? button.iconId
    : 'wand-sparkles';

  return {
    id: typeof button.id === 'string' && button.id.trim() ? button.id.trim() : createSlug(button.label || '') || createId('btn'),
    label: typeof button.label === 'string' ? button.label.trim() : '',
    iconId,
    category: BUTTON_CATEGORIES.includes(button.category) ? button.category : 'general',
    actionType: button.actionType === 'sequence' || (button.actionType !== 'single' && isSequence) ? 'sequence' : 'single',
    scope: {
      apps: scopeApps,
      platforms: scopePlatforms
    },
    mappings,
    meta: {
      source: button.meta?.source === 'preset' ? 'preset' : 'custom',
      version: 1
    }
  };
}

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

function resolveButtonSteps(button, appId, platform) {
  if (!button) return [];
  return button.mappings?.[appId]?.[platform]?.steps
    || button.mappings?.[appId]?.[platform === 'mac' ? 'win' : 'mac']?.steps
    || [];
}

module.exports = {
  APP_IDS,
  APP_META,
  ensureConfigShape,
  findButtonById,
  resolveButtonSteps
};
