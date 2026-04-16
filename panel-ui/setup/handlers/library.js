import { deepClone } from '../utils/clone.js';
import { state } from '../state.js';

let libraryBound = false;

export function initLibraryHandlers(els, getPresets, { markDirty, renderDashboard, renderLibrary, renderEditorOnly, openEditor }) {
  if (libraryBound) {
    return;
  }
  libraryBound = true;

  els.libraryFilters.addEventListener('input', (event) => {
    if (event.target.id !== 'librarySearchInput') return;
    state.libraryFilters.query = event.target.value;
    renderLibrary();
  });

  els.libraryFilters.addEventListener('click', (event) => {
    event.stopPropagation();

    const dropdownChoice = event.target.closest('[data-dropdown-choice]');
    if (dropdownChoice && dropdownChoice.dataset.dropdownChoice === 'libraryCategoryFilter') {
      state.libraryFilters.category = dropdownChoice.dataset.dropdownValue;
      state.libraryFilters.openDropdown = null;
      renderLibrary();
      return;
    }

    const dropdownToggle = event.target.closest('[data-toggle-dropdown]');
    if (dropdownToggle && dropdownToggle.dataset.toggleDropdown === 'libraryCategoryFilter') {
      state.libraryFilters.openDropdown = state.libraryFilters.openDropdown === 'libraryCategoryFilter' ? null : 'libraryCategoryFilter';
      renderLibrary();
      return;
    }

    if (!event.target.closest('[data-dropdown]') && state.libraryFilters.openDropdown) {
      state.libraryFilters.openDropdown = null;
      renderLibrary();
    }
  });

  document.addEventListener('click', (event) => {
    if (!state.libraryFilters.openDropdown) return;
    if (els.libraryFilters.contains(event.target)) return;
    state.libraryFilters.openDropdown = null;
    renderLibrary();
  });

  els.customEntryButton.addEventListener('click', () => {
    openEditor(undefined, 'create');
    renderEditorOnly();
  });

  els.suggestionsGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset-index]');
    if (!button) return;

    const presets = getPresets();
    const preset = deepClone(presets[Number(button.dataset.presetIndex)]);
    const set = state.config.apps[state.activeApp].sets[state.activeSetIndex];
    const index = set.buttons.findIndex((entry) => !entry);
    if (index === -1) {
      openEditor(undefined, 'create', preset);
      renderEditorOnly();
      return;
    }
    set.buttons[index] = preset;
    markDirty();
    renderDashboard({ refreshDnd: true });
  });
}
