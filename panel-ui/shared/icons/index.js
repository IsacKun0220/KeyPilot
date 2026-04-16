import { icons as lucideIcons } from '../../node_modules/lucide/dist/esm/lucide.js';

function toKebabCase(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function toLabel(id) {
  return String(id)
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function createIcon(id, label, nodes, options = {}) {
  const aliases = options.aliases || [];
  const tags = options.tags || [];
  return {
    id,
    label,
    nodes,
    aliases,
    tags,
    searchTerms: [...new Set([id, label, ...aliases, ...tags].map((term) => String(term).toLowerCase()))]
  };
}

function iconSignature(nodes) {
  return JSON.stringify(nodes);
}

function isPreferredId(candidateId, currentId) {
  const candidateHyphens = (candidateId.match(/-/g) || []).length;
  const currentHyphens = (currentId.match(/-/g) || []).length;

  if (candidateHyphens !== currentHyphens) {
    return candidateHyphens > currentHyphens;
  }
  if (candidateId.length !== currentId.length) {
    return candidateId.length > currentId.length;
  }
  return candidateId.localeCompare(currentId) < 0;
}

function buildLucideLibrary() {
  const dedupedIcons = new Map();

  Object.entries(lucideIcons).forEach(([exportName, nodes]) => {
    if (!Array.isArray(nodes)) {
      return;
    }

    const id = toKebabCase(exportName);
    const signature = iconSignature(nodes);
    const existing = dedupedIcons.get(signature);

    if (!existing) {
      dedupedIcons.set(signature, {
        id,
        label: toLabel(id),
        nodes,
        aliases: []
      });
      return;
    }

    if (existing.id === id || existing.aliases.includes(id)) {
      return;
    }

    if (isPreferredId(id, existing.id)) {
      existing.aliases.push(existing.id);
      existing.id = id;
      existing.label = toLabel(id);
      return;
    }

    existing.aliases.push(id);
  });

  return Object.freeze([
    ...[...dedupedIcons.values()]
      .map((icon) => createIcon(icon.id, icon.label, icon.nodes, { aliases: icon.aliases }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    createIcon('comment', 'Comment', lucideIcons.MessageSquareText, {
      aliases: ['message-square-text', 'message', 'reply', 'review']
    }),
    createIcon('chart', 'Chart', lucideIcons.ChartLine, {
      aliases: ['chart-line', 'graph', 'data']
    })
  ]);
}

export const DEFAULT_ICON_ID = 'wand-sparkles';
export const ICON_LIBRARY = buildLucideLibrary();

const iconById = new Map(ICON_LIBRARY.map((icon) => [icon.id, icon]));
const aliasToIconId = new Map(ICON_LIBRARY.flatMap((icon) => (icon.aliases || []).map((alias) => [alias, icon.id])));

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getIcon(iconId) {
  return iconById.get(iconId) || null;
}

export function resolveIconId(input) {
  const candidate = String(input || '').trim().toLowerCase();
  if (!candidate) {
    return DEFAULT_ICON_ID;
  }
  if (iconById.has(candidate)) {
    return candidate;
  }
  if (aliasToIconId.has(candidate)) {
    return aliasToIconId.get(candidate);
  }
  return DEFAULT_ICON_ID;
}

export function findIconDefinition(iconId) {
  return getIcon(resolveIconId(iconId));
}

export function getIconLabel(iconId) {
  return findIconDefinition(iconId)?.label || 'Magic';
}

export function inferIconId(button = {}) {
  if (typeof button.iconId === 'string') {
    return resolveIconId(button.iconId);
  }

  return DEFAULT_ICON_ID;
}

export function searchIcons(query = '') {
  const needle = String(query).trim().toLowerCase();
  if (!needle) {
    return ICON_LIBRARY;
  }
  return ICON_LIBRARY.filter((icon) => icon.searchTerms.some((term) => term.includes(needle)));
}

export function renderIconGraphic(iconId, label = '') {
  const icon = findIconDefinition(iconId);
  if (!icon) {
    return `<span class="icon-fallback" aria-hidden="true">⌘</span>`;
  }

  const title = escapeHtml(label || icon.label);

  return `
    <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <title>${title}</title>
      ${icon.nodes.map(([tag, attributes]) => {
        const attrs = Object.entries(attributes || {})
          .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
          .join(' ');
        return `<${tag}${attrs ? ` ${attrs}` : ''}></${tag}>`;
      }).join('')}
    </svg>
  `;
}
