import { APP_IDS, PLATFORM_IDS } from '../../shared/app-meta.js';
import { createStep } from '../../shared/action-schema.js';
import { BUTTON_ACTION_TYPES, BUTTON_CATEGORIES, BUTTON_SCHEMA_VERSION, clampButtonScope, createEmptyButton } from '../../shared/button-schema.js';
import { inferIconId } from '../../shared/icons/index.js';
import { createId, createSlug } from '../utils/ids.js';
import { deepClone } from '../utils/clone.js';

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

export function shortcutStringToSteps(shortcut, platform = 'mac') {
  const parts = String(shortcut || '').split('+').map((part) => normaliseKeyToken(part, platform)).filter(Boolean);
  if (!parts.length) {
    return [];
  }
  return [{ type: 'keyCombo', keys: parts }];
}

function normaliseModifierList(modifiers = [], platform = 'mac') {
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

function normaliseKeyPressStep(step = {}, platform = 'mac') {
  const rawKey = String(step.key || '').trim();
  const parts = rawKey.includes('+')
    ? rawKey.split('+').map((token) => normaliseKeyToken(token, platform)).filter(Boolean)
    : [];
  const explicitModifiers = normaliseModifierList(step.modifiers, platform);
  const inferredModifiers = parts.slice(0, -1);
  const key = normaliseKeyToken(parts.at(-1) || rawKey, platform);

  return {
    type: 'keyPress',
    key,
    modifiers: normaliseModifierList([...explicitModifiers, ...inferredModifiers], platform)
  };
}

function normalisePlatformMapping(rawPlatformMapping, platform) {
  if (!rawPlatformMapping) {
    return { steps: [] };
  }
  if (Array.isArray(rawPlatformMapping.steps)) {
    return {
      steps: rawPlatformMapping.steps.map((step) => normaliseStep(step, platform))
    };
  }
  if (typeof rawPlatformMapping === 'string') {
    return { steps: shortcutStringToSteps(rawPlatformMapping, platform) };
  }
  return { steps: [] };
}

export function normaliseStep(step = {}, platform = 'mac') {
  if (typeof step === 'string') {
    return shortcutStringToSteps(step, platform)[0] || createStep('keyCombo');
  }

  if (step.type === 'keyCombo') {
    return {
      type: 'keyCombo',
      keys: Array.isArray(step.keys) ? step.keys.map((key) => normaliseKeyToken(key, platform)).filter(Boolean) : []
    };
  }

  if (step.type === 'keyPress') {
    return normaliseKeyPressStep(step, platform);
  }

  if (step.type === 'text') {
    return {
      type: 'text',
      value: String(step.value || '')
    };
  }

  if (step.type === 'delay') {
    return {
      type: 'delay',
      durationMs: Number(step.durationMs) || 150
    };
  }

  if (step.type === 'repeatKeyPress') {
    return {
      type: 'repeatKeyPress',
      key: normaliseKeyToken(step.key, platform),
      count: Number(step.count) || 1
    };
  }

  return createStep('keyCombo');
}

export function normaliseButton(rawButton = {}, appHint) {
  const base = createEmptyButton();
  const button = deepClone(rawButton);
  const iconId = inferIconId(button);

  const scope = clampButtonScope(button.scope || {
    apps: appHint ? [appHint] : APP_IDS.filter((appId) => button.mappings?.[appId]),
    platforms: PLATFORM_IDS.filter((platform) => {
      if (button.mappings?.[appHint]?.[platform]) return true;
      if (typeof button.mappings?.[platform] === 'string') return true;
      if (button.mappings?.[appHint]?.[platform]?.steps) return true;
      return false;
    })
  });

  const resolvedScope = {
    apps: scope.apps.length ? scope.apps : [appHint || APP_IDS[0]],
    platforms: scope.platforms.length ? scope.platforms : [...PLATFORM_IDS]
  };

  const mappings = {};
  resolvedScope.apps.forEach((appId) => {
    mappings[appId] = {};
    resolvedScope.platforms.forEach((platform) => {
      const appMappings = button.mappings?.[appId];
      const directLegacy = button.mappings?.[platform];
      const legacyShortcut = platform === 'mac' ? button.shortcut : button.shortcutWin;
      mappings[appId][platform] = normalisePlatformMapping(
        appMappings?.[platform] || directLegacy || legacyShortcut,
        platform
      );
    });
  });

  const actionType = BUTTON_ACTION_TYPES.includes(button.actionType)
    ? button.actionType
    : Object.values(mappings).some((appMapping) =>
        Object.values(appMapping).some((platformMapping) => (platformMapping.steps || []).length > 1)
      )
      ? 'sequence'
      : 'single';

  return {
    ...base,
    id: typeof button.id === 'string' && button.id.trim() ? button.id.trim() : createSlug(button.label || '') || createId('btn'),
    label: typeof button.label === 'string' ? button.label.trim() : '',
    iconId,
    category: BUTTON_CATEGORIES.includes(button.category) ? button.category : 'general',
    actionType,
    scope: resolvedScope,
    mappings,
    meta: {
      source: button.meta?.source === 'preset' ? 'preset' : (button.meta?.source === 'custom' ? 'custom' : 'custom'),
      version: BUTTON_SCHEMA_VERSION
    }
  };
}

export function normaliseButtons(buttons = [], appId) {
  return (Array.isArray(buttons) ? buttons : []).slice(0, 5).map((button) => (button ? normaliseButton(button, appId) : null));
}

export function createDefaultConfigShape() {
  return {
    activeProfile: 'default',
    activeApp: APP_IDS[0],
    autoSwitchEnabled: true,
    apps: APP_IDS.reduce((apps, appId) => {
      apps[appId] = {
        id: appId,
        name: appId,
        group: '',
        sets: [{ id: 'set-1', name: 'Main', buttons: [] }]
      };
      return apps;
    }, {})
  };
}

export function normaliseConfig(config = {}) {
  const base = createDefaultConfigShape();
  base.activeApp = APP_IDS.includes(config.activeApp) ? config.activeApp : base.activeApp;
  base.autoSwitchEnabled = typeof config.autoSwitchEnabled === 'boolean' ? config.autoSwitchEnabled : true;
  base.activeProfile = typeof config.activeProfile === 'string' ? config.activeProfile : 'default';

  APP_IDS.forEach((appId) => {
    const app = config.apps?.[appId] || {};
    base.apps[appId] = {
      id: appId,
      name: app.name || appId,
      group: app.group || '',
      sets: (Array.isArray(app.sets) && app.sets.length ? app.sets : [{ id: 'set-1', name: 'Main', buttons: [] }])
        .slice(0, 5)
        .map((set, index) => ({
          id: typeof set?.id === 'string' && set.id ? set.id : `set-${index + 1}`,
          name: typeof set?.name === 'string' && set.name.trim() ? set.name.trim() : `Set ${index + 1}`,
          buttons: normaliseButtons(set?.buttons, appId)
        }))
    };
  });

  return base;
}
