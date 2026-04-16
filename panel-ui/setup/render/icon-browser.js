import { DEFAULT_ICON_ID, ICON_LIBRARY, getIconLabel, renderIconGraphic, searchIcons } from '../../shared/icons/index.js';
import { escapeHtml } from '../utils/dom.js';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All', iconIds: null },
  { id: 'review', label: 'Review', iconIds: ['comment', 'message-square', 'highlighter', 'clipboard', 'sticky-note'] },
  { id: 'formatting', label: 'Formatting', iconIds: ['bold', 'italic', 'type', 'pilcrow', 'text-cursor', 'highlighter'] },
  { id: 'insert', label: 'Insert', iconIds: ['link', 'plus', 'file-plus', 'quote', 'clipboard'] },
  { id: 'presentation', label: 'Presentation', iconIds: ['presentation', 'copy', 'layers', 'sticky-note', 'plus'] },
  { id: 'spreadsheet', label: 'Spreadsheet', iconIds: ['chart-column', 'sigma', 'funnel', 'table', 'calendar'] },
  { id: 'general', label: 'General', iconIds: ['wand-sparkles', 'save', 'search', 'target', 'folder', 'undo', 'redo'] }
];

export function getIconBrowserResults(query = '', category = 'all') {
  const results = searchIcons(query);
  const filter = CATEGORY_FILTERS.find((item) => item.id === category);
  if (!filter || !filter.iconIds) {
    return results;
  }
  const allow = new Set(filter.iconIds);
  const themed = results.filter((icon) => allow.has(icon.id));
  if (query || themed.length) {
    return themed;
  }
  return ICON_LIBRARY.filter((icon) => allow.has(icon.id));
}

export function renderIconBrowser(editorState) {
  if (!editorState.iconBrowser.open) {
    return '';
  }

  const { query, category, pendingIconId } = editorState.iconBrowser;
  const results = getIconBrowserResults(query, category);
  const selection = pendingIconId || editorState.draft.iconId || DEFAULT_ICON_ID;

  return `
    <div class="editor-dialog-backdrop" data-close-icon-browser="true"></div>
    <section class="icon-browser-dialog" aria-label="Browse icons">
      <div class="icon-browser-head">
        <div>
          <h3>Browse all icons</h3>
          <p>Search the full library, then apply one icon to this shortcut.</p>
        </div>
        <button type="button" class="btn ghost" data-close-icon-browser="true">Close</button>
      </div>
      <div class="icon-browser-toolbar">
        <input id="iconBrowserSearch" class="text-input" type="text" value="${escapeHtml(query)}" placeholder="Search icons">
        <div class="icon-browser-filters">
          ${CATEGORY_FILTERS.map((filter) => `
            <button type="button" class="filter-pill ${category === filter.id ? 'active' : ''}" data-icon-filter="${filter.id}">
              ${filter.label}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="icon-browser-selection">
        <span class="field-label">Selected icon</span>
        <div class="icon-browser-selection-row">
          <div class="icon-browser-current">
            <span class="icon-choice-art">${renderIconGraphic(selection, selection)}</span>
            <span>${escapeHtml(getIconLabel(selection))}</span>
          </div>
          <div class="icon-browser-selection-actions">
            <button type="button" class="btn ghost" data-reset-icon="true">Reset to suggested</button>
            <button type="button" class="btn primary" data-apply-icon-browser="true">Use selected icon</button>
          </div>
        </div>
      </div>
      <div class="icon-browser-grid">
        ${results.map((icon) => `
          <button type="button" class="icon-option icon-choice ${selection === icon.id ? 'active' : ''}" data-icon-browser-choice="${icon.id}" title="${escapeHtml(icon.label)}">
            <span class="icon-choice-art">${renderIconGraphic(icon.id, icon.label)}</span>
            <span class="icon-choice-label">${escapeHtml(icon.label)}</span>
          </button>
        `).join('')}
      </div>
      ${results.length ? '' : '<div class="editor-empty-state compact"><p>No icons match that search yet.</p></div>'}
    </section>
  `;
}
