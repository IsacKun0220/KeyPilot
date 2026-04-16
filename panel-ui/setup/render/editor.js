import { APP_GROUPS, BUTTON_CATEGORIES, PLATFORM_IDS, STEP_LIMITS } from '../constants.js';
import { state } from '../state.js';
import { escapeHtml, createButtonMarkup } from '../utils/dom.js';
import { getSuggestedIcons } from './icon-suggestions.js';
import { renderIconBrowser } from './icon-browser.js';
import { renderPreviewCard } from './preview-render.js';
import { renderMappingEditor } from './mapping-editor.js?v=20260415g';
import { renderDropdown } from './dropdown.js';
import { APP_ICON_FALLBACKS, APP_LOGOS, APP_NAV_LABELS } from '../../shared/app-meta.js';

const WIZARD_STEPS = [
  { title: 'Details', description: 'Name and where it works' },
  { title: 'Steps', description: 'Build what the button does' },
  { title: 'Finish', description: 'Save spot, icon, preview' }
];

function titleCase(value = '') {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatUseOnLabel(platformId) {
  return platformId === 'mac' ? 'macOS' : 'Windows';
}

function renderEditorDropdown({ key, label, value, options }) {
  return `
    <label class="field-block">
      <span class="field-label">${label}</span>
      ${renderDropdown({
        key,
        label,
        value,
        options,
        openKey: state.editor.openDropdown
      })}
    </label>
  `;
}

function renderCategoryOptions(selectedCategory) {
  return BUTTON_CATEGORIES.map((category) => ({
    value: category,
    label: titleCase(category)
  }));
}

function renderScopeAppOption(appId, isActive) {
  return `
    <label class="scope-chip-card scope-chip-card-app ${isActive ? 'active' : ''}">
      <input type="checkbox" data-scope-app="${appId}" ${isActive ? 'checked' : ''}>
      <span class="scope-chip-card-body">
        ${APP_ICON_FALLBACKS[appId]
          ? `<span class="app-nav-item__logo app-nav-item__logo--${appId} is-lettermark" aria-hidden="true">${escapeHtml(APP_ICON_FALLBACKS[appId])}</span>`
          : `<span class="app-nav-item__logo app-nav-item__logo--${appId}" aria-hidden="true">
            <img src="${escapeHtml(APP_LOGOS[appId] || '')}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-fallback'); this.remove();">
          </span>`}
        <span class="scope-chip-card-label">${escapeHtml(APP_NAV_LABELS[appId] || appId)}</span>
      </span>
    </label>
  `;
}

function renderPlatformOption(platformId, isActive) {
  return `
    <label class="scope-chip-card scope-chip-card-platform ${isActive ? 'active' : ''}">
      <input type="checkbox" data-scope-platform="${platformId}" ${isActive ? 'checked' : ''}>
      <span class="scope-chip-card-body">
        <span class="scope-chip-card-label">${escapeHtml(formatUseOnLabel(platformId))}</span>
      </span>
    </label>
  `;
}

function renderButtonDetailsCard(draft, slotButtons) {
  return `
    <section class="panel-card">
      <div class="card-heading">
        <div>
          <span class="card-kicker">Step 1</span>
          <h3>Details</h3>
          <p>Add the button details.</p>
        </div>
      </div>
      <div class="editor-form-grid setup-editor-form-grid setup-details-grid">
        <section class="setup-details-column">
          <label class="field-block">
            <span class="field-label">Button name</span>
            <input id="editorLabelInput" class="text-input" type="text" value="${escapeHtml(draft.label)}" placeholder="Find">
            <span class="context-helper">Use a short name like Find, Paste values, or Duplicate.</span>
          </label>
          ${renderEditorDropdown({
            key: 'editorCategorySelect',
            label: 'Category',
            value: draft.category,
            options: renderCategoryOptions(draft.category)
          })}
        </section>
        <section class="setup-details-column">
          <section class="scope-panel scope-panel-clean">
            <div class="field-row">
              <span class="field-label">Works in</span>
            </div>
            <div class="setup-scope-groups">
              ${Object.entries(APP_GROUPS).map(([, appIds]) => `
                <div class="scope-app-group">
                  <div class="scope-app-options">
                    ${appIds.map((appId) => renderScopeAppOption(appId, draft.scope.apps.includes(appId))).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
          <section class="scope-panel scope-panel-clean">
            <div class="field-row">
              <span class="field-label">Use on</span>
            </div>
            <div class="scope-platform-grid">
              ${PLATFORM_IDS.map((platform) => renderPlatformOption(platform, draft.scope.platforms.includes(platform))).join('')}
            </div>
          </section>
          <section class="scope-panel scope-panel-clean">
            <div class="field-row">
              <span class="field-label">Save to</span>
            </div>
            <div class="slot-picker compact">
              ${new Array(5).fill(null).map((_, index) => {
                const occupant = slotButtons[index];
                const isActive = state.editor.targetSlot === index;
                const isTaken = occupant && index !== state.editor.targetSlot;
                return `
                  <button type="button" class="slot-pill ${isActive ? 'active' : ''}" data-editor-slot="${index}">
                    ${isTaken ? escapeHtml(occupant.label) : `Button ${index + 1}`}
                  </button>
                `;
              }).join('')}
            </div>
          </section>
        </section>
      </div>
    </section>
  `;
}

function renderSuggestedIconCard(draft) {
  const suggestions = getSuggestedIcons(draft);
  const currentIconSuggested = suggestions.some((icon) => icon.id === draft.iconId);

  return `
    <section class="panel-card">
      <div class="card-heading">
        <h3>Suggested icon</h3>
        <p>Suggested from your button details.</p>
      </div>
      <div class="suggested-icon-current">
        <span class="shortcut-icon preview-icon">${createButtonMarkup(draft)}</span>
        <div class="suggested-icon-copy">
          <strong>${escapeHtml(titleCase(draft.category))}</strong>
          <span>${currentIconSuggested ? 'Using a suggested icon.' : 'Choose one or browse all.'}</span>
        </div>
      </div>
      <div class="suggested-icon-grid">
        ${suggestions.map((icon) => `
          <button type="button" class="icon-option icon-choice ${draft.iconId === icon.id ? 'active' : ''}" data-editor-icon="${icon.id}" title="${escapeHtml(icon.label)}">
            <span class="icon-choice-art">${createButtonMarkup({ iconId: icon.id, label: icon.label })}</span>
            <span class="icon-choice-label">${escapeHtml(icon.label)}</span>
          </button>
        `).join('')}
      </div>
      <div class="suggested-icon-actions">
        <button type="button" class="btn" data-open-icon-browser="true">Browse all</button>
      </div>
    </section>
  `;
}

function renderWizardHeader(currentStep) {
  const steps = WIZARD_STEPS.map((step, index) => `
    <button
      type="button"
      class="step-btn ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'done' : ''}"
      data-editor-step="${index}"
    ><span class="step-num">${index + 1}</span><span class="step-title">${step.title}</span></button>
  `);
  const withSeps = steps.reduce((acc, s, i) =>
    i === 0 ? [s] : [...acc, '<span class="step-sep" aria-hidden="true">›</span>', s], []
  );
  return `<nav class="editor-steps" aria-label="Editor steps">${withSeps.join('')}</nav>`;
}

function renderWizardFooter(currentStep, mode = 'create') {
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const hidePrimaryAction = mode === 'edit' && isLastStep;
  return `
    <footer class="editor-footer">
      <div class="editor-footer-start">
        ${currentStep === 0 ? '' : '<button type="button" class="btn" data-editor-nav="back">Back</button>'}
      </div>
      <div class="editor-footer-center">
        <span class="editor-progress-indicator">Step ${currentStep + 1} of ${WIZARD_STEPS.length}</span>
      </div>
      <div class="editor-footer-end">
        ${hidePrimaryAction
          ? ''
          : isLastStep
          ? '<button type="button" class="btn primary" data-editor-nav="save">Save</button>'
          : '<button type="button" class="btn primary" data-editor-nav="next">Next</button>'}
      </div>
    </footer>
  `;
}

export function renderEditor(els) {
  const { draft } = state.editor;
  const currentSet = state.config?.apps?.[state.activeApp]?.sets?.[state.activeSetIndex];
  const slotButtons = currentSet?.buttons || [];
  document.body.classList.toggle('editor-open', state.editor.open);
  els.setupShell?.classList.toggle('editor-open', state.editor.open);
  els.editorTitle.textContent = state.editor.mode === 'edit' ? 'Edit button' : 'Create button';
  els.editorSheet.classList.toggle('open', state.editor.open);
  els.sheetBackdrop.classList.toggle('open', state.editor.open);
  els.editorRemove.classList.toggle('hidden', state.editor.mode !== 'edit');
  els.editorRemove.textContent = state.editor.mode === 'edit' ? 'Discard' : 'Remove';
  els.editorDone.classList.toggle('hidden', state.editor.mode !== 'edit');
  els.editorDone.textContent = 'Save';
  els.editorDone.classList.add('primary');
  els.editorStatus.textContent = state.editor.validationMessage
    || (state.editor.recordingTarget !== null
      ? 'Press the keys you want, then stop.'
      : `${STEP_LIMITS.recommendedMin}-${STEP_LIMITS.recommendedMax} steps works best`);

  const currentStep = state.editor.currentStep;
  let stepContent = '';
  if (currentStep === 0) {
    stepContent = `
      <section class="editor-step-screen editor-step-screen--details active">
        <section class="editor-grid setup-step-grid">
          <div class="editor-primary-column">
            ${renderButtonDetailsCard(draft, slotButtons)}
          </div>
        </section>
      </section>
    `;
  } else if (currentStep === 1) {
    stepContent = `
      <section class="editor-step-screen editor-step-screen--steps active">
        ${renderMappingEditor(draft, state.editor)}
      </section>
    `;
  } else {
    stepContent = `
      <section class="editor-step-screen editor-step-screen--finish active">
        <section class="editor-grid appearance-step-grid">
          <div class="editor-primary-column">
            ${renderSuggestedIconCard(draft)}
          </div>
          <aside class="editor-sidebar">
            ${renderPreviewCard(draft, state.editor)}
          </aside>
        </section>
      </section>
    `;
  }

  els.editorBody.innerHTML = `
    <div class="editor-shell">
      ${renderWizardHeader(currentStep)}
      ${stepContent}
      ${renderWizardFooter(currentStep, state.editor.mode)}
      ${renderIconBrowser(state.editor)}
    </div>
  `;
}
