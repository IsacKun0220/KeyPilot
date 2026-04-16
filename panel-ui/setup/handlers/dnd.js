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

function getTargetSlotIndex(container, slotCount) {
  const index = Number(container?.dataset.slotIndex);
  if (Number.isInteger(index) && index >= 0 && index < slotCount) {
    return index;
  }
  return slotCount - 1;
}

function rerenderAfterDrop(renderDashboard) {
  window.setTimeout(() => {
    renderDashboard({ refreshDnd: true });
  }, 0);
}

export function initDndHandlers() {
  if (dndBound) {
    return;
  }
  dndBound = true;
}

export function refreshDndInteractions(els, getPresets, { markDirty, renderDashboard }) {
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
    accepts: (_el, target) => slotContainers.includes(target),
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

  slotDrake.on('drop', (el, target, source, sibling) => {
    slotContainers.forEach((container) => container.classList.remove('drag-over'));
    if (!slotContainers.includes(target)) {
      rerenderAfterDrop(renderDashboard);
      return;
    }

    const buttons = currentButtons();
    const slotCount = buttons.length;
    const targetIndex = getTargetSlotIndex(target, slotCount);

    if (source === els.suggestionsGrid) {
      const presets = getPresets();
      const preset = presets[Number(el.dataset.presetIndex)];

      if (el.parentNode === target) {
        el.parentNode.removeChild(el);
      }
      buttons[targetIndex] = preset ? deepClone(preset) : buttons[targetIndex];
      markDirty();
      rerenderAfterDrop(renderDashboard);
      return;
    }

    if (slotContainers.includes(source)) {
      const fromIndex = getTargetSlotIndex(source, slotCount);

      if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= buttons.length) {
        rerenderAfterDrop(renderDashboard);
        return;
      }

      if (targetIndex !== fromIndex) {
        const displaced = buttons[targetIndex] || null;
        buttons[targetIndex] = buttons[fromIndex];
        buttons[fromIndex] = displaced;
      }
      markDirty();
      rerenderAfterDrop(renderDashboard);
    }
  });

  slotDrake.on('cancel', () => {
    slotContainers.forEach((container) => container.classList.remove('drag-over'));
    rerenderAfterDrop(renderDashboard);
  });
}
