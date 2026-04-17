import { BUTTON_CATEGORIES } from '../../shared/button-schema.js';
import { PRESETS } from '../presets.js';
import { state } from '../state.js';
import { escapeHtml, createButtonMarkup } from '../utils/dom.js';
import { getResolvedSteps } from '../services/mapping.js';
import { renderDropdown } from './dropdown.js';

function currentApp() {
  return state.config.apps[state.activeApp];
}

function getCustomLibraryButtons() {
  return currentApp().customButtons || [];
}

function dedupeLibraryButtons(buttons) {
  const seen = new Set();
  return buttons.filter((button) => {
    const key = `${button.meta?.source || 'custom'}:${button.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getLibraryButtons() {
  return dedupeLibraryButtons([
    ...PRESETS.filter((button) => button.scope.apps.includes(state.activeApp)),
    ...getCustomLibraryButtons().filter((button) => button.scope.apps.includes(state.activeApp))
  ]);
}

export function getFilteredLibraryButtons() {
  return getLibraryButtons()
    .filter((button) => state.libraryFilters.category === 'all' || button.category === state.libraryFilters.category)
    .filter((button) => state.libraryFilters.source === 'all' || button.meta.source === state.libraryFilters.source)
    .filter((button) => {
      const query = state.libraryFilters.query.trim().toLowerCase();
      if (!query) return true;
      return [button.label, button.category, button.actionType, button.meta?.source || 'custom']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
}

function describeButton(button) {
  const steps = getResolvedSteps(button, state.activeApp, state.os);
  if (!steps.length) return 'No mapping';
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

function formatActionTypeLabel(actionType) {
  if (actionType === 'sequence') return 'Sequence';
  return 'Shortcut';
}

export function renderLibrary(els) {
  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...BUTTON_CATEGORIES.map((category) => ({
      value: category,
      label: `${category[0].toUpperCase()}${category.slice(1)}`
    }))
  ];

  els.libraryFilters.innerHTML = `
    <input id="librarySearchInput" class="text-input library-search-input" type="search" value="${escapeHtml(state.libraryFilters.query)}" placeholder="Search buttons">
    ${renderDropdown({
      key: 'libraryCategoryFilter',
      label: 'Library category',
      value: state.libraryFilters.category,
      options: categoryOptions,
      openKey: state.libraryFilters.openDropdown,
      rootClass: 'library-filter-dropdown'
    })}
  `;

  const libraryButtons = getFilteredLibraryButtons();
  els.suggestionsGrid.innerHTML = libraryButtons.map((button, index) => `
    <button
      type="button"
      class="suggestion-card"
      data-library-index="${index}"
      data-library-source="${escapeHtml(button.meta?.source || 'custom')}"
    >
      <div class="suggestion-card-top">
        <div class="shortcut-icon">${createButtonMarkup(button)}</div>
        <span class="suggestion-meta">${escapeHtml(formatActionTypeLabel(button.actionType))}</span>
      </div>
      <div class="suggestion-copy">
        <div class="shortcut-label">${escapeHtml(button.label)}</div>
        <div class="suggestion-preview">${escapeHtml(describeButton(button))}</div>
      </div>
    </button>
  `).join('') || '<div class="empty-state-card">No buttons match this filter.</div>';

  return libraryButtons;
}
