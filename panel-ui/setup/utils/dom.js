import { renderIconGraphic } from '../../shared/icons/index.js';

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function displayKeyToken(token, platform = 'mac') {
  const labelMap = {
    Command: '⌘',
    Cmd: '⌘',
    Meta: platform === 'mac' ? '⌘' : 'Win',
    Win: platform === 'mac' ? '⌘' : 'Win',
    Option: platform === 'mac' ? '⌥' : 'Alt',
    Alt: platform === 'mac' ? '⌥' : 'Alt',
    Shift: '⇧',
    Ctrl: platform === 'mac' ? '⌃' : 'Ctrl',
    Control: platform === 'mac' ? '⌃' : 'Ctrl',
    Enter: 'Enter',
    Tab: 'Tab',
    CapsLock: 'Caps',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Escape: 'Esc',
    Backspace: '⌫',
    Delete: 'Del',
    PageUp: 'PgUp',
    PageDown: 'PgDn',
    Home: 'Home',
    End: 'End',
    Insert: 'Ins',
    PrintScreen: 'PrtSc',
    Space: 'Space'
  };
  return labelMap[token] || String(token).toUpperCase();
}

export function renderKeyChips(tokens = [], platform = 'mac') {
  return tokens
    .filter(Boolean)
    .map((token) => `<span class="key-chip">${escapeHtml(displayKeyToken(token, platform))}</span>`)
    .join('');
}

export function createButtonMarkup(button) {
  return renderIconGraphic(button.iconId, button.label);
}
