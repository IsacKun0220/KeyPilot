import '../../shared/runtime-core.js';
import { APP_IDS, PLATFORM_IDS } from '../../shared/app-meta.js';
import { SLOT_LIMIT } from '../constants.js';
import { createStep } from '../../shared/action-schema.js';
import { BUTTON_ACTION_TYPES, BUTTON_CATEGORIES, BUTTON_SCHEMA_VERSION, clampButtonScope, createEmptyButton } from '../../shared/button-schema.js';
import { inferIconId } from '../../shared/icons/index.js';
import { createId, createSlug } from '../utils/ids.js';
import { deepClone } from '../utils/clone.js';

const { createButtonNormaliser, shortcutStringToSteps } = globalThis.KeyPilotCore;

const { normaliseStep, normaliseButton, normaliseButtons, normaliseLibraryButtons } = createButtonNormaliser({
  appIds: APP_IDS,
  platformIds: PLATFORM_IDS,
  buttonCategories: BUTTON_CATEGORIES,
  buttonActionTypes: BUTTON_ACTION_TYPES,
  buttonSchemaVersion: BUTTON_SCHEMA_VERSION,
  createEmptyButton,
  createFallbackStep: createStep,
  cloneValue: deepClone,
  inferIconId,
  createId,
  createSlug,
  resolveScope: ({ button, appHint }) => {
    const scope = clampButtonScope(button.scope || {
      apps: appHint ? [appHint] : APP_IDS.filter((appId) => button.mappings?.[appId]),
      platforms: PLATFORM_IDS.filter((platform) => {
        if (button.mappings?.[appHint]?.[platform]) return true;
        if (typeof button.mappings?.[platform] === 'string') return true;
        if (button.mappings?.[appHint]?.[platform]?.steps) return true;
        return false;
      })
    });

    return {
      apps: scope.apps.length ? scope.apps : [appHint || APP_IDS[0]],
      platforms: scope.platforms.length ? scope.platforms : [...PLATFORM_IDS]
    };
  }
});

export { normaliseStep, normaliseButton, shortcutStringToSteps };
export { normaliseButtons, normaliseLibraryButtons };

export function normaliseSlotButtons(buttons = [], appId) {
  const entries = normaliseButtons(buttons, appId);
  return Array.from({ length: SLOT_LIMIT }, (_, index) => entries[index] || null);
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
        sets: [{ id: 'set-1', name: 'Main', buttons: normaliseSlotButtons([], appId) }],
        customButtons: []
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
      customButtons: normaliseLibraryButtons(app.customButtons, appId),
      sets: (Array.isArray(app.sets) && app.sets.length ? app.sets : [{ id: 'set-1', name: 'Main', buttons: normaliseSlotButtons([], appId) }])
        .slice(0, 5)
        .map((set, index) => ({
          id: typeof set?.id === 'string' && set.id ? set.id : `set-${index + 1}`,
          name: typeof set?.name === 'string' && set.name.trim() ? set.name.trim() : `Set ${index + 1}`,
          buttons: normaliseSlotButtons(set?.buttons, appId)
        }))
    };
  });

  return base;
}
