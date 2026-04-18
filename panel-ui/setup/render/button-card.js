import { escapeHtml, createButtonMarkup, renderKeyChips } from '../utils/dom.js';
import { getResolvedSteps } from '../services/mapping.js';

function renderSetupButtonChips(button, appId, platform) {
  if (button?.actionType === 'sequence') {
    return '';
  }

  const steps = getResolvedSteps(button, appId, platform);
  const firstStep = steps[0];
  if (!firstStep) {
    return '';
  }

  if (firstStep.type === 'keyCombo') {
    return renderKeyChips(firstStep.keys, platform);
  }

  if (firstStep.type === 'keyPress' || firstStep.type === 'repeatKeyPress') {
    return renderKeyChips([firstStep.key], platform);
  }

  return '';
}

export function renderSetupButtonCardContent(button, { appId, platform }) {
  const chipsMarkup = renderSetupButtonChips(button, appId, platform);
  return `
    <span class="setup-button-card-content">
      <span class="shortcut-icon">${createButtonMarkup(button)}</span>
      <span class="shortcut-label">${escapeHtml(button.label)}</span>
      ${chipsMarkup ? `<span class="key-chips setup-button-card-chips">${chipsMarkup}</span>` : ''}
    </span>
  `;
}
