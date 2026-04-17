import { APP_GROUPS, APP_LABELS, SET_LIMIT, SLOT_LIMIT } from '../constants.js';
import { APP_ICON_FALLBACKS, APP_LOGOS, APP_NAV_LABELS } from '../../shared/app-meta.js';
import { state } from '../state.js';
import { escapeHtml, createButtonMarkup } from '../utils/dom.js';
import { getResolvedSteps } from '../services/mapping.js';

function currentApp() {
  return state.config.apps[state.activeApp];
}

function currentSet() {
  return currentApp().sets[state.activeSetIndex];
}

function renderAppTitle(appId) {
  return `
    <span class="app-title-row">
      <span class="app-title-mark">
        ${APP_ICON_FALLBACKS[appId]
          ? `<span class="app-nav-item__logo app-nav-item__logo--${appId} is-lettermark" aria-hidden="true">${escapeHtml(APP_ICON_FALLBACKS[appId])}</span>`
          : `<span class="app-nav-item__logo app-nav-item__logo--${appId}" aria-hidden="true">
              <img src="${escapeHtml(APP_LOGOS[appId] || '')}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-fallback'); this.remove();">
            </span>`}
      </span>
      <span class="app-title-name">${escapeHtml(APP_NAV_LABELS[appId] || APP_LABELS[appId] || appId)}</span>
    </span>
  `;
}

function describeButton(button) {
  const steps = getResolvedSteps(button, state.activeApp, state.os);
  if (!steps.length) return 'No action set';
  if (button.actionType === 'sequence') {
    if (steps.some((step) => step.type === 'text' && step.value)) return 'Types text as part of a short sequence';
    if (steps.some((step) => step.type === 'repeatKeyPress')) return 'Runs a short repeated action';
    return 'Runs a short multi-step action';
  }
  const first = steps[0];
  if (first.type === 'text' && first.value) return 'Types text';
  if (first.type === 'repeatKeyPress') return 'Repeats a key action';
  if (first.type === 'delay') return 'Pause action';
  if (first.type === 'keyPress') return 'Single key action';
  return 'Single shortcut';
}

export function renderSidebar(els) {
  els.sidebarNav.innerHTML = Object.entries(APP_GROUPS).map(([group, appIds]) => `
    <section class="nav-group">
      <h3>${group}</h3>
      ${appIds.map((appId) => `
        <button type="button" class="nav-item ${appId === state.activeApp ? 'active' : ''}" data-app-id="${appId}">
          ${APP_ICON_FALLBACKS[appId]
            ? `<span class="app-nav-item__logo app-nav-item__logo--${appId} is-lettermark" aria-hidden="true">${escapeHtml(APP_ICON_FALLBACKS[appId])}</span>`
            : `<span class="app-nav-item__logo app-nav-item__logo--${appId}" aria-hidden="true">
                <img src="${escapeHtml(APP_LOGOS[appId] || '')}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-fallback'); this.remove();">
              </span>`}
          <span class="nav-item-name">${escapeHtml(APP_NAV_LABELS[appId] || APP_LABELS[appId])}</span>
        </button>
      `).join('')}
    </section>
  `).join('');
}

export function renderDashboard(els) {
  const app = currentApp();
  const set = currentSet();
  els.appHeading.innerHTML = renderAppTitle(state.activeApp);

  els.setTabs.innerHTML = app.sets.map((entry, index) => `
    <div class="set-tab ${index === state.activeSetIndex ? 'active' : ''} ${state.editingSetIndex === index ? 'editing' : ''}">
      ${state.editingSetIndex === index
        ? `<input
            type="text"
            class="set-tab-input"
            data-set-name-input="${index}"
            value="${escapeHtml(state.editingSetDraft)}"
            placeholder=""
            aria-label="Set name"
          >`
        : `<button type="button" class="tab-main" data-set-index="${index}"><span class="tab-name">${escapeHtml(entry.name || '')}</span></button>`}
      ${app.sets.length > 1 ? `<button type="button" class="tab-close" data-delete-set="${index}">✕</button>` : ''}
    </div>
  `).join('') + `<button type="button" class="btn dashed" id="newSetButton" ${app.sets.length >= SET_LIMIT ? 'disabled' : ''}>+ New set</button>`;

  els.slotRow.innerHTML = new Array(SLOT_LIMIT).fill(null).map((_, index) => {
    const button = set.buttons[index];
    if (!button) {
      return `
        <div class="slot-shell" data-slot-index="${index}">
          <button type="button" class="slot-card empty" data-slot-index="${index}">
            <span class="slot-position">${index + 1}</span>
            <span class="slot-empty-icon"></span>
            <span class="empty-hint">Drop or edit</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="slot-shell" data-slot-index="${index}">
        <button type="button" class="slot-card" data-slot-index="${index}">
          <span class="slot-position">${index + 1}</span>
          <span class="remove-slot" data-remove-slot="${index}">✕</span>
          <span class="slot-icon">${createButtonMarkup(button)}</span>
          <span class="slot-copy">
            <span class="slot-label">${escapeHtml(button.label)}</span>
            <span class="slot-meta">${button.actionType === 'sequence' ? 'Sequence' : 'Shortcut'}</span>
            <span class="slot-description">${escapeHtml(describeButton(button))}</span>
          </span>
        </button>
      </div>
    `;
  }).join('');
}
