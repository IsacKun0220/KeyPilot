import { BUTTON_CATEGORIES } from '../../shared/button-schema.js';
import { PRESETS } from '../presets.js';
import { state } from '../state.js';
import { escapeHtml, createButtonMarkup } from '../utils/dom.js';
import { getResolvedSteps } from '../services/mapping.js';
import { renderDropdown } from './dropdown.js';

export function getFilteredLibraryPresets() {
  return PRESETS.filter((button) => button.scope.apps.includes(state.activeApp))
    .filter((button) => state.libraryFilters.category === 'all' || button.category === state.libraryFilters.category)
    .filter((button) => state.libraryFilters.source === 'all' || button.meta.source === state.libraryFilters.source)
    .filter((button) => {
      const query = state.libraryFilters.query.trim().toLowerCase();
      if (!query) return true;
      return [button.label, button.category, button.actionType].join(' ').toLowerCase().includes(query);
    });
}

function previewText(button) {
  const steps = getResolvedSteps(button, state.activeApp, state.os);
  if (!steps.length) return 'No mapping';
  return steps.map((step) => {
    if (step.type === 'keyCombo') return step.keys.join(' + ');
    if (step.type === 'keyPress') return step.key;
    if (step.type === 'text') return `"${step.value}"`;
    if (step.type === 'delay') return `${step.durationMs}ms`;
    return `${step.key} × ${step.count}`;
  }).join(' • ');
}

function formatActionTypeLabel(actionType) {
  if (actionType === 'sequence') return 'Sequence button';
  return 'Shortcut button';
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
    <input id="librarySearchInput" class="text-input library-search-input" type="search" value="${escapeHtml(state.libraryFilters.query)}" placeholder="Search preset buttons">
    ${renderDropdown({
      key: 'libraryCategoryFilter',
      label: 'Library category',
      value: state.libraryFilters.category,
      options: categoryOptions,
      openKey: state.libraryFilters.openDropdown,
      rootClass: 'library-filter-dropdown'
    })}
  `;

  const presets = getFilteredLibraryPresets();
  els.suggestionsGrid.innerHTML = presets.map((button, index) => `
    <button type="button" class="suggestion-card" data-preset-index="${index}">
      <div class="shortcut-icon">${createButtonMarkup(button)}</div>
      <div class="shortcut-label">${escapeHtml(button.label)}</div>
      <div class="suggestion-meta">${escapeHtml(formatActionTypeLabel(button.actionType))}</div>
      <div class="suggestion-preview">${escapeHtml(previewText(button))}</div>
    </button>
  `).join('') || '<div class="empty-state-card">No presets match this filter.</div>';

  return presets;
}
