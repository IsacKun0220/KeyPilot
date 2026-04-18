(function attachKeyPilotCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.KeyPilotCore = Object.assign(root.KeyPilotCore || {}, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createKeyPilotCore() {
  const MODIFIER_TOKENS = ['Command', 'Win', 'Control', 'Ctrl', 'Option', 'Alt', 'Shift'];

  function createId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function createSlug(value = '', maxLength = Infinity) {
    const slug = String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return Number.isFinite(maxLength) ? slug.slice(0, maxLength) : slug;
  }

  function isModifierToken(token) {
    return MODIFIER_TOKENS.includes(token);
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

  function shortcutStringToSteps(shortcut, platform = 'mac') {
    const keys = String(shortcut || '')
      .split('+')
      .map((part) => normaliseKeyToken(part, platform))
      .filter(Boolean);
    return keys.length ? [{ type: 'keyCombo', keys }] : [];
  }

  function normaliseModifierList(modifiers = [], platform = 'mac') {
    const seen = new Set();
    return (Array.isArray(modifiers) ? modifiers : [])
      .map((token) => normaliseKeyToken(token, platform))
      .filter((token) => MODIFIER_TOKENS.includes(token))
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
    return {
      type: 'keyPress',
      key: normaliseKeyToken(parts.at(-1) || rawKey, platform),
      modifiers: normaliseModifierList([...explicitModifiers, ...inferredModifiers], platform)
    };
  }

  function resolveButtonSteps(button, appId, platform) {
    if (!button) return [];
    return button.mappings?.[appId]?.[platform]?.steps
      || button.mappings?.[appId]?.[platform === 'mac' ? 'win' : 'mac']?.steps
      || [];
  }

  function createButtonNormaliser(options = {}) {
    const {
      appIds = [],
      platformIds = [],
      buttonCategories = [],
      buttonActionTypes = ['single', 'sequence'],
      defaultIconId = 'wand-sparkles',
      buttonSchemaVersion = 1,
      createEmptyButton = () => ({
        id: '',
        label: '',
        iconId: defaultIconId,
        category: 'general',
        actionType: 'single',
        scope: {
          apps: [],
          platforms: [...platformIds]
        },
        mappings: {},
        meta: {
          source: 'custom',
          version: buttonSchemaVersion
        }
      }),
      createFallbackStep = null,
      cloneValue = (value) => value,
      inferIconId = null,
      createId: buildId = createId,
      createSlug: buildSlug = createSlug,
      resolveScope = ({ appHint }) => ({
        apps: appHint ? [appHint] : [appIds[0]],
        platforms: [...platformIds]
      }),
      invalidStepMode = 'fallback'
    } = options;

    function normaliseStep(step = {}, platform = 'mac') {
      if (typeof step === 'string') {
        const shortcutStep = shortcutStringToSteps(step, platform)[0];
        if (shortcutStep) return shortcutStep;
        return typeof createFallbackStep === 'function' ? createFallbackStep('keyCombo') : null;
      }

      if (!step || typeof step !== 'object') {
        return invalidStepMode === 'null'
          ? null
          : (typeof createFallbackStep === 'function' ? createFallbackStep('keyCombo') : null);
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
        return { type: 'text', value: String(step.value || '') };
      }

      if (step.type === 'delay') {
        return { type: 'delay', durationMs: Number(step.durationMs) || 150 };
      }

      if (step.type === 'repeatKeyPress') {
        return {
          type: 'repeatKeyPress',
          key: normaliseKeyToken(step.key, platform),
          count: Number(step.count) || 1
        };
      }

      return invalidStepMode === 'null'
        ? null
        : (typeof createFallbackStep === 'function' ? createFallbackStep('keyCombo') : null);
    }

    function normalisePlatformMapping(rawPlatformMapping, platform) {
      if (!rawPlatformMapping) {
        return { steps: [] };
      }
      if (Array.isArray(rawPlatformMapping.steps)) {
        const steps = rawPlatformMapping.steps
          .map((step) => normaliseStep(step, platform));
        return {
          steps: invalidStepMode === 'null' ? steps.filter(Boolean) : steps
        };
      }
      if (typeof rawPlatformMapping === 'string') {
        return { steps: shortcutStringToSteps(rawPlatformMapping, platform) };
      }
      return { steps: [] };
    }

    function normaliseButton(rawButton = {}, appHint) {
      const base = createEmptyButton();
      const button = cloneValue(rawButton);
      const scope = resolveScope({ button, appHint, appIds, platformIds });
      const resolvedScope = {
        apps: Array.isArray(scope?.apps) && scope.apps.length ? scope.apps : [appHint || appIds[0]],
        platforms: Array.isArray(scope?.platforms) && scope.platforms.length ? scope.platforms : [...platformIds]
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

      const actionType = buttonActionTypes.includes(button.actionType)
        ? button.actionType
        : Object.values(mappings).some((appMapping) =>
            Object.values(appMapping).some((platformMapping) => (platformMapping.steps || []).length > 1)
          )
          ? 'sequence'
          : 'single';

      const iconId = typeof inferIconId === 'function'
        ? inferIconId(button)
        : (typeof button.iconId === 'string' && button.iconId ? button.iconId : defaultIconId);

      return {
        ...base,
        id: typeof button.id === 'string' && button.id.trim() ? button.id.trim() : buildSlug(button.label || '') || buildId('btn'),
        label: typeof button.label === 'string' ? button.label.trim() : '',
        iconId: iconId || defaultIconId,
        category: buttonCategories.includes(button.category) ? button.category : 'general',
        actionType,
        scope: resolvedScope,
        mappings,
        meta: {
          source: button.meta?.source === 'preset' ? 'preset' : 'custom',
          version: buttonSchemaVersion
        }
      };
    }

    function normaliseButtons(buttons = [], appId, limit = 5) {
      return (Array.isArray(buttons) ? buttons : [])
        .slice(0, limit)
        .map((button) => (button ? normaliseButton(button, appId) : null));
    }

    function normaliseLibraryButtons(buttons = [], appId) {
      return (Array.isArray(buttons) ? buttons : [])
        .map((button) => normaliseButton(button, appId))
        .filter(Boolean);
    }

    return {
      normaliseStep,
      normalisePlatformMapping,
      normaliseButton,
      normaliseButtons,
      normaliseLibraryButtons
    };
  }

  return {
    MODIFIER_TOKENS,
    createButtonNormaliser,
    createId,
    createSlug,
    isModifierToken,
    normaliseKeyPressStep,
    normaliseKeyToken,
    normaliseModifierList,
    resolveButtonSteps,
    shortcutStringToSteps
  };
});
