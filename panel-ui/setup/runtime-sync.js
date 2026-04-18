export function createSetupRuntimeSync({ state, els, loadConnectionStatus, loadRuntimeState, renderConnectionStatus, renderSidebarOnly, renderDashboardOnly, renderLibraryOnly, renderEditorOnly }) {
  let runtimeStateTimer = null;

  function applyActiveApp(appId) {
    if (!state.config?.apps?.[appId]) {
      return;
    }
    if (state.activeApp === appId) {
      return;
    }
    state.activeSetByApp[state.activeApp] = state.activeSetIndex;
    state.activeApp = appId;
    const sets = state.config.apps[appId]?.sets || [];
    const nextIndex = state.activeSetByApp[appId] || 0;
    state.activeSetIndex = Math.max(0, Math.min(nextIndex, Math.max(sets.length - 1, 0)));
    renderSidebarOnly();
    renderDashboardOnly({ refreshDnd: true });
    renderLibraryOnly();
    if (state.editor.open) {
      renderEditorOnly();
    }
  }

  async function refreshConnectionStatus() {
    try {
      const payload = await loadConnectionStatus();
      const nextConnected = Boolean(payload.connection?.connected);
      const nextLastSeenAt = payload.connection?.lastSeenAt || null;
      const nextRuntimeUrl = payload.runtimeUrl || state.pairing?.runtimeUrl;
      const nextPreviewUrl = payload.previewUrl || state.pairing?.previewUrl;
      const nextLocalUrls = payload.localUrls || state.pairing?.localUrls;
      const changed = nextConnected !== state.connectionState.connected
        || nextLastSeenAt !== state.connectionState.lastSeenAt
        || nextRuntimeUrl !== state.pairing?.runtimeUrl
        || nextPreviewUrl !== state.pairing?.previewUrl
        || JSON.stringify(nextLocalUrls || []) !== JSON.stringify(state.pairing?.localUrls || []);

      if (!changed) {
        return;
      }

      state.connectionState.connected = nextConnected;
      state.connectionState.lastSeenAt = nextLastSeenAt;
      if (state.pairing) {
        state.pairing.runtimeUrl = nextRuntimeUrl;
        state.pairing.previewUrl = nextPreviewUrl;
        state.pairing.localUrls = nextLocalUrls;
      }
      renderConnectionStatus(els);
    } catch (_) {
      if (!state.connectionState.connected && !state.connectionState.lastSeenAt) {
        return;
      }
      state.connectionState.connected = false;
      state.connectionState.lastSeenAt = null;
      renderConnectionStatus(els);
    }
  }

  async function refreshRuntimeApp() {
    if (state.editor.open) {
      return;
    }
    if (state.runtimeAppSyncPaused) {
      return;
    }
    if (Date.now() < state.manualAppSelectionUntil) {
      return;
    }
    try {
      const payload = await loadRuntimeState();
      if (payload?.activeApp) {
        applyActiveApp(payload.activeApp);
      }
    } catch (_) {}
  }

  function startRuntimeStatePolling() {
    clearInterval(runtimeStateTimer);
    runtimeStateTimer = setInterval(() => {
      refreshRuntimeApp().catch(() => {});
    }, 1000);
  }

  return {
    applyActiveApp,
    refreshConnectionStatus,
    refreshRuntimeApp,
    startRuntimeStatePolling
  };
}
