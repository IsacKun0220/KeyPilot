import { state } from '../state.js';

export function renderConnectionStatus(els) {
  const connected = state.connectionState.connected;
  const statusLabel = connected ? 'Connected' : 'No phone connected';
  els.connectionPill.classList.toggle('connected', connected);
  if (els.connectionText.textContent !== statusLabel) {
    els.connectionText.textContent = statusLabel;
  }
  els.dirtyBadge.classList.toggle('hidden', !state.dirty);
  renderPairingModal(els);
}

export function renderPairingModal(els) {
  const connected = state.connectionState.connected;
  const runtimeUrl = state.pairing?.runtimeUrl || '/panel.html';
  const previewUrl = state.pairing?.previewUrl || '/panel.html';

  if (els.runtimeLink) {
    const runtimeText = runtimeUrl.replace(/^https?:\/\//, '');
    if (els.runtimeLink.getAttribute('href') !== runtimeUrl) {
      els.runtimeLink.href = runtimeUrl;
    }
    if (els.runtimeLink.textContent !== runtimeText) {
      els.runtimeLink.textContent = runtimeText;
    }
  }

  if (els.previewLink) {
    if (els.previewLink.getAttribute('href') !== previewUrl) {
      els.previewLink.href = previewUrl;
    }
  }

  els.pairingModal.classList.toggle('connected', connected);
  if (els.pairingTitle) {
    const title = connected ? 'Phone connected' : 'Connect your phone';
    if (els.pairingTitle.textContent !== title) {
      els.pairingTitle.textContent = title;
    }
  }
  if (els.pairingMessage) {
    const message = connected
      ? 'Your KeyPilot panel is open. You can keep using the connected phone or preview the same panel on this computer.'
      : 'Scan the QR code from your phone to connect. The desktop panel preview is only a mockup and will not mark the phone as connected.';
    if (els.pairingMessage.textContent !== message) {
      els.pairingMessage.textContent = message;
    }
  }
  if (els.pairingSteps) {
    els.pairingSteps.classList.toggle('hidden', connected);
  }
}

export function showToast(els, message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}
