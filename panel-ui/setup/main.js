import { loadConfig, loadConnectionStatus, loadPairing, loadRuntimeState, saveConfig } from './services/storage.js';
import { state } from './state.js';
import { renderSidebar, renderDashboard } from './render/dashboard.js';
import { getFilteredLibraryButtons, renderLibrary } from './render/library.js';
import { renderEditor } from './render/editor.js?v=20260415g';
import { renderConnectionStatus, renderPairingModal, showToast } from './render/status.js';
import { initDashboardHandlers } from './handlers/dashboard.js';
import { initLibraryHandlers } from './handlers/library.js';
import { initDndHandlers, refreshDndInteractions } from './handlers/dnd.js';
import { initEditorHandlers, openEditor, refreshEditorInteractions } from './handlers/editor.js?v=20260415g';

const channel = new BroadcastChannel('keypilot');

const els = {
  sidebarNav: document.getElementById('sidebarNav'),
  setupShell: document.querySelector('.setup-shell'),
  connectionPill: document.getElementById('connectionPill'),
  connectionText: document.getElementById('connectionText'),
  appHeading: document.getElementById('appHeading'),
  dirtyBadge: document.getElementById('dirtyBadge'),
  setTabs: document.getElementById('setTabs'),
  slotRow: document.getElementById('slotRow'),
  suggestionsGrid: document.getElementById('suggestionsGrid'),
  libraryFilters: document.getElementById('libraryFilters'),
  customEntryButton: document.getElementById('customEntryButton'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  pairingModal: document.getElementById('pairingModal'),
  pairingTitle: document.getElementById('pairingTitle'),
  pairingMessage: document.getElementById('pairingMessage'),
  qrImage: document.getElementById('qrImage'),
  previewLink: document.getElementById('previewLink'),
  runtimeLink: document.getElementById('runtimeLink'),
  pairingSteps: document.getElementById('pairingSteps'),
  sheetBackdrop: document.getElementById('sheetBackdrop'),
  editorSheet: document.getElementById('editorSheet'),
  editorCancel: document.getElementById('editorCancel'),
  editorTitle: document.getElementById('editorTitle'),
  editorDone: document.getElementById('editorDone'),
  editorStatus: document.getElementById('editorStatus'),
  editorBody: document.getElementById('editorBody'),
  editorRemove: document.getElementById('editorRemove'),
  toast: document.getElementById('toast')
};

let saveTimer = null;
let saveInFlight = false;
let saveQueued = false;
let runtimeStateTimer = null;
let editorInteractionFrame = 0;

function scheduleEditorInteractionRefresh() {
  if (editorInteractionFrame) {
    window.cancelAnimationFrame(editorInteractionFrame);
  }
  editorInteractionFrame = window.requestAnimationFrame(() => {
    editorInteractionFrame = 0;
    if (state.editor.open) {
      refreshEditorInteractions(els, renderEditorOnly);
    }
  });
}

function scheduleAutoSave() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    persistConfig().catch(() => showToast(els, 'Failed to save configuration.'));
  }, 120);
}

function markDirty(value = true) {
  state.dirty = value;
  state.saveState = value ? 'saving' : 'idle';
  renderConnectionStatus(els);
  if (value) {
    scheduleAutoSave();
  }
}

function renderSidebarOnly() {
  renderSidebar(els);
}

function renderDashboardOnly({ refreshDnd = false } = {}) {
  renderDashboard(els);
  if (refreshDnd) {
    refreshDndInteractions(els, getFilteredLibraryButtons, {
      markDirty,
      renderDashboard: renderDashboardOnly,
      renderLibrary: renderLibraryOnly
    });
  }
}

function renderLibraryOnly() {
  renderLibrary(els);
}

function renderAll() {
  renderSidebarOnly();
  renderDashboardOnly({ refreshDnd: true });
  renderLibraryOnly();
  renderEditor(els);
  if (state.editor.open) {
    scheduleEditorInteractionRefresh();
  }
  renderPairingModal(els);
  renderConnectionStatus(els);
}

function renderEditorOnly() {
  renderEditor(els);
  if (state.editor.open) {
    scheduleEditorInteractionRefresh();
  }
}

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
  renderEditorOnly();
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

async function persistConfig() {
  if (saveInFlight) {
    saveQueued = true;
    return;
  }
  saveInFlight = true;
  state.config.activeApp = state.activeApp;
  state.config.activeProfile = state.activeProfile;
  try {
    state.config = await saveConfig(state.config);
    state.saveState = 'idle';
    markDirty(false);
    channel.postMessage({ type: 'config-updated' });
    renderSidebarOnly();
    renderDashboardOnly({ refreshDnd: true });
    renderLibraryOnly();
    renderConnectionStatus(els);
  } catch (error) {
    state.saveState = 'error';
    renderConnectionStatus(els);
    throw error;
  } finally {
    saveInFlight = false;
    if (saveQueued) {
      saveQueued = false;
      scheduleAutoSave();
    }
  }
}

async function init() {
  const [config, pairing, runtimeState] = await Promise.all([loadConfig(), loadPairing(), loadRuntimeState().catch(() => null)]);
  state.config = config;
  state.pairing = pairing;
  state.connectionState.connected = Boolean(pairing.connection?.connected);
  state.connectionState.lastSeenAt = pairing.connection?.lastSeenAt || null;
  state.activeApp = runtimeState?.activeApp || config.activeApp;
  state.activeSetByApp = Object.fromEntries(Object.keys(config.apps || {}).map((appId) => [appId, 0]));
  els.qrImage.src = pairing.qrDataUrl;
  initDashboardHandlers(els, {
    renderSidebar: renderSidebarOnly,
    renderDashboard: renderDashboardOnly,
    renderLibrary: renderLibraryOnly,
    renderEditorOnly,
    openEditor,
    markDirty,
    showToast: (message) => showToast(els, message)
  });
  initLibraryHandlers(els, getFilteredLibraryButtons, {
    markDirty,
    renderDashboard: renderDashboardOnly,
    renderLibrary: renderLibraryOnly,
    renderEditorOnly,
    openEditor
  });
  initEditorHandlers(els, { markDirty, renderAll, renderEditorOnly });
  initDndHandlers();
  renderAll();

  els.connectionPill.addEventListener('click', () => {
    renderPairingModal(els);
    els.modalBackdrop.classList.add('open');
    els.pairingModal.classList.add('open');
  });
  els.modalBackdrop.addEventListener('click', () => {
    els.modalBackdrop.classList.remove('open');
    els.pairingModal.classList.remove('open');
  });
  refreshConnectionStatus().catch(() => {});
  refreshRuntimeApp().catch(() => {});
  startRuntimeStatePolling();
  setInterval(() => {
    refreshConnectionStatus().catch(() => {});
  }, 4000);
}

init().catch(() => {
  showToast(els, 'Failed to load configuration.');
});
