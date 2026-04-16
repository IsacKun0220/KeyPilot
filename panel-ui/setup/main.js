import { loadConfig, loadConnectionStatus, loadPairing, saveConfig } from './services/storage.js';
import { state } from './state.js';
import { renderSidebar, renderDashboard } from './render/dashboard.js';
import { getFilteredLibraryPresets, renderLibrary } from './render/library.js';
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
  saveButton: document.getElementById('saveButton'),
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

function markDirty(value = true) {
  state.dirty = value;
  renderConnectionStatus(els);
}

function renderSidebarOnly() {
  renderSidebar(els);
}

function renderDashboardOnly({ refreshDnd = false } = {}) {
  renderDashboard(els);
  if (refreshDnd) {
    refreshDndInteractions(els, getFilteredLibraryPresets, { markDirty, renderDashboard: renderDashboardOnly });
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
  refreshEditorInteractions(els, renderEditorOnly);
  renderPairingModal(els);
  renderConnectionStatus(els);
}

function renderEditorOnly() {
  renderEditor(els);
  refreshEditorInteractions(els, renderEditorOnly);
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

async function persistConfig() {
  state.config.activeApp = state.activeApp;
  state.config.activeProfile = state.activeProfile;
  state.config = await saveConfig(state.config);
  markDirty(false);
  channel.postMessage({ type: 'config-updated' });
  const previous = els.saveButton.textContent;
  els.saveButton.textContent = 'Saved ✓';
  setTimeout(() => {
    els.saveButton.textContent = previous;
  }, 1200);
  renderSidebarOnly();
  renderDashboardOnly({ refreshDnd: true });
  renderLibraryOnly();
  renderConnectionStatus(els);
}

async function init() {
  const [config, pairing] = await Promise.all([loadConfig(), loadPairing()]);
  state.config = config;
  state.pairing = pairing;
  state.connectionState.connected = Boolean(pairing.connection?.connected);
  state.connectionState.lastSeenAt = pairing.connection?.lastSeenAt || null;
  state.activeApp = config.activeApp;
  els.qrImage.src = pairing.qrDataUrl;
  initDashboardHandlers(els, {
    renderSidebar: renderSidebarOnly,
    renderDashboard: renderDashboardOnly,
    renderEditorOnly,
    openEditor,
    markDirty,
    showToast: (message) => showToast(els, message)
  });
  initLibraryHandlers(els, getFilteredLibraryPresets, {
    markDirty,
    renderDashboard: renderDashboardOnly,
    renderLibrary: renderLibraryOnly,
    renderEditorOnly,
    openEditor
  });
  initEditorHandlers(els, { renderAll, renderEditorOnly });
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
  els.saveButton.addEventListener('click', () => {
    persistConfig().catch(() => showToast(els, 'Failed to save configuration.'));
  });

  refreshConnectionStatus().catch(() => {});
  setInterval(() => {
    refreshConnectionStatus().catch(() => {});
  }, 4000);
}

init().catch(() => {
  showToast(els, 'Failed to load configuration.');
});
