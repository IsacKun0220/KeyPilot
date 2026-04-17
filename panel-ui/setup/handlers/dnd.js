import dragula from '../dragula.js';
import { deepClone } from '../utils/clone.js';
import { state } from '../state.js';

let dndBound = false;
let slotDrake = null;

function currentButtons() {
  return state.config.apps[state.activeApp].sets[state.activeSetIndex].buttons;
}

function destroySlotDrake() {
  if (slotDrake) {
    slotDrake.destroy();
    slotDrake = null;
  }
}

const SLOT_LIMIT = 5;

function getTargetSlotIndex(container) {
  // Always validate against the fixed SLOT_LIMIT, not the current buttons array
  // length — for fresh/empty apps the array is [], so slotCount would be 0 and
  // every valid slot index (0-4) would fail the old < slotCount guard.
  const index = Number(container?.dataset.slotIndex);
  return Number.isInteger(index) && index >= 0 && index < SLOT_LIMIT ? index : 0;
}

function rerenderAfterDrop(renderDashboard, renderLibrary) {
  window.setTimeout(() => {
    renderDashboard({ refreshDnd: true });
    renderLibrary();
  }, 0);
}

export function initDndHandlers() {
  if (dndBound) {
    return;
  }
  dndBound = true;
}

export function refreshDndInteractions(els, getLibraryButtons, { markDirty, renderDashboard, renderLibrary }) {
  destroySlotDrake();

  if (!els.suggestionsGrid || !els.slotRow) {
    return;
  }

  const slotContainers = [...els.slotRow.querySelectorAll('.slot-shell')];
  if (!slotContainers.length) {
    return;
  }

  slotDrake = dragula([els.suggestionsGrid, ...slotContainers], {
    copy: (_el, source) => source === els.suggestionsGrid,
    accepts: (_el, target) => target === els.suggestionsGrid || slotContainers.includes(target),
    revertOnSpill: true,
    moves: (el, source) => {
      if (source === els.suggestionsGrid) {
        return el.classList.contains('suggestion-card');
      }
      return slotContainers.includes(source) && el.classList.contains('slot-card') && !el.classList.contains('empty');
    }
  });

  slotDrake.on('over', (_el, container) => {
    if (slotContainers.includes(container)) {
      container.classList.add('drag-over');
    }
  });

  slotDrake.on('out', (_el, container) => {
    if (slotContainers.includes(container)) {
      container.classList.remove('drag-over');
    }
  });

  slotDrake.on('drop', (el, target, source) => {
    slotContainers.forEach((container) => container.classList.remove('drag-over'));
    if (!target) {
      rerenderAfterDrop(renderDashboard, renderLibrary);
      return;
    }

    const buttons = currentButtons();

    if (target === els.suggestionsGrid) {
      if (slotContainers.includes(source)) {
        const fromIndex = getTargetSlotIndex(source);
        buttons[fromIndex] = null;
        markDirty();
      }
      rerenderAfterDrop(renderDashboard, renderLibrary);
      return;
    }

    if (!slotContainers.includes(target)) {
      rerenderAfterDrop(renderDashboard, renderLibrary);
      return;
    }

    const targetIndex = getTargetSlotIndex(target);

    if (source === els.suggestionsGrid) {
      const libraryButtons = getLibraryButtons();
      const libraryButton = libraryButtons[Number(el.dataset.libraryIndex)];

      if (el.parentNode === target) {
        el.parentNode.removeChild(el);
      }
      if (libraryButton) {
        buttons[targetIndex] = deepClone(libraryButton);
        markDirty();
      }
      rerenderAfterDrop(renderDashboard, renderLibrary);
      return;
    }

    if (slotContainers.includes(source)) {
      const fromIndex = getTargetSlotIndex(source);
      if (targetIndex !== fromIndex) {
        const displaced = buttons[targetIndex] || null;
        buttons[targetIndex] = buttons[fromIndex] || null;
        buttons[fromIndex] = displaced;
        markDirty();
      }
      rerenderAfterDrop(renderDashboard, renderLibrary);
    }
  });

  slotDrake.on('cancel', () => {
    slotContainers.forEach((container) => container.classList.remove('drag-over'));
    rerenderAfterDrop(renderDashboard, renderLibrary);
  });
}
