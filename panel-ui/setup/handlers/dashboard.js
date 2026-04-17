import { SET_LIMIT } from '../constants.js';
import { state } from '../state.js';
import { createId } from '../utils/ids.js';

let dashboardBound = false;
const MANUAL_APP_SELECTION_HOLD_MS = 5000;

function commitSetRename(index, { markDirty, renderDashboard, renderLibrary }) {
  if (!Number.isInteger(index) || index < 0) {
    state.editingSetIndex = null;
    state.editingSetDraft = '';
    renderDashboard({ refreshDnd: true });
    return;
  }

  const set = state.config.apps[state.activeApp].sets[index];
  if (!set) {
    state.editingSetIndex = null;
    state.editingSetDraft = '';
    renderDashboard({ refreshDnd: true });
    return;
  }

  const nextName = state.editingSetDraft.trim() || `Set ${index + 1}`;
  if (set.name !== nextName) {
    set.name = nextName;
    markDirty();
  }
  state.editingSetIndex = null;
  state.editingSetDraft = '';
  renderDashboard({ refreshDnd: true });
  renderLibrary();
}

function syncSetDraftFromInput(input) {
  if (!input) return;
  state.editingSetDraft = input.value;
}

function cancelSetRename({ renderDashboard }) {
  state.editingSetIndex = null;
  state.editingSetDraft = '';
  renderDashboard({ refreshDnd: true });
}

function startSetRename(index, { renderDashboard }) {
  const set = state.config.apps[state.activeApp].sets[index];
  if (!set) return;
  state.editingSetIndex = index;
  state.editingSetDraft = set.name || '';
  renderDashboard({ refreshDnd: true });
  window.setTimeout(() => {
    const input = document.querySelector(`[data-set-name-input="${index}"]`);
    input?.focus();
    input?.select();
  }, 0);
}

function restoreSetIndexForApp(appId) {
  const sets = state.config.apps[appId]?.sets || [];
  const nextIndex = state.activeSetByApp[appId] || 0;
  state.activeSetIndex = Math.max(0, Math.min(nextIndex, Math.max(sets.length - 1, 0)));
}

export function initDashboardHandlers(els, { renderSidebar, renderDashboard, renderLibrary, renderEditorOnly, openEditor, markDirty, showToast }) {
  if (dashboardBound) {
    return;
  }
  dashboardBound = true;

  els.sidebarNav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-app-id]');
    if (!button) return;
    state.activeSetByApp[state.activeApp] = state.activeSetIndex;
    state.activeApp = button.dataset.appId;
    state.manualAppSelectionUntil = Date.now() + MANUAL_APP_SELECTION_HOLD_MS;
    state.config.activeApp = state.activeApp;
    restoreSetIndexForApp(state.activeApp);
    markDirty();
    renderSidebar();
    renderDashboard({ refreshDnd: true });
    renderLibrary();
  });

  els.setTabs.addEventListener('click', (event) => {
    const renameInput = event.target.closest('[data-set-name-input]');
    if (renameInput) {
      return;
    }

    const deleteButton = event.target.closest('[data-delete-set]');
    if (deleteButton) {
      event.stopPropagation();
      state.config.apps[state.activeApp].sets.splice(Number(deleteButton.dataset.deleteSet), 1);
      state.activeSetIndex = Math.max(0, state.activeSetIndex - 1);
      state.activeSetByApp[state.activeApp] = state.activeSetIndex;
      markDirty();
      renderDashboard({ refreshDnd: true });
      renderLibrary();
      return;
    }

    const newSetButton = event.target.closest('#newSetButton');
    if (newSetButton) {
      const sets = state.config.apps[state.activeApp].sets;
      if (sets.length >= SET_LIMIT) {
        showToast('Each app can have up to 5 sets.');
        return;
      }
      sets.push({ id: createId('set'), name: '', buttons: [] });
      state.activeSetIndex = sets.length - 1;
      state.activeSetByApp[state.activeApp] = state.activeSetIndex;
      state.editingSetIndex = state.activeSetIndex;
      state.editingSetDraft = '';
      renderDashboard({ refreshDnd: true });
      renderLibrary();
      window.setTimeout(() => {
        const input = document.querySelector(`[data-set-name-input="${state.activeSetIndex}"]`);
        input?.focus();
        input?.select();
      }, 0);
      return;
    }

    const tab = event.target.closest('[data-set-index]');
    if (!tab) return;
    const nextIndex = Number(tab.dataset.setIndex);
    if (state.editingSetIndex !== null && state.editingSetIndex !== nextIndex) {
      commitSetRename(state.editingSetIndex, { markDirty, renderDashboard, renderLibrary });
    }
    if (state.activeSetIndex === nextIndex) {
      startSetRename(nextIndex, { renderDashboard });
      return;
    }
    state.activeSetIndex = nextIndex;
    state.activeSetByApp[state.activeApp] = state.activeSetIndex;
    renderDashboard({ refreshDnd: true });
  });

  els.setTabs.addEventListener('input', (event) => {
    const input = event.target.closest('[data-set-name-input]');
    if (!input) return;
    syncSetDraftFromInput(input);
  });

  els.setTabs.addEventListener('keydown', (event) => {
    const input = event.target.closest('[data-set-name-input]');
    if (!input) return;
    const index = Number(input.dataset.setNameInput);
    if (event.key === 'Enter') {
      event.preventDefault();
      syncSetDraftFromInput(input);
      commitSetRename(index, { markDirty, renderDashboard, renderLibrary });
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelSetRename({ renderDashboard });
    }
  });

  els.setTabs.addEventListener('focusout', (event) => {
    const input = event.target.closest('[data-set-name-input]');
    if (!input) return;
    syncSetDraftFromInput(input);
    const nextTarget = event.relatedTarget;
    if (nextTarget && els.setTabs.contains(nextTarget)) {
      return;
    }
    commitSetRename(Number(input.dataset.setNameInput), { markDirty, renderDashboard, renderLibrary });
  });

  els.slotRow.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-slot]');
    if (removeButton) {
      event.stopPropagation();
      state.config.apps[state.activeApp].sets[state.activeSetIndex].buttons[Number(removeButton.dataset.removeSlot)] = null;
      markDirty();
      renderDashboard({ refreshDnd: true });
      renderLibrary();
      return;
    }

    const slot = event.target.closest('[data-slot-index]');
    if (!slot) return;
    openEditor(Number(slot.dataset.slotIndex), slot.classList.contains('empty') ? 'create' : 'edit');
    renderEditorOnly();
  });
}
