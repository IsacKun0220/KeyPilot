import { APP_ICON_FALLBACKS, APP_LABELS, APP_LOGOS, APP_NAV_LABELS } from '../shared/app-meta.js';
import { getResolvedSteps } from '../setup/services/mapping.js';
import { escapeHtml, createButtonMarkup, renderKeyChips } from '../setup/utils/dom.js';
import { panelState } from './state.js';

function activeAppData() {
  return panelState.config?.apps?.[panelState.activeApp];
}

function activeSetIndex() {
  const count = activeAppData()?.sets?.length || 0;
  return Math.max(0, Math.min(panelState.activeSetByApp[panelState.activeApp] || 0, Math.max(count - 1, 0)));
}

function truncateValue(value = '', maxLength = 22) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function renderPanelAppTitle(appId) {
  return `
    <span class="panel-title-mark">
      ${APP_ICON_FALLBACKS[appId]
        ? `<span class="app-nav-item__logo app-nav-item__logo--${appId} is-lettermark" aria-hidden="true">${escapeHtml(APP_ICON_FALLBACKS[appId])}</span>`
        : `<span class="app-nav-item__logo app-nav-item__logo--${appId}" aria-hidden="true">
            <img src="${escapeHtml(APP_LOGOS[appId] || '')}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-fallback'); this.remove();">
          </span>`}
    </span>
    <span class="panel-title-copy">
      <span class="panel-title-name">${escapeHtml(APP_NAV_LABELS[appId] || APP_LABELS[appId] || appId)}</span>
    </span>
  `;
}

function renderButtonPreview(button) {
  const steps = getResolvedSteps(button, panelState.activeApp, panelState.platform);
  const firstStep = steps[0];
  if (!firstStep) return '';
  if (firstStep.type === 'keyCombo') {
    return renderKeyChips(firstStep.keys, panelState.platform);
  }
  if (firstStep.type === 'keyPress') {
    return renderKeyChips([firstStep.key], panelState.platform);
  }
  if (firstStep.type === 'text') {
    return `<span class="panel-step-preview">${escapeHtml(truncateValue(firstStep.value || 'Text'))}</span>`;
  }
  if (button.actionType === 'sequence') {
    const textStep = steps.find((step) => step.type === 'text' && step.value);
    if (textStep) {
      return `<span class="panel-step-preview">${escapeHtml(truncateValue(textStep.value))}</span>`;
    }
    return '<span class="panel-step-preview">Sequence</span>';
  }
  if (firstStep.type === 'repeatKeyPress') {
    return `<span class="panel-step-preview">${escapeHtml(firstStep.key)} × ${firstStep.count}</span>`;
  }
  if (firstStep.type === 'delay') {
    return '<span class="panel-step-preview">Delay</span>';
  }
  return `<span class="panel-step-preview">${escapeHtml(firstStep.type)}</span>`;
}

export function renderPanel(els) {
  const app = activeAppData();
  if (!app) return;
  const setIndex = activeSetIndex();
  const set = app.sets[setIndex] || { name: 'Main', buttons: [] };
  const slots = new Array(5).fill(null).map((_, index) => set.buttons[index] || null);

  els.appName.innerHTML = renderPanelAppTitle(panelState.activeApp);
  els.track.innerHTML = `
    <section class="panel-layout">
      <div class="panel-tabs-row">
        <section class="set-tabs panel-set-tabs">
          ${app.sets.map((entry, index) => `
            <div class="set-tab ${index === setIndex ? 'active' : ''}">
              <button type="button" class="panel-tab-main" data-set-index="${index}"><span class="tab-name">${escapeHtml(entry.name)}</span></button>
            </div>
          `).join('')}
        </section>
        <div class="panel-counter">${slots.filter(Boolean).length}/5</div>
      </div>
      <div class="panel-divider"></div>
      <div class="shortcut-grid">
        ${slots.map((button) => {
          if (!button) {
            return '<div class="shortcut-card shortcut-card-empty" aria-hidden="true"></div>';
          }
          return `
            <button type="button" class="shortcut-card" data-button-id="${escapeHtml(button.id)}">
              <div class="shortcut-icon">${createButtonMarkup(button)}</div>
              <div class="shortcut-label">${escapeHtml(button.label)}</div>
              <div class="key-chips">${renderButtonPreview(button)}</div>
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `;
}
