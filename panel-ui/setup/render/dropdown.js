import { escapeHtml } from '../utils/dom.js';

export function sortDropdownOptions(options, selectedValue) {
  return [...options].sort((left, right) => {
    if (left.value === selectedValue) return -1;
    if (right.value === selectedValue) return 1;
    return 0;
  });
}

export function renderDropdown({
  key,
  label,
  value,
  options,
  openKey,
  triggerClass = '',
  rootClass = '',
  menuClass = '',
  optionClass = ''
}) {
  const isOpen = openKey === key;
  const selectedOption = options.find((option) => option.value === value) || options[0];
  const orderedOptions = sortDropdownOptions(options, value);

  return `
    <div class="setup-select ${rootClass} ${isOpen ? 'is-open' : ''}" data-dropdown="${escapeHtml(key)}">
      <button
        type="button"
        id="${escapeHtml(key)}"
        class="text-input setup-select-trigger ${triggerClass}"
        data-toggle-dropdown="${escapeHtml(key)}"
        aria-expanded="${isOpen ? 'true' : 'false'}"
        aria-haspopup="listbox"
      >
        <span>${escapeHtml(selectedOption?.label || '')}</span>
        <span class="setup-select-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="setup-select-menu ${menuClass}" role="listbox" aria-label="${escapeHtml(label)}">
        ${orderedOptions.map((option) => `
          <button
            type="button"
            class="setup-select-option ${optionClass} ${option.value === value ? 'active' : ''}"
            data-dropdown-choice="${escapeHtml(key)}"
            data-dropdown-value="${escapeHtml(option.value)}"
            role="option"
            aria-selected="${option.value === value ? 'true' : 'false'}"
          >
            ${escapeHtml(option.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}
