import { APP_IDS, PLATFORM_IDS } from './app-meta.js';

export const BUTTON_SCHEMA_VERSION = 1;
export const BUTTON_ACTION_TYPES = ['single', 'sequence'];
export const BUTTON_CATEGORIES = ['editing', 'formatting', 'navigation', 'review', 'insert', 'presentation', 'general'];

export function createEmptyPlatformMapping() {
  return { steps: [] };
}

export function createEmptyButton() {
  return {
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
      version: BUTTON_SCHEMA_VERSION
    }
  };
}

export function clampButtonScope(scope = {}) {
  const apps = Array.isArray(scope.apps) ? scope.apps.filter((appId) => APP_IDS.includes(appId)) : [];
  const platforms = Array.isArray(scope.platforms) ? scope.platforms.filter((platform) => PLATFORM_IDS.includes(platform)) : [...PLATFORM_IDS];
  return {
    apps,
    platforms: platforms.length ? platforms : [...PLATFORM_IDS]
  };
}

