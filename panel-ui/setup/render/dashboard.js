import { APP_GROUPS, APP_LABELS, SET_LIMIT, SLOT_LIMIT } from '../constants.js';
import { APP_ICON_FALLBACKS, APP_LOGOS, APP_NAV_LABELS } from '../../shared/app-meta.js';
import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { renderSetupButtonCardContent } from './button-card.js';

function currentApp() {
  return state.config.apps[state.activeApp];
}

function currentSet() {
  return currentApp().sets[state.activeSetIndex];
}

function renderSlotCard(button, index) {
  if (!button) {
    return `
      <button type="button" class="slot-card setup-button-card empty" data-slot-index="${index}">
        <span class="slot-position">${index + 1}</span>
        <span class="slot-empty-icon"></span>
        <span class="empty-hint">Drop or edit</span>
      </button>
    `;
  }

  return `
    <button type="button" class="slot-card setup-button-card ${button.actionType === 'single' ? 'is-single-button' : ''}" data-slot-index="${index}" draggable="true">
      <span class="slot-position">${index + 1}</span>
      <span class="remove-slot" data-remove-slot="${index}" aria-label="Remove from slot" title="Remove from slot">✕</span>
      ${renderSetupButtonCardContent(button, { appId: state.activeApp, platform: state.os })}
    </button>
  `;
}

function ensureSlotShells(els) {
  const slotShells = [...(els.slotRow?.querySelectorAll('.slot-shell') || [])];
  const hasPermanentShells = slotShells.length === SLOT_LIMIT
    && slotShells.every((shell, index) => Number(shell.dataset.slotIndex) === index);

  if (hasPermanentShells) {
    return slotShells;
  }

  const shellsMarkup = Array.from({ length: SLOT_LIMIT }, (_, index) => `
    <div class="slot-shell" data-slot-index="${index}" data-slot-label="${index + 1}"></div>
  `).join('');
  els.slotRow.innerHTML = shellsMarkup;
  return [...els.slotRow.querySelectorAll('.slot-shell')];
}

function renderSlotRow(els, set) {
  const slotShells = ensureSlotShells(els);

  slotShells.forEach((shell, index) => {
    const cardMarkup = renderSlotCard(set.buttons[index], index);
    if (shell._slotCardMarkup === cardMarkup) {
      return;
    }
    shell.innerHTML = cardMarkup;
    shell._slotCardMarkup = cardMarkup;
  });
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

export function renderSidebar(els) {
  const markup = Object.entries(APP_GROUPS).map(([group, appIds]) => `
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
  if (els._sidebarMarkup !== markup) {
    els.sidebarNav.innerHTML = markup;
    els._sidebarMarkup = markup;
  }
}

export function renderDashboard(els) {
  const app = currentApp();
  const set = currentSet();
  const headingMarkup = renderAppTitle(state.activeApp);
  const setTabsMarkup = app.sets.map((entry, index) => `
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

  if (els._dashboardHeadingMarkup !== headingMarkup) {
    els.appHeading.innerHTML = headingMarkup;
    els._dashboardHeadingMarkup = headingMarkup;
  }
  if (els._dashboardSetTabsMarkup !== setTabsMarkup) {
    els.setTabs.innerHTML = setTabsMarkup;
    els._dashboardSetTabsMarkup = setTabsMarkup;
  }

  renderSlotRow(els, set);
}
