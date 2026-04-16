import { APP_LABELS } from '../constants.js';
import { getResolvedSteps } from '../services/mapping.js';
import { createButtonMarkup, escapeHtml } from '../utils/dom.js';

function titleCase(value = '') {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatList(items = []) {
  if (!items.length) return 'Not set';
  if (items.length <= 2) return items.join(', ');
  return `${items.length} selected`;
}

function formatUseOnLabel(platformId) {
  return platformId === 'mac' ? 'macOS' : 'Windows';
}

export function renderPreviewCard(button, editorState) {
  const appLabels = button.scope.apps.map((appId) => APP_LABELS[appId]);
  const platformLabels = button.scope.platforms.map((platform) => formatUseOnLabel(platform));
  const focusedAppLabel = APP_LABELS[editorState.selectedApp] || appLabels[0] || 'Selected app';
  const shortcutSummary = button.scope.platforms.map((platform) => {
    const steps = getResolvedSteps(button, editorState.selectedApp, platform);
    return `${formatUseOnLabel(platform)}: ${steps.length ? `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}` : 'Not set'}`;
  }).join('  |  ');

  return `
    <section class="panel-card preview-card">
      <div class="card-heading">
        <h3>Preview</h3>
        <p>See how the button will look.</p>
      </div>
      <div class="shortcut-preview-card">
        <div class="shortcut-preview-shell">
          <div class="shortcut-preview-button">
            <span class="slot-icon preview-icon">${createButtonMarkup(button)}</span>
            <div class="shortcut-preview-copy">
              <span class="slot-label">${escapeHtml(button.label || 'Button name')}</span>
              <span class="preview-category">${escapeHtml(titleCase(button.category))}${button.actionType ? ` · ${escapeHtml(titleCase(button.actionType))}` : ''}</span>
            </div>
          </div>
          <div class="preview-summary-grid">
            <div class="preview-summary-item">
              <span class="preview-summary-label">Works in</span>
              <strong>${escapeHtml(formatList(appLabels))}</strong>
            </div>
            <div class="preview-summary-item">
              <span class="preview-summary-label">Use on</span>
              <strong>${escapeHtml(platformLabels.join(', ') || 'Not set')}</strong>
            </div>
          </div>
          <div class="preview-mapping-panel">
            <div class="preview-mapping-panel-head">
              <span class="field-label">Shortcut shown for</span>
              <strong>${escapeHtml(focusedAppLabel)}</strong>
            </div>
            <div class="preview-mapping-list preview-mapping-list-compact">
              <span class="preview-empty ${shortcutSummary ? 'has-value' : ''}">${escapeHtml(shortcutSummary || 'Not set')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
