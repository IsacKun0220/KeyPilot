import { deepClone } from '../utils/clone.js';
import { SLOT_LIMIT } from '../constants.js';
import { normaliseSlotButtons } from '../services/normalise.js';
import { state } from '../state.js';

let dndBound = false;
let nativeLibraryDndBound = false;
let nativeSlotDndBound = false;
let activeLibraryDragIndex = null;
let activeSlotDragIndex = null;
let slotDropHandled = false;
let pointerClientX = 0;
let pointerClientY = 0;
let liveEls = null;
let activeSourceSlotShell = null;

function currentButtons() {
  const set = state.config.apps[state.activeApp].sets[state.activeSetIndex];
  set.buttons = normaliseSlotButtons(set.buttons, state.activeApp);
  return set.buttons;
}

function getTargetSlotIndex(container) {
  const index = Number(container?.dataset.slotIndex);
  return Number.isInteger(index) && index >= 0 && index < SLOT_LIMIT ? index : 0;
}

function rerenderAfterDrop(renderDashboard, renderLibrary, { refreshLibrary = false, afterRender = null } = {}) {
  renderDashboard({ refreshDnd: true });
  if (refreshLibrary) {
    renderLibrary();
  }
  afterRender?.();
}

function flashUpdatedSlots(els, slotIndexes = []) {
  const uniqueIndexes = [...new Set(slotIndexes.filter((index) => Number.isInteger(index) && index >= 0 && index < SLOT_LIMIT))];
  if (!uniqueIndexes.length || !els?.slotRow) {
    return;
  }

  window.requestAnimationFrame(() => {
    uniqueIndexes.forEach((index) => {
      const slotCard = els.slotRow.querySelector(`.slot-card[data-slot-index="${index}"]`);
      if (!slotCard) return;
      slotCard.classList.remove('is-updated');
      void slotCard.offsetWidth;
      slotCard.classList.add('is-updated');
    });
  });
}

function clearSlotHighlights(els) {
  [...(els.slotRow?.querySelectorAll('.slot-shell') || [])].forEach((container) => container.classList.remove('drag-over'));
  els.suggestionsGrid?.classList.remove('drop-remove');
}

function clearSourceSlotPlaceholder() {
  if (!activeSourceSlotShell) {
    return;
  }
  activeSourceSlotShell.classList.remove('is-drag-source');
}

function setActiveSourceSlotShell(container) {
  if (activeSourceSlotShell === container) {
    return;
  }

  clearSourceSlotPlaceholder();
  activeSourceSlotShell = container || null;
  if (!activeSourceSlotShell) {
    return;
  }

  activeSourceSlotShell.classList.add('is-drag-source');
}

function getLibraryHoverTarget(els) {
  const hovered = document.elementFromPoint(pointerClientX, pointerClientY);
  return hovered?.closest?.('#suggestionsGrid') ? els.suggestionsGrid : null;
}

function updateLibraryHoverState(els) {
  if (!els.suggestionsGrid) return;
  els.suggestionsGrid.classList.toggle('drop-remove', activeSlotDragIndex !== null && Boolean(getLibraryHoverTarget(els)));
}

function clearSlotDragState(els) {
  document.body.classList.remove('slot-drag-active');
  setActiveSourceSlotShell(null);
  clearSlotHighlights(els);
  if (els?.suggestionsGrid) {
    els.suggestionsGrid.classList.remove('drop-remove');
  }
}

export function initDndHandlers() {
  if (dndBound) {
    return;
  }
  dndBound = true;

  document.addEventListener('mousemove', (event) => {
    pointerClientX = event.clientX;
    pointerClientY = event.clientY;
    if (activeSlotDragIndex !== null && liveEls) {
      updateLibraryHoverState(liveEls);
    }
  });
}

export function refreshDndInteractions(els, getLibraryButtons, { markDirty, renderDashboard, renderLibrary }) {
  if (!els.suggestionsGrid || !els.slotRow) {
    return;
  }
  liveEls = els;

  if (!nativeLibraryDndBound) {
    nativeLibraryDndBound = true;

    els.suggestionsGrid.addEventListener('dragstart', (event) => {
      const card = event.target.closest('[data-library-card]');
      if (!card) return;
      activeLibraryDragIndex = Number(card.dataset.libraryIndex);
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', String(activeLibraryDragIndex));
      document.body.classList.add('library-dragging');
    });

    els.suggestionsGrid.addEventListener('dragend', () => {
      activeLibraryDragIndex = null;
      document.body.classList.remove('library-dragging');
      clearSlotDragState(els);
    });

    els.slotRow.addEventListener('dragover', (event) => {
      if (activeLibraryDragIndex === null) return;
      const slotShell = event.target.closest('.slot-shell');
      if (!slotShell) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      clearSlotHighlights(els);
      slotShell.classList.add('drag-over');
    });

    els.slotRow.addEventListener('drop', (event) => {
      if (activeLibraryDragIndex === null) return;
      const slotShell = event.target.closest('.slot-shell');
      clearSlotHighlights(els);
      if (!slotShell) return;

      event.preventDefault();
      const targetIndex = getTargetSlotIndex(slotShell);
      const libraryButtons = getLibraryButtons();
      const libraryButton = libraryButtons[activeLibraryDragIndex];
      activeLibraryDragIndex = null;
      document.body.classList.remove('library-dragging');

      if (!libraryButton) {
        rerenderAfterDrop(renderDashboard, renderLibrary);
        return;
      }

      currentButtons()[targetIndex] = deepClone(libraryButton);
      markDirty({ silent: true, refreshSidebar: false, refreshDashboard: false, refreshLibrary: false });
      rerenderAfterDrop(renderDashboard, renderLibrary, {
        afterRender: () => flashUpdatedSlots(els, [targetIndex])
      });
    });
  }

  if (nativeSlotDndBound) {
    return;
  }
  nativeSlotDndBound = true;

  els.slotRow.addEventListener('dragstart', (event) => {
    if (activeLibraryDragIndex !== null) {
      return;
    }

    const card = event.target.closest('.slot-card');
    const slotShell = event.target.closest('.slot-shell');
    if (!card || !slotShell || card.classList.contains('empty')) {
      return;
    }

    activeSlotDragIndex = getTargetSlotIndex(slotShell);
    slotDropHandled = false;
    document.body.classList.add('slot-drag-active');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(activeSlotDragIndex));
    window.requestAnimationFrame(() => {
      setActiveSourceSlotShell(slotShell);
    });
  });

  els.slotRow.addEventListener('dragover', (event) => {
    if (activeSlotDragIndex === null || activeLibraryDragIndex !== null) {
      return;
    }

    const slotShell = event.target.closest('.slot-shell');
    if (!slotShell) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    clearSlotHighlights(els);
    slotShell.classList.add('drag-over');
  });

  els.slotRow.addEventListener('drop', (event) => {
    if (activeSlotDragIndex === null || activeLibraryDragIndex !== null) {
      return;
    }

    const slotShell = event.target.closest('.slot-shell');
    if (!slotShell) {
      return;
    }

    event.preventDefault();
    slotDropHandled = true;

    const buttons = currentButtons();
    const fromIndex = activeSlotDragIndex;
    const targetIndex = getTargetSlotIndex(slotShell);

    clearSlotDragState(els);

    if (targetIndex !== fromIndex) {
      const displaced = buttons[targetIndex] || null;
      buttons[targetIndex] = buttons[fromIndex] || null;
      buttons[fromIndex] = displaced;
      markDirty({ silent: true, refreshSidebar: false, refreshDashboard: false, refreshLibrary: false });
      rerenderAfterDrop(renderDashboard, renderLibrary, {
        afterRender: () => flashUpdatedSlots(els, [fromIndex, targetIndex])
      });
    } else {
      rerenderAfterDrop(renderDashboard, renderLibrary);
    }

    activeSlotDragIndex = null;
    slotDropHandled = false;
  });

  els.slotRow.addEventListener('dragend', () => {
    if (activeSlotDragIndex === null || activeLibraryDragIndex !== null) {
      return;
    }

    const buttons = currentButtons();
    const fromIndex = activeSlotDragIndex;

    if (!slotDropHandled && getLibraryHoverTarget(els)) {
      buttons[fromIndex] = null;
      markDirty({ silent: true, refreshSidebar: false, refreshDashboard: false, refreshLibrary: false });
      clearSlotDragState(els);
      rerenderAfterDrop(renderDashboard, renderLibrary, {
        afterRender: () => flashUpdatedSlots(els, [fromIndex])
      });
    } else {
      clearSlotDragState(els);
      rerenderAfterDrop(renderDashboard, renderLibrary);
    }

    activeSlotDragIndex = null;
    slotDropHandled = false;
  });
}
