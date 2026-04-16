import { ICON_LIBRARY } from '../../shared/icons/index.js';

const DEFAULT_SUGGESTION_POOL = [
  'wand-sparkles',
  'clipboard',
  'comment',
  'search',
  'target',
  'save'
];

const ICON_POOL_BY_THEME = {
  review: ['comment', 'message-square', 'highlighter', 'clipboard', 'sticky-note'],
  formatting: ['bold', 'italic', 'type', 'pilcrow', 'text-cursor', 'highlighter'],
  insert: ['link', 'plus', 'file-plus', 'quote', 'clipboard'],
  presentation: ['presentation', 'copy', 'layers', 'sticky-note', 'plus'],
  spreadsheet: ['chart-column', 'sigma', 'funnel', 'table', 'calendar'],
  navigation: ['search', 'target', 'folder', 'link', 'undo'],
  editing: ['text-cursor', 'clipboard', 'type', 'undo', 'redo'],
  sequence: ['layers', 'wand-sparkles', 'copy', 'target']
};

const RULES = [
  { theme: 'review', category: 'review', keywords: ['comment', 'note', 'review', 'feedback', 'annotate', 'approve', 'reply'] },
  { theme: 'formatting', category: 'formatting', keywords: ['bold', 'italic', 'text', 'heading', 'format', 'font', 'style', 'highlight'] },
  { theme: 'insert', category: 'insert', keywords: ['link', 'footnote', 'citation', 'add', 'insert', 'quote', 'append'] },
  { theme: 'presentation', category: 'presentation', keywords: ['slide', 'present', 'notes', 'duplicate', 'deck', 'speaker'] },
  { theme: 'spreadsheet', keywords: ['chart', 'sum', 'filter', 'table', 'date', 'sheet', 'formula', 'cell'] },
  { theme: 'navigation', category: 'navigation', keywords: ['find', 'search', 'jump', 'go', 'navigate', 'focus'] },
  { theme: 'editing', category: 'editing', keywords: ['edit', 'rewrite', 'revise', 'clean', 'replace'] },
  { theme: 'sequence', actionType: 'sequence', keywords: ['workflow', 'sequence', 'macro', 'multi', 'steps'] }
];

const iconById = new Map(ICON_LIBRARY.map((icon) => [icon.id, icon]));

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function collectThemes(button = {}) {
  const labelTokens = tokenize(button.label);
  const haystack = labelTokens.join(' ');
  const themes = new Set();

  RULES.forEach((rule) => {
    const categoryMatch = rule.category && button.category === rule.category;
    const actionTypeMatch = rule.actionType && button.actionType === rule.actionType;
    const keywordMatch = rule.keywords?.some((keyword) => haystack.includes(keyword) || labelTokens.includes(keyword));
    if (categoryMatch || actionTypeMatch || keywordMatch) {
      themes.add(rule.theme);
    }
  });

  return themes;
}

function buildPool(button = {}) {
  const themes = collectThemes(button);
  const pool = [];

  themes.forEach((theme) => {
    pool.push(...(ICON_POOL_BY_THEME[theme] || []));
  });

  if (button.category && ICON_POOL_BY_THEME[button.category]) {
    pool.push(...ICON_POOL_BY_THEME[button.category]);
  }

  if (button.actionType === 'sequence') {
    pool.push(...ICON_POOL_BY_THEME.sequence);
  }

  pool.push(...DEFAULT_SUGGESTION_POOL);
  return [...new Set(pool)].filter((iconId) => iconById.has(iconId));
}

export function getSuggestedIcons(button = {}, limit = 6) {
  return buildPool(button)
    .slice(0, limit)
    .map((iconId) => iconById.get(iconId))
    .filter(Boolean);
}

export function getSuggestionCopy(button = {}) {
  const themes = [...collectThemes(button)];
  if (!themes.length) {
    return 'Suggestions update from the label, category, and action type.';
  }
  const primaryTheme = themes[0];
  const copy = {
    review: 'Review terms lean toward comments, highlights, and notes.',
    formatting: 'Formatting labels prioritise text and style icons.',
    insert: 'Insert actions surface add, link, and citation-style icons.',
    presentation: 'Presentation actions favour slides, layering, and duplication.',
    spreadsheet: 'Spreadsheet shortcuts lean toward tables, charts, and formulas.',
    navigation: 'Navigation-focused labels favour search and target icons.',
    editing: 'Editing shortcuts favour cursor, clipboard, and text tools.',
    sequence: 'Sequence actions bias toward layered workflow icons.'
  };
  return copy[primaryTheme] || 'Suggestions update from the label, category, and action type.';
}
