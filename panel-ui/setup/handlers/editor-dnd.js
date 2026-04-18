import dragula from '../dragula.js';
import { STEP_LIMITS } from '../constants.js';
import { state } from '../state.js';
import { createStep } from '../../shared/action-schema.js';
import { clearDelayUnitsForSelection, getActiveSteps, syncActionTypeFromSteps } from './editor-shared.js';

let blockEditorDrake = null;
let isDraggingFromScript = false;
let isDraggingPaletteBlock = false;
let activeDraggedStepIndex = null;
let stepDropHandled = false;
let dragCleanupFrame = 0;

function syncBlockEditorTestHook(root, scriptEl, paletteDropzoneEl) {
  const testApi = (window.__KP_TEST__ ||= {});

  testApi.blockEditor = {
    hasActiveDrake() {
      return Boolean(blockEditorDrake);
    },
    addPaletteStepToCanvas(stepType) {
      if (!blockEditorDrake || !scriptEl) return false;
      const paletteStep = root.querySelector(`[data-palette-step-type="${stepType}"]`);
      const source = paletteStep?.closest('.kp-cat-blocks');
      if (!paletteStep || !source) return false;
      blockEditorDrake.emit('drag', paletteStep, source);
      blockEditorDrake.emit('drop', paletteStep, scriptEl, source, null);
      return true;
    },
    removeCanvasStepToPalette(stepType) {
      if (!blockEditorDrake || !scriptEl || !paletteDropzoneEl) return false;
      const canvasStep = root.querySelector(`[data-kp-canvas] [data-kp-step-type="${stepType}"]`);
      if (!canvasStep) return false;
      blockEditorDrake.emit('drag', canvasStep, scriptEl);
      blockEditorDrake.emit('drop', canvasStep, paletteDropzoneEl, scriptEl, null);
      return true;
    }
  };
}

export function hasBlockEditorDrake() {
  return Boolean(blockEditorDrake);
}

function rerenderAfterDrag(renderEditorOnly) {
  window.setTimeout(() => {
    renderEditorOnly();
  }, 0);
}

function getRenderedStepIndex(element) {
  const stepEl = element?.matches?.('[data-step-index]') ? element : element?.querySelector?.('[data-step-index]');
  return stepEl ? Number(stepEl.dataset.stepIndex) : null;
}

export function destroyBlockEditorDrake() {
  if (blockEditorDrake) {
    blockEditorDrake.destroy();
    blockEditorDrake = null;
  }
}

function queueDragCleanupVisuals() {
  if (dragCleanupFrame) {
    window.cancelAnimationFrame(dragCleanupFrame);
  }
  document.body.classList.add('kp-drag-cleanup-active');
  dragCleanupFrame = window.requestAnimationFrame(() => {
    dragCleanupFrame = window.requestAnimationFrame(() => {
      document.body.classList.remove('kp-drag-cleanup-active');
      dragCleanupFrame = 0;
    });
  });
}

function setCanvasDropState(root, active) {
  const canvas = root?.querySelector?.('[data-kp-canvas]');
  if (!canvas) return;
  canvas.classList.toggle('is-drop-target', active);
}

function clearCanvasDropState(root) {
  setCanvasDropState(root, false);
}

function resetDragTracking(root) {
  queueDragCleanupVisuals();
  isDraggingFromScript = false;
  isDraggingPaletteBlock = false;
  activeDraggedStepIndex = null;
  stepDropHandled = false;
  document.body.classList.remove('kp-step-drag-active', 'kp-palette-drag-active');
  clearCanvasDropState(root);
}

export function syncBlockEditorDragula(renderEditorOnly, root = document) {
  destroyBlockEditorDrake();
  resetDragTracking(root);

  if (!state.editor.open || state.editor.currentStep !== 1) {
    return;
  }

  const menuEl = root.querySelector('[data-kp-palette]');
  const paletteDropzoneEl = root.querySelector('[data-kp-palette-dropzone]');
  const canvasEl = root.querySelector('[data-kp-canvas]');
  const scriptEl = canvasEl?.querySelector('.kp-script-scroll') || canvasEl;
  const paletteSources = [...root.querySelectorAll('.kp-cat-blocks')].filter((element) => element.querySelector('.kp-step'));
  if (!menuEl || !paletteDropzoneEl || !scriptEl) {
    return;
  }

  const containers = [scriptEl, paletteDropzoneEl, ...paletteSources];
  syncBlockEditorTestHook(root, scriptEl, paletteDropzoneEl);

  blockEditorDrake = dragula(containers, {
    copy: (_el, source) => source !== scriptEl,
    copySortSource: false,
    accepts: (_el, target, source) => (
      target === scriptEl
      || (source === scriptEl && target === paletteDropzoneEl)
    ),
    revertOnSpill: true,
    moves: (el, source, handle) => {
      if (source !== scriptEl) {
        return el.classList.contains('kp-step')
          && !handle?.closest?.('button, input, select, textarea, [data-toggle-dropdown], [data-kp-key-chip], .setup-select, .setup-select-trigger')
          && getActiveSteps().length < STEP_LIMITS.maxSteps;
      }
      return !handle?.closest?.('input, select, button, textarea, [data-toggle-dropdown], [data-dropdown-choice], [data-kp-key-chip], .setup-select, .setup-select-trigger, .setup-select-menu, .setup-select-option');
    }
  });

  blockEditorDrake.on('drag', (_el, source) => {
    isDraggingFromScript = source === scriptEl;
    isDraggingPaletteBlock = source !== scriptEl;
    activeDraggedStepIndex = isDraggingFromScript ? getRenderedStepIndex(_el) : null;
    stepDropHandled = false;
    if (isDraggingFromScript) {
      document.body.classList.add('kp-step-drag-active');
    }
    if (isDraggingPaletteBlock) {
      document.body.classList.add('kp-palette-drag-active');
    } else {
      document.body.classList.remove('kp-palette-drag-active');
    }
    clearCanvasDropState(root);
  });

  blockEditorDrake.on('over', (_el, container) => {
    setCanvasDropState(root, container === scriptEl);
  });

  blockEditorDrake.on('out', (_el, container) => {
    if (container === scriptEl) {
      clearCanvasDropState(root);
    }
  });

  blockEditorDrake.on('drop', (el, target, source, sibling) => {
    clearCanvasDropState(root);
    if (!target) {
      resetDragTracking(root);
      rerenderAfterDrag(renderEditorOnly);
      return;
    }

    const steps = getActiveSteps();

    if (source !== scriptEl) {
      if (steps.length >= STEP_LIMITS.maxSteps) {
        state.editor.validationMessage = `You can add up to ${STEP_LIMITS.maxSteps} steps.`;
        resetDragTracking(root);
        rerenderAfterDrag(renderEditorOnly);
        return;
      }

      const type = el.dataset.paletteStepType;
      const siblingIndex = getRenderedStepIndex(sibling);
      const insertIndex = Number.isInteger(siblingIndex) ? siblingIndex : steps.length;
      steps.splice(insertIndex, 0, createStep(type));
      syncActionTypeFromSteps();
      state.editor.validationMessage = '';
      stepDropHandled = true;
      rerenderAfterDrag(renderEditorOnly);
      resetDragTracking(root);
      return;
    }

    const fromIndex = getRenderedStepIndex(el);
    if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= steps.length) {
      resetDragTracking(root);
      renderEditorOnly();
      return;
    }

    if (target === paletteDropzoneEl) {
      paletteDropzoneEl.replaceChildren();
      steps.splice(fromIndex, 1);
      clearDelayUnitsForSelection();
      syncActionTypeFromSteps();
      state.editor.validationMessage = '';
      stepDropHandled = true;
      resetDragTracking(root);
      rerenderAfterDrag(renderEditorOnly);
      return;
    }

    const siblingIndex = getRenderedStepIndex(sibling);
    let toIndex = Number.isInteger(siblingIndex) ? siblingIndex : steps.length;
    const [step] = steps.splice(fromIndex, 1);
    if (fromIndex < toIndex) {
      toIndex -= 1;
    }
    steps.splice(toIndex, 0, step);
    clearDelayUnitsForSelection();
    state.editor.validationMessage = '';
    stepDropHandled = true;
    resetDragTracking(root);
    rerenderAfterDrag(renderEditorOnly);
  });

  blockEditorDrake.on('cancel', () => {
    resetDragTracking(root);
    rerenderAfterDrag(renderEditorOnly);
  });

  blockEditorDrake.on('dragend', () => {
    resetDragTracking(root);
  });
}
