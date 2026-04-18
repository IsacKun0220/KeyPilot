import { APP_LABELS, STEP_LIMITS, SUPPORTED_PRESS_KEYS } from '../constants.js';
import { getSequencePresetsForApp } from '../sequence-presets.js';
import { getResolvedSteps } from '../services/mapping.js';
import { displayKeyToken, escapeHtml } from '../utils/dom.js';
import { renderDropdown } from './dropdown.js';
import { BLOCK_DEFS, DEFAULT_BLOCK_CATEGORY, getBlockDef } from './mapping-editor-defs.js';

function formatDelayValue(step, editorState, index) {
  const unit = editorState.blockEditor?.delayUnits?.[`${editorState.selectedApp}:${editorState.selectedPlatform}:${index}`] || 'seconds';
  const durationMs = Number(step.durationMs) || 250;
  const value = unit === 'milliseconds' ? durationMs : durationMs / 1000;
  return {
    unit,
    value: Number.isInteger(value) ? String(value) : String(value.toFixed(2)).replace(/\.?0+$/, '')
  };
}

function renderPressKeyOptions() {
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
      ${renderStaticDropdown('Enter')}
    `;
  }

  if (type === 'text') {
    return `
      <span class="kp-glyph">T</span>
      <span class="kp-label">Type text</span>
      <input type="text" class="kp-template-text-input" value="Text" disabled>
    `;
  }

  if (type === 'delay') {
    return `
      <span class="kp-glyph">⏸</span>
      <span class="kp-label">Wait</span>
      <input type="number" value="0.25" disabled>
      ${renderStaticDropdown('seconds')}
    `;
  }

  return `
    <span class="kp-template-repeat">
      <span class="kp-template-repeat-row">
        <span class="kp-glyph">↻</span>
        <span class="kp-label">Repeat key</span>
        ${renderStaticDropdown('ArrowDown')}
      </span>
      <span class="kp-template-repeat-row kp-template-repeat-row--controls">
        <input type="number" value="2" disabled>
        <span class="kp-template-inline-unit">times</span>
      </span>
    </span>
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
    const recordLabel = hasKeys ? 'Reset' : 'Record';
    const statusMarkup = isRecording
      ? `
        <span class="kp-recording-inline">
          <span class="kp-recording-dot" aria-hidden="true"></span>
          <span class="kp-inline-status-text">Recording</span>
        </span>
      `
      : (!hasKeys ? '<span class="kp-inline-placeholder">No shortcut recorded</span>' : '<span class="kp-inline-placeholder kp-inline-placeholder--empty" aria-hidden="true"></span>');

    return `
      <span class="kp-block-main">
        <span class="kp-block-label" data-kp-drag-handle="true">Shortcut</span>
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
          ` : ''}
        </span>
        <span class="kp-shortcut-footer">
          <span class="kp-shortcut-status-row">${statusMarkup}</span>
          <span class="kp-shortcut-action-row">
            ${isRecording
              ? `<button type="button" class="kp-stop-btn" data-kp-stop-recording="${index}" aria-label="Stop recording"></button>`
              : `<button type="button" class="kp-record-btn" data-kp-record="${index}" aria-label="Record shortcut">${recordLabel}</button>`}
          </span>
        </span>
      </span>
      <span class="kp-block-actions kp-block-actions--empty"></span>
    `;
  }

  if (step.type === 'keyPress') {
    return `
      <span class="kp-block-main">
        <span class="kp-block-label" data-kp-drag-handle="true">Press key</span>
        <span class="kp-block-value kp-block-value--editor kp-block-value--controls">
          ${renderStepDropdown({
            key: `step:${index}:pressKey`,
            label: 'Press key',
            value: step.key,
            options: renderPressKeyOptions(),
            editorState,
            compact: true
          })}
        </span>
      </span>
      <span class="kp-block-actions"></span>
    `;
  }

  if (step.type === 'text') {
    return `
      <span class="kp-block-main kp-block-main--text">
        <span class="kp-block-label" data-kp-drag-handle="true">Type text</span>
        <span class="kp-block-value kp-block-value--editor kp-block-value--text-editor">
          <textarea
            class="kp-textarea kp-textarea--auto"
            data-quando-name="value"
            data-step-index="${index}"
            rows="2"
            placeholder="Type here"
          >${escapeHtml(step.value || '')}</textarea>
        </span>
      </span>
      <span class="kp-block-actions kp-block-actions--text"></span>
    `;
  }

  if (step.type === 'delay') {
    const delayValue = formatDelayValue(step, editorState, index);
    return `
      <span class="kp-block-main">
        <span class="kp-block-label" data-kp-drag-handle="true">Wait</span>
        <span class="kp-block-value kp-block-value--editor kp-block-value--controls">
          <input class="kp-number-input kp-number-input--delay" type="number" step="0.05" min="0.05" data-quando-name="durationMs" data-step-index="${index}" value="${escapeHtml(delayValue.value)}">
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
      </span>
      <span class="kp-block-actions"></span>
    `;
  }

  return `
    <span class="kp-block-main">
      <span class="kp-block-label" data-kp-drag-handle="true">Repeat key</span>
      <span class="kp-block-value kp-block-value--editor kp-block-value--controls">
        ${renderStepDropdown({
          key: `step:${index}:repeatKey`,
          label: 'Repeat key',
          value: step.key,
          options: renderPressKeyOptions(step.key),
          editorState,
          compact: true
        })}
        <input class="kp-number-input kp-number-input--count" type="number" min="1" max="${STEP_LIMITS.repeatMax}" data-quando-name="count" data-step-index="${index}" value="${Number(step.count) || 1}">
        <span class="kp-inline-unit">times</span>
      </span>
    </span>
    <span class="kp-block-actions"></span>
  `;
}

export function renderPresetPicker(editorState) {
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

export function renderPalette(editorState, isAtLimit) {
  const expandedCategory = editorState.blockEditor?.expandedCategory || DEFAULT_BLOCK_CATEGORY;

  return `
    <aside class="kp-menu" data-kp-palette="true">
      <div class="kp-palette-dropzone" data-kp-palette-dropzone="true" aria-hidden="true"></div>
      <div class="kp-menu-groups">
        ${BLOCK_DEFS.map((block) => `
          <section class="kp-cat ${expandedCategory === block.type ? 'is-open' : ''}" data-kp-category="${block.type}">
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

export function renderContextBar(editorState) {
  const scopeApps = editorState.draft?.scope?.apps || [];
  const scopePlatforms = editorState.draft?.scope?.platforms || [];

  return `
    <div class="kp-context-bar">
      <span class="kp-context-pill">${escapeHtml(formatSelectedApps(scopeApps, editorState.selectedApp))}</span>
      <span class="kp-context-pill">${escapeHtml(formatSelectedPlatforms(scopePlatforms, editorState.selectedPlatform))}</span>
    </div>
  `;
}

export function renderCanvas(button, editorState) {
  const steps = getResolvedSteps(button, editorState.selectedApp, editorState.selectedPlatform);
  if (!steps.length) {
    return `
      <section class="kp-script" data-kp-canvas="true" data-kp-step-count="0">
        <div class="kp-script-scroll">
          <div class="kp-empty" aria-hidden="true"></div>
        </div>
      </section>
    `;
  }

  return `
    <section class="kp-script" data-kp-canvas="true" data-kp-step-count="${steps.length}">
      <div class="kp-script-scroll">
        ${steps.map((step, index) => {
          const block = getBlockDef(step.type);
          const isDropdownOpen = editorState.openDropdown?.startsWith(`step:${index}:`);
          return `
            <div class="quando-block kp-step kp-canvas-brick type-${step.type} ${isDropdownOpen ? 'is-dropdown-open' : ''}" data-step-index="${index}" data-kp-step-type="${step.type}">
              <div class="kp-step-rail" data-kp-drag-handle="true" style="--kp-accent:${block.color}"></div>
              <div class="kp-right">
                <div class="kp-row kp-canvas-row kp-canvas-brick-body ${block.toneClass}">
                  <span class="kp-step-index" data-kp-drag-handle="true">${index + 1}</span>
                  <span class="kp-block-shell">${renderLiveSentence(step, index, editorState)}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}
