import { getResolvedSteps } from '../setup/services/mapping.js';
import { postTrigger } from './actions.js';

export function createPanelUiController({ els, panelState, renderPanel }) {
  let errorToastTimer = null;
  let bound = false;

  function showTriggerError(message) {
    if (!els.errorToast) return;
    els.errorToast.textContent = message || 'Button failed';
    els.errorToast.hidden = false;
    clearTimeout(errorToastTimer);
    errorToastTimer = setTimeout(() => {
      els.errorToast.hidden = true;
    }, 4000);
  }

  async function handleButtonTrigger(buttonEl) {
    const setIndex = panelState.activeSetByApp[panelState.activeApp] || 0;
    const set = panelState.config?.apps?.[panelState.activeApp]?.sets?.[setIndex];
    if (!set) return;
    const button = set.buttons.find((entry) => entry?.id === buttonEl.dataset.buttonId);
    if (!button) return;
    const steps = getResolvedSteps(button, panelState.activeApp, panelState.platform);
    if (!steps.length) return;
    console.debug('[KeyPilot] panel trigger', {
      buttonId: button.id,
      label: button.label,
      app: panelState.activeApp,
      platform: panelState.platform,
      stepCount: steps.length,
      steps
    });

    buttonEl.classList.add('pressed');
    setTimeout(() => buttonEl.classList.remove('pressed'), 120);

    try {
      await postTrigger({
        buttonId: button.id,
        app: panelState.activeApp,
        platform: panelState.platform
      });
    } catch (error) {
      console.error('KeyPilot trigger failed:', error);
      showTriggerError(error.message);
    }
  }

  function bindEvents() {
    if (bound) return;
    bound = true;

    els.track.addEventListener('click', (event) => {
      const setButton = event.target.closest('[data-set-index]');
      if (setButton && els.track.contains(setButton)) {
        panelState.activeSetByApp[panelState.activeApp] = Number(setButton.dataset.setIndex);
        renderPanel(els);
        return;
      }

      const buttonEl = event.target.closest('[data-button-id]');
      if (buttonEl && els.track.contains(buttonEl)) {
        handleButtonTrigger(buttonEl).catch(() => {});
      }
    });
  }

  return {
    bindEvents,
    showTriggerError
  };
}
