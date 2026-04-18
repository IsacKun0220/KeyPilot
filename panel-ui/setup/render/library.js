import { BUTTON_CATEGORIES } from '../../shared/button-schema.js';
import { PRESETS } from '../presets.js';
import { state } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { renderDropdown } from './dropdown.js';
import { APP_NAV_LABELS } from '../../shared/app-meta.js';
import { renderSetupButtonCardContent } from './button-card.js';

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

export function renderLibrary(els) {
  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...BUTTON_CATEGORIES.map((category) => ({
      value: category,
      label: `${category[0].toUpperCase()}${category.slice(1)}`
    }))
  ];

  const filtersMarkup = `
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
  if (els._libraryFiltersMarkup !== filtersMarkup) {
    els.libraryFilters.innerHTML = filtersMarkup;
    els._libraryFiltersMarkup = filtersMarkup;
  }

  const libraryButtons = getFilteredLibraryButtons();
  const suggestionsMarkup = libraryButtons.map((button, index) => `
    <article
      class="suggestion-card setup-button-card ${button.actionType === 'single' ? 'is-single-button' : ''}"
      draggable="true"
      data-library-card="true"
      data-library-index="${index}"
      data-library-button-id="${escapeHtml(button.id || '')}"
      data-library-source="${escapeHtml(button.meta?.source || 'custom')}"
    >
      ${button.meta?.source === 'custom'
        ? '<button type="button" class="library-delete-button" data-delete-library-button="true" aria-label="Delete button" title="Delete button" draggable="false">✕</button>'
        : ''}
      <button type="button" class="suggestion-card-body" data-library-action="open" data-library-index="${index}">
        ${renderSetupButtonCardContent(button, { appId: state.activeApp, platform: state.os })}
      </button>
    </article>
  `).join('') || `<div class="empty-state-card">No ${escapeHtml(APP_NAV_LABELS[state.activeApp] || 'selected app')} buttons match this filter.</div>`;
  if (els._librarySuggestionsMarkup !== suggestionsMarkup) {
    els.suggestionsGrid.innerHTML = suggestionsMarkup;
    els._librarySuggestionsMarkup = suggestionsMarkup;
  }

  return libraryButtons;
}
