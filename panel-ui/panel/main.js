import { renderPanel } from './render.js';
import { createPanelPresenceController, isPhoneClient } from './presence.js';
import { createPanelRuntimeController } from './runtime-controller.js';
import { panelState } from './state.js';
import { createPanelUiController } from './ui-controller.js';

const els = {
  appName: document.getElementById('panelAppName'),
  track: document.getElementById('panelTrack'),
  errorToast: document.getElementById('panelErrorToast')
};

const channel = new BroadcastChannel('keypilot');
const clientId = crypto.randomUUID ? crypto.randomUUID() : `panel-${Date.now()}`;
const phoneClient = isPhoneClient();

const uiController = createPanelUiController({ els, panelState, renderPanel });
const presenceController = createPanelPresenceController({ clientId, phoneClient });
const runtimeController = createPanelRuntimeController({
  els,
  panelState,
  renderPanel,
  bindEvents: uiController.bindEvents
});

channel.addEventListener('message', (event) => {
  if (event.data?.type === 'config-updated') {
    runtimeController.loadRuntime().catch(() => {});
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    runtimeController.stopPolling();
  } else {
    if (phoneClient) presenceController.sendPresence().catch(() => {});
    runtimeController.loadRuntime()
      .then(() => runtimeController.pollServerState())
      .catch(() => {});
    runtimeController.startPolling();
  }
});

window.addEventListener('pagehide', presenceController.sendDisconnect);
window.addEventListener('beforeunload', presenceController.sendDisconnect);

runtimeController.loadRuntime()
  .then(() => {
    presenceController.startPresenceHeartbeat();
    runtimeController.startPolling();
  })
  .catch(() => {});
