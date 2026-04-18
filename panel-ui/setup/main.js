import { loadConfig, loadConnectionStatus, loadPairing, loadRuntimeState, saveConfig } from './services/storage.js';
import { state } from './state.js';
import { renderSidebar, renderDashboard } from './render/dashboard.js';
import { getFilteredLibraryButtons, renderLibrary } from './render/library.js';
import { renderEditor } from './render/editor.js?v=20260417d';
import { renderConnectionStatus, renderPairingModal, showToast } from './render/status.js';
import { initDashboardHandlers } from './handlers/dashboard.js';
import { initLibraryHandlers } from './handlers/library.js';
import { initDndHandlers, refreshDndInteractions } from './handlers/dnd.js';
import { initEditorHandlers, openEditor, refreshEditorInteractions } from './handlers/editor.js?v=20260417d';
import { createSetupSaveController } from './save-controller.js';
import { createSetupRuntimeSync } from './runtime-sync.js';

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

const saveController = createSetupSaveController({
  state,
  saveConfig,
  showToast,
  renderConnectionStatus,
  renderSidebarOnly,
  renderDashboardOnly,
  renderLibraryOnly,
  channel,
  els
});

const runtimeSync = createSetupRuntimeSync({
  state,
  els,
  loadConnectionStatus,
  loadRuntimeState,
  renderConnectionStatus,
  renderSidebarOnly,
  renderDashboardOnly,
  renderLibraryOnly,
  renderEditorOnly
});

function persistConfig() {
  return saveController.persistConfig(markDirty);
}

function markDirty(value = true) {
  if (typeof value === 'object' && value !== null) {
    return saveController.markDirty(persistConfig, true, value);
  }
  return saveController.markDirty(persistConfig, value);
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
  runtimeSync.refreshConnectionStatus().catch(() => {});
  runtimeSync.refreshRuntimeApp().catch(() => {});
  runtimeSync.startRuntimeStatePolling();
  setInterval(() => {
    runtimeSync.refreshConnectionStatus().catch(() => {});
  }, 4000);
}

init().catch(() => {
  showToast(els, 'Failed to load configuration.');
});
