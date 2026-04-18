import { APP_IDS, PLATFORM_IDS } from '../../shared/app-meta.js';
import { normaliseButton } from '../services/normalise.js';

function normaliseSequenceMappings(mappings = {}, appIds = APP_IDS, platforms = PLATFORM_IDS) {
  return appIds.reduce((nextMappings, appId) => {
    const appMappings = mappings[appId];
    if (!appMappings) {
      return nextMappings;
    }

    nextMappings[appId] = platforms.reduce((nextPlatforms, platform) => {
      const platformMapping = appMappings[platform];
      if (!platformMapping) {
        return nextPlatforms;
      }

      nextPlatforms[platform] = Array.isArray(platformMapping)
        ? { steps: platformMapping }
        : platformMapping;
      return nextPlatforms;
    }, {});

    return nextMappings;
  }, {});
}

export function sequencePreset(definition) {
  const scopeApps = definition.scope?.apps || definition.appIds || APP_IDS;
  const scopePlatforms = definition.scope?.platforms || definition.platforms || PLATFORM_IDS;

  const preset = normaliseButton({
    ...definition,
    actionType: 'sequence',
    meta: { source: 'preset', version: 1, ...definition.meta },
    scope: {
      apps: scopeApps,
      platforms: scopePlatforms
    },
    mappings: normaliseSequenceMappings(definition.mappings, scopeApps, scopePlatforms)
  }, scopeApps[0] || APP_IDS[0]);

  // Preserve legacy aliases while consumers finish moving to the shared preset shape.
  preset.appIds = [...preset.scope.apps];
  preset.platforms = [...preset.scope.platforms];

  return preset;
}
