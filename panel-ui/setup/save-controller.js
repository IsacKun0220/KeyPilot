export function createSetupSaveController({ state, saveConfig, showToast, renderConnectionStatus, renderSidebarOnly, renderDashboardOnly, renderLibraryOnly, channel, els }) {
  let saveTimer = null;
  let saveInFlight = false;
  let saveQueued = false;
  let queuedSaveOptions = null;

  function normaliseSaveOptions(value = true, options = {}) {
    if (typeof value === 'object' && value !== null) {
      return normaliseSaveOptions(true, value);
    }
    return {
      value,
      silent: Boolean(options.silent),
      refreshSidebar: options.refreshSidebar !== false,
      refreshDashboard: options.refreshDashboard !== false,
      refreshLibrary: options.refreshLibrary !== false
    };
  }

  function mergeSaveOptions(base, incoming) {
    if (!base) return incoming;
    return {
      value: incoming.value,
      silent: base.silent && incoming.silent,
      refreshSidebar: base.refreshSidebar || incoming.refreshSidebar,
      refreshDashboard: base.refreshDashboard || incoming.refreshDashboard,
      refreshLibrary: base.refreshLibrary || incoming.refreshLibrary
    };
  }

  function scheduleAutoSave(persistConfig, options) {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      persistConfig().catch(() => showToast(els, 'Failed to save configuration.'));
    }, 120);
    queuedSaveOptions = mergeSaveOptions(queuedSaveOptions, options);
  }

  function markDirty(persistConfig, value = true, options = {}) {
    const saveOptions = normaliseSaveOptions(value, options);
    state.dirty = saveOptions.value;
    state.saveState = saveOptions.value && !saveOptions.silent ? 'saving' : 'idle';
    state.showSaveBadge = state.saveState === 'error' || (saveOptions.value && !saveOptions.silent);
    renderConnectionStatus(els);
    if (saveOptions.value) {
      scheduleAutoSave(persistConfig, saveOptions);
    }
  }

  async function persistConfig(markDirtyFn) {
    const saveOptions = queuedSaveOptions || normaliseSaveOptions(true);
    queuedSaveOptions = null;
    if (saveInFlight) {
      saveQueued = true;
      queuedSaveOptions = mergeSaveOptions(queuedSaveOptions, saveOptions);
      return;
    }
    saveInFlight = true;
    state.config.activeApp = state.activeApp;
    state.config.activeProfile = state.activeProfile;
    try {
      state.config = await saveConfig(state.config);
      state.saveState = 'idle';
      state.showSaveBadge = false;
      markDirtyFn(false);
      channel.postMessage({ type: 'config-updated' });
      if (saveOptions.refreshSidebar) {
        renderSidebarOnly();
      }
      if (saveOptions.refreshDashboard) {
        renderDashboardOnly({ refreshDnd: true });
      }
      if (saveOptions.refreshLibrary) {
        renderLibraryOnly();
      }
      renderConnectionStatus(els);
    } catch (error) {
      state.saveState = 'error';
      state.showSaveBadge = !saveOptions.silent;
      renderConnectionStatus(els);
      throw error;
    } finally {
      saveInFlight = false;
      if (saveQueued) {
        saveQueued = false;
        scheduleAutoSave(() => persistConfig(markDirtyFn), queuedSaveOptions || normaliseSaveOptions(true));
      }
    }
  }

  return {
    markDirty: (persistConfigFn, value = true, options = {}) => markDirty(persistConfigFn, value, options),
    persistConfig: (markDirtyFn) => persistConfig(markDirtyFn)
  };
}
