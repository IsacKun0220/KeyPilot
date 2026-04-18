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
    const [{ config, configVersion }, { platform }] = await Promise.all([
      getJson('/api/config'),
      getJson('/api/platform')
    ]);
    panelState.config = normaliseConfig(config);
    panelState.platform = mapPlatform(platform);
    if (isFirstLoad) {
      panelState.activeApp = panelState.config.activeApp || 'word';
    }
    if (configVersion !== undefined) knownConfigVersion = configVersion;
    if (isFirstLoad || previousConfigVersion !== knownConfigVersion) {
      renderPanel(els);
    }
    bindEvents();
  }

  async function pollServerState() {
    try {
      const { activeApp, configVersion } = await getJson('/api/state');
      if (knownConfigVersion !== -1 && configVersion !== knownConfigVersion) {
        await loadRuntime();
        return;
      }
      knownConfigVersion = configVersion;

      if (
        panelState.config?.autoSwitchEnabled !== false &&
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
