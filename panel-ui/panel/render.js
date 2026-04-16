import { APP_LABELS } from '../shared/app-meta.js';
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

export function renderPanel(els) {
  const app = activeAppData();
  if (!app) return;
  const setIndex = activeSetIndex();
  const set = app.sets[setIndex] || { name: 'Main', buttons: [] };
  const slots = new Array(5).fill(null).map((_, index) => set.buttons[index] || null);

  els.appName.textContent = APP_LABELS[panelState.activeApp] || 'KeyPilot';
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
          const steps = getResolvedSteps(button, panelState.activeApp, panelState.platform);
          const firstStep = steps[0];
          const preview = !firstStep ? '' : firstStep.type === 'keyCombo'
            ? renderKeyChips(firstStep.keys, panelState.platform)
            : firstStep.type === 'keyPress'
              ? renderKeyChips([firstStep.key], panelState.platform)
              : `<span class="panel-step-preview">${escapeHtml(firstStep.type)}</span>`;
          return `
            <button type="button" class="shortcut-card" data-button-id="${escapeHtml(button.id)}">
              <div class="shortcut-icon">${createButtonMarkup(button)}</div>
              <div class="shortcut-label">${escapeHtml(button.label)}</div>
              <div class="key-chips">${preview}</div>
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `;
}
