import { SET_LIMIT } from '../constants.js';
import { state } from '../state.js';
import { createId } from '../utils/ids.js';

let dashboardBound = false;

export function initDashboardHandlers(els, { renderSidebar, renderDashboard, renderEditorOnly, openEditor, markDirty, showToast }) {
  if (dashboardBound) {
    return;
  }
  dashboardBound = true;

  els.sidebarNav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-app-id]');
    if (!button) return;
    state.activeApp = button.dataset.appId;
    state.config.activeApp = state.activeApp;
    state.activeSetIndex = 0;
    renderSidebar();
    renderDashboard({ refreshDnd: true });
  });

  els.setTabs.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-set]');
    if (deleteButton) {
      event.stopPropagation();
      state.config.apps[state.activeApp].sets.splice(Number(deleteButton.dataset.deleteSet), 1);
      state.activeSetIndex = Math.max(0, state.activeSetIndex - 1);
      markDirty();
      renderDashboard({ refreshDnd: true });
      return;
    }

    const newSetButton = event.target.closest('#newSetButton');
    if (newSetButton) {
      const sets = state.config.apps[state.activeApp].sets;
      if (sets.length >= SET_LIMIT) {
        showToast('Each app can have up to 5 sets.');
        return;
      }
      sets.push({ id: createId('set'), name: `Set ${sets.length + 1}`, buttons: [] });
      state.activeSetIndex = sets.length - 1;
      markDirty();
      renderDashboard({ refreshDnd: true });
      return;
    }

    const tab = event.target.closest('[data-set-index]');
    if (!tab) return;
    state.activeSetIndex = Number(tab.dataset.setIndex);
    renderDashboard({ refreshDnd: true });
  });

  els.slotRow.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-slot]');
    if (removeButton) {
      event.stopPropagation();
      state.config.apps[state.activeApp].sets[state.activeSetIndex].buttons[Number(removeButton.dataset.removeSlot)] = null;
      markDirty();
      renderDashboard({ refreshDnd: true });
      return;
    }

    const slot = event.target.closest('[data-slot-index]');
    if (!slot) return;
    openEditor(Number(slot.dataset.slotIndex), slot.classList.contains('empty') ? 'create' : 'edit');
    renderEditorOnly();
  });
}
