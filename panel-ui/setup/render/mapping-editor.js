import { APP_LABELS, STEP_LIMITS, SUPPORTED_PRESS_KEYS } from '../constants.js';
import { getSequencePresetsForApp } from '../sequence-presets.js';
import { getResolvedSteps } from '../services/mapping.js';
import { displayKeyToken, escapeHtml } from '../utils/dom.js';
import { renderDropdown } from './dropdown.js';

const BLOCK_DEFS = [
  {
    type: 'keyCombo',
    label: 'Shortcut',
    toneClass: 'kp-shortcut',
    color: '#7F77DD'
  },
  {
    type: 'keyPress',
    label: 'Press key',
    toneClass: 'kp-keypress',
    color: '#D85A30'
  },
  {
    type: 'text',
    label: 'Type text',
    toneClass: 'kp-text',
    color: '#378ADD'
  },
  {
    type: 'delay',
    label: 'Wait',
    toneClass: 'kp-pause',
    color: '#1D9E75'
  },
  {
    type: 'repeatKeyPress',
    label: 'Repeat key',
    toneClass: 'kp-repeat',
    color: '#BA7517',
    advanced: true
  }
];

function getBlockDef(type) {
  return BLOCK_DEFS.find((entry) => entry.type === type) || BLOCK_DEFS[0];
}

function formatDelayValue(step, editorState, index) {
  const unit = editorState.blockEditor?.delayUnits?.[`${editorState.selectedApp}:${editorState.selectedPlatform}:${index}`] || 'seconds';
  const durationMs = Number(step.durationMs) || 150;
  const value = unit === 'milliseconds' ? durationMs : durationMs / 1000;
  return {
    unit,
    value: Number.isInteger(value) ? String(value) : String(value.toFixed(2)).replace(/\.?0+$/, '')
  };
}

function renderPressKeyOptions(selectedKey) {
  return SUPPORTED_PRESS_KEYS.map((key) => ({
    value: key,
    label: key
  }));
}

function renderStepDropdown({ key, label, value, options, editorState, compact = false }) {
  return renderDropdown({
    key,
    label,
    value,
    options,
    openKey: editorState.openDropdown,
    rootClass: compact ? 'setup-select--compact' : 'setup-select--step',
    triggerClass: compact ? 'setup-select-trigger--compact' : 'setup-select-trigger--step',
    menuClass: compact ? 'setup-select-menu--compact' : 'setup-select-menu--step',
    optionClass: compact ? 'setup-select-option--compact' : 'setup-select-option--step'
  });
}

function renderStaticDropdown(value) {
  return `
    <span class="setup-select setup-select--compact is-static">
      <span class="text-input setup-select-trigger setup-select-trigger--compact">
        <span>${escapeHtml(value)}</span>
      </span>
    </span>
  `;
}

function renderPaletteBrickPreview(type) {
  if (type === 'keyCombo') {
    return `
      <span class="kp-glyph">⌨</span>
      <span class="kp-label">Shortcut</span>
      <button type="button" class="kp-record-btn" disabled>Record</button>
    `;
  }

  if (type === 'keyPress') {
    return `
      <span class="kp-glyph">↩</span>
      <span class="kp-label">Press key</span>
      <span class="kp-chip-row">
        <span class="key-chip">⌘</span>
        <span class="key-chip">Enter</span>
      </span>
      <button type="button" class="kp-record-btn" disabled>Record</button>
    `;
  }

  if (type === 'text') {
    return `
      <span class="kp-glyph">T</span>
      <span class="kp-label">Type text</span>
      <input type="text" value="Text" disabled>
    `;
  }

  if (type === 'delay') {
    return `
      <span class="kp-glyph">⏸</span>
      <span class="kp-label">Wait</span>
      <input type="number" value="0.2" disabled>
      ${renderStaticDropdown('seconds')}
    `;
  }

  return `
    <span class="kp-glyph">↻</span>
    <span class="kp-label">Repeat key</span>
    ${renderStaticDropdown('ArrowDown')}
    <input type="number" value="2" disabled>
  `;
}

function formatPlatformLabel(platform) {
  return platform === 'mac' ? 'macOS' : 'Windows';
}

function isLargeSymbolToken(token) {
  return ['Command', 'Cmd', 'Meta', 'Win', 'Option', 'Alt', 'Shift', 'Ctrl', 'Control', 'Backspace', 'Delete'].includes(token);
}

function formatSelectedApps(scopeApps = [], selectedApp) {
  if (scopeApps.length === 1) {
    return APP_LABELS[scopeApps[0]] || APP_LABELS[selectedApp] || '';
  }
  if (scopeApps.length > 1) {
    return `${scopeApps.length} apps`;
  }
  return APP_LABELS[selectedApp] || '';
}

function formatSelectedPlatforms(scopePlatforms = [], selectedPlatform) {
  if (scopePlatforms.length === 1) {
    return formatPlatformLabel(scopePlatforms[0]);
  }
  if (scopePlatforms.length > 1) {
    return 'macOS / Windows';
  }
  return formatPlatformLabel(selectedPlatform);
}

function renderLiveSentence(step, index, editorState) {
  if (step.type === 'keyCombo') {
    const isRecording = editorState.recordingTarget === index;
    const isDraft = editorState.comboDraftTarget === index;
    const savedKeys = step.keys || [];
    const displayKeys = isDraft ? editorState.comboDraftKeys : savedKeys;
    const hasKeys = displayKeys.length > 0;
    const recordLabel = hasKeys ? 'Re-record' : 'Record';

    return `
      <span class="kp-block-main">
        <span class="kp-block-label">Shortcut</span>
        <span class="kp-block-value kp-block-value--chips ${isRecording ? 'is-recording' : ''}">
          ${hasKeys ? `
            <span class="kp-chip-editor-shell ${isRecording ? 'is-recording' : ''}">
              <span class="kp-chip-row kp-chip-editor" data-kp-chip-editor="${index}">
                ${displayKeys.map((key, chipIndex) => `
                  <span
                    class="key-chip kp-key-chip is-draggable ${isLargeSymbolToken(key) ? 'is-symbol-key' : ''}"
                    data-kp-key-chip="true"
                    data-step-index="${index}"
                    data-chip-index="${chipIndex}"
                    draggable="true"
                    title="Drag to reorder"
                  >${escapeHtml(displayKeyToken(key, editorState.selectedPlatform))}</span>
                `).join('')}
              </span>
            </span>
          ` : `<span class="kp-inline-placeholder">No shortcut recorded</span>`}
          ${isRecording ? '<span class="kp-inline-status">Recording</span>' : ''}
        </span>
      </span>
      <span class="kp-block-actions">
        ${isRecording
          ? `<button type="button" class="kp-stop-btn" data-kp-stop-recording="${index}" aria-label="Stop recording"></button>`
          : `<button type="button" class="kp-record-btn" data-kp-record="${index}" aria-label="Record shortcut">${recordLabel}</button>`}
        ${hasKeys && !isRecording ? `<button type="button" class="kp-secondary-btn" data-kp-reset-combo="${index}">Clear</button>` : ''}
      </span>
    `;
  }

  if (step.type === 'keyPress') {
    const isRecording = editorState.recordingTarget === index;
    const isDraft = editorState.comboDraftTarget === index;
    const savedTokens = [...(Array.isArray(step.modifiers) ? step.modifiers : []), step.key].filter(Boolean);
    const displayTokens = isDraft ? editorState.comboDraftKeys : savedTokens;
    const hasTokens = displayTokens.length > 0;
    const recordLabel = hasTokens ? 'Re-record' : 'Record';
    return `
      <span class="kp-block-main">
        <span class="kp-block-label">Press key</span>
        <span class="kp-block-value kp-block-value--chips">
          ${hasTokens ? displayTokens.map((token) => `
            <span class="key-chip kp-key-chip ${isLargeSymbolToken(token) ? 'is-symbol-key' : ''}">${escapeHtml(displayKeyToken(token, editorState.selectedPlatform))}</span>
          `).join('') : '<span class="kp-inline-placeholder">No key recorded</span>'}
          ${isRecording ? '<span class="kp-inline-status">Recording</span>' : ''}
        </span>
      </span>
      <span class="kp-block-actions">
        ${isRecording
          ? `<button type="button" class="kp-stop-btn" data-kp-stop-recording="${index}" aria-label="Stop recording"></button>`
          : `<button type="button" class="kp-record-btn" data-kp-record="${index}" aria-label="Record key press">${recordLabel}</button>`}
        ${hasTokens && !isRecording ? `<button type="button" class="kp-secondary-btn" data-kp-reset-combo="${index}">Clear</button>` : ''}
      </span>
    `;
  }

  if (step.type === 'text') {
    const textValue = String(step.value || '').trim();
    return `
      <span class="kp-block-main kp-block-main--text">
        <span class="kp-block-label">Type text</span>
        <span class="kp-block-value kp-block-value--text">${escapeHtml(textValue || 'No text')}</span>
      </span>
      <span class="kp-block-actions kp-block-actions--text">
        <textarea
          class="kp-textarea"
          data-quando-name="value"
          data-step-index="${index}"
          rows="2"
          placeholder="Type here"
        >${escapeHtml(step.value || '')}</textarea>
      </span>
    `;
  }

  if (step.type === 'delay') {
    const delayValue = formatDelayValue(step, editorState, index);
    return `
      <span class="kp-block-main">
        <span class="kp-block-label">Wait</span>
        <span class="kp-block-value">${escapeHtml(`${delayValue.value} ${delayValue.unit === 'milliseconds' ? 'ms' : 'sec'}`)}</span>
      </span>
      <span class="kp-block-actions">
        <input type="number" step="0.05" min="0.05" data-quando-name="durationMs" data-step-index="${index}" value="${escapeHtml(delayValue.value)}">
        ${renderStepDropdown({
          key: `step:${index}:delayUnit`,
          label: 'Wait unit',
          value: delayValue.unit,
          options: [
            { value: 'seconds', label: 'seconds' },
            { value: 'milliseconds', label: 'milliseconds' }
          ],
          editorState,
          compact: true
        })}
      </span>
    `;
  }

  return `
    <span class="kp-block-main">
      <span class="kp-block-label">Repeat key</span>
      <span class="kp-block-value">${escapeHtml(`${step.key || 'Select key'} × ${Number(step.count) || 1}`)}</span>
    </span>
      <span class="kp-block-actions">
        ${renderStepDropdown({
          key: `step:${index}:repeatKey`,
        label: 'Repeat key',
        value: step.key,
        options: renderPressKeyOptions(step.key),
        editorState,
        compact: true
      })}
      <input type="number" min="1" max="${STEP_LIMITS.repeatMax}" data-quando-name="count" data-step-index="${index}" value="${Number(step.count) || 1}">
    </span>
  `;
}

function renderPresetPicker(editorState) {
  const presets = getSequencePresetsForApp(editorState.selectedApp);

  return `
    <div class="sequence-preset-picker">
      <div class="sequence-preset-picker-head">
        <strong>Preset buttons</strong>
        <button type="button" class="btn ghost step-action-button" data-close-sequence-presets="true">Close</button>
      </div>
      <div class="sequence-preset-grid">
        ${presets.map((preset) => `
          <button type="button" class="sequence-preset-card" data-sequence-preset="${preset.id}">
            <span class="sequence-preset-title">${escapeHtml(preset.label)}</span>
            <span class="sequence-preset-meta">${escapeHtml(APP_LABELS[editorState.selectedApp] || '')}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPalette(editorState, isAtLimit) {
  const expandedCategory = editorState.blockEditor?.expandedCategory || '';
  const visibleBlocks = BLOCK_DEFS;

  return `
    <aside class="kp-menu" data-kp-palette="true">
      <div class="kp-menu-groups">
        ${visibleBlocks.map((block) => `
          <section class="kp-cat ${expandedCategory === block.type ? 'is-open' : ''}">
            <button
              type="button"
              class="kp-cat-pill"
              data-kp-toggle-category="${block.type}"
              aria-expanded="${expandedCategory === block.type ? 'true' : 'false'}"
            >
              <span class="kp-cat-title kp-cat-title--${block.type}">
                <span class="kp-cat-title-text">${block.label}</span>
              </span>
            </button>
            <div class="kp-cat-blocks ${expandedCategory === block.type ? '' : 'hidden'}">
              <div
                class="quando-block kp-step kp-template kp-template-brick type-${block.type} ${isAtLimit ? 'is-disabled' : ''}"
                data-palette-step-type="${block.type}"
              >
                <div class="kp-right">
                  <div class="kp-template-brick-body ${block.toneClass}">
                    <div class="kp-template-brick-preview">
                      ${renderPaletteBrickPreview(block.type)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        `).join('')}
      </div>
    </aside>
  `;
}

function renderContextBar(editorState, stepCount) {
  const scopeApps = editorState.draft?.scope?.apps || [];
  const scopePlatforms = editorState.draft?.scope?.platforms || [];

  return `
    <div class="kp-context-bar">
      <span class="kp-context-pill">${escapeHtml(formatSelectedApps(scopeApps, editorState.selectedApp))}</span>
      <span class="kp-context-pill">${escapeHtml(formatSelectedPlatforms(scopePlatforms, editorState.selectedPlatform))}</span>
    </div>
  `;
}

function renderCanvas(steps, editorState) {
  if (!steps.length) {
    return `
      <section class="kp-script" data-kp-canvas="true">
        <div class="kp-empty" aria-hidden="true"></div>
      </section>
    `;
  }

  return `
    <section class="kp-script" data-kp-canvas="true">
      ${steps.map((step, index) => {
        const block = getBlockDef(step.type);
        return `
          <div class="quando-block kp-step kp-canvas-brick type-${step.type}" data-step-index="${index}">
            <div class="kp-step-rail" style="--kp-accent:${block.color}"></div>
            <div class="kp-right">
              <div class="kp-row kp-canvas-row kp-canvas-brick-body ${block.toneClass}">
                <span class="kp-step-index">${index + 1}</span>
                <span class="kp-block-shell">${renderLiveSentence(step, index, editorState)}</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

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
        ${renderCanvas(steps, editorState)}
      </div>
    </section>
  `;
}
