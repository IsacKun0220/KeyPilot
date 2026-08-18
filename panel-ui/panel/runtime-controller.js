import { getJson } from '../shared/http.js';
import { normaliseConfig } from '../setup/services/normalise.js';

export function mapPlatform(platform) {
  return platform === 'win32' ? 'win' : 'mac';
}

export function createPanelRuntimeController({ els, panelState, renderPanel, bindEvents }) {
  let statePollTimer = null;
  let knownConfigVersion = -1;

  async function loadRuntime() {
    const isFirstLoad = panelState.config === null;
    const previousConfigVersion = knownConfigVersion;
    const previousActiveApp = panelState.activeApp;
    const [{ config, configVersion }, { platform }, runtimeState] = await Promise.all([
      getJson('/api/config'),
      getJson('/api/platform'),
      getJson('/api/state')
    ]);
    panelState.config = normaliseConfig(config);
    panelState.platform = mapPlatform(platform);
    if (typeof runtimeState?.autoSwitchEnabled === 'boolean') {
      panelState.config.autoSwitchEnabled = runtimeState.autoSwitchEnabled;
    }
    const nextActiveApp = runtimeState?.activeApp || panelState.config.activeApp || 'word';
    if (isFirstLoad || nextActiveApp !== panelState.activeApp) {
      panelState.activeApp = nextActiveApp;
    }
    if (configVersion !== undefined) knownConfigVersion = configVersion;
    if (isFirstLoad || previousConfigVersion !== knownConfigVersion || previousActiveApp !== panelState.activeApp) {
      renderPanel(els);
    }
    bindEvents();
  }

  async function pollServerState() {
    try {
      const { activeApp, configVersion, autoSwitchEnabled } = await getJson('/api/state');
      if (knownConfigVersion !== -1 && configVersion !== knownConfigVersion) {
        await loadRuntime();
        return;
      }
      knownConfigVersion = configVersion;
      if (typeof autoSwitchEnabled === 'boolean') {
        panelState.config.autoSwitchEnabled = autoSwitchEnabled;
      }

      if (
        autoSwitchEnabled !== false &&
        activeApp &&
        activeApp !== panelState.activeApp
      ) {
        panelState.activeApp = activeApp;
        renderPanel(els);
        bindEvents();
      }
    } catch (_) {}
  }

  function startPolling() {
    clearInterval(statePollTimer);
    statePollTimer = setInterval(pollServerState, 1000);
  }

  function stopPolling() {
    clearInterval(statePollTimer);
  }

  return {
    loadRuntime,
    pollServerState,
    startPolling,
    stopPolling
  };
}
