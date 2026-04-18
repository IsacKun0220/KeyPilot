import { STEP_LIMITS } from '../constants.js';
import { getResolvedSteps } from '../services/mapping.js';
import { renderCanvas, renderPalette, renderPresetPicker } from './mapping-editor-parts.js';

export function renderMappingEditor(button, editorState) {
  const steps = getResolvedSteps(button, editorState.selectedApp, editorState.selectedPlatform);
  const isAtLimit = steps.length >= STEP_LIMITS.maxSteps;

  return `
    <section class="panel-card mapping-card">
      <div class="mapping-action-stack compact">
        ${editorState.presetPickerOpen ? renderPresetPicker(editorState) : ''}
      </div>
      <div class="kp-editor">
        ${renderPalette(editorState, isAtLimit)}
        ${renderCanvas(button, editorState)}
      </div>
    </section>
  `;
}
