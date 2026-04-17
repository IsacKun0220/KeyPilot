import { normaliseConfig } from '../setup/services/normalise.js';
import { getResolvedSteps } from '../setup/services/mapping.js';
import { postTrigger } from './actions.js';
import { renderPanel } from './render.js';
import { panelState } from './state.js';

const channel = new BroadcastChannel('keypilot');
const clientId = crypto.randomUUID ? crypto.randomUUID() : `panel-${Date.now()}`;
const phoneClient = isPhoneClient();
let presenceTimer = null;
let statePollTimer = null;
let knownConfigVersion = -1;
let disconnectSent = false;

const els = {
  appName: document.getElementById('panelAppName'),
  track: document.getElementById('panelTrack'),
  errorToast: document.getElementById('panelErrorToast')
};

let errorToastTimer = null;
function showTriggerError(message) {
  if (!els.errorToast) return;
  els.errorToast.textContent = message || 'Button failed';
  els.errorToast.hidden = false;
  clearTimeout(errorToastTimer);
  errorToastTimer = setTimeout(() => {
    els.errorToast.hidden = true;
  }, 4000);
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

function mapPlatform(platform) {
  return platform === 'win32' ? 'win' : 'mac';
}

function isPhoneClient() {
  const ua = navigator.userAgent || '';
  const uaMobile = Boolean(navigator.userAgentData?.mobile) || /iPhone|iPod|Android.+Mobile|Windows Phone|Mobile/i.test(ua);
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const narrowViewport = Math.min(window.innerWidth, window.innerHeight) <= 900;
  return uaMobile && (coarsePointer || narrowViewport);
}

async function sendPresence() {
  if (!phoneClient) return;
  disconnectSent = false;
  await postJson('/api/panel-presence', {
    clientId,
    isPhoneClient: true,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`
  });
}

function sendDisconnect() {
  if (!phoneClient) return;
  if (disconnectSent) return;
  disconnectSent = true;
  clearInterval(presenceTimer);

  const payload = JSON.stringify({ clientId });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/panel-presence/disconnect', new Blob([payload], { type: 'application/json' }));
    return;
  }

  fetch('/api/panel-presence/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true
  }).catch(() => {});
}

function startPresenceHeartbeat() {
  if (!phoneClient) return;
  clearInterval(presenceTimer);
  sendPresence().catch(() => {});
  presenceTimer = setInterval(() => {
    sendPresence().catch(() => {});
  }, 5000);
}

async function loadRuntime() {
  const isFirstLoad = panelState.config === null;
  const [{ config, configVersion }, { platform }] = await Promise.all([
    getJson('/api/config'),
    getJson('/api/platform')
  ]);
  panelState.config = normaliseConfig(config);
  panelState.platform = mapPlatform(platform);
  // Only set activeApp from config on first load; subsequent reloads preserve the
  // detection-driven activeApp so saving from setup never jumps the panel to a
  // different app than what the server last detected.
  if (isFirstLoad) {
    panelState.activeApp = panelState.config.activeApp || 'word';
  }
  if (configVersion !== undefined) knownConfigVersion = configVersion;
  renderPanel(els);
  bindEvents();
}

async function pollServerState() {
  try {
    const { activeApp, configVersion } = await getJson('/api/state');

    // Config changed on server → reload everything
    if (knownConfigVersion !== -1 && configVersion !== knownConfigVersion) {
      await loadRuntime();
      return;
    }
    knownConfigVersion = configVersion;

    // Foreground app changed → re-render for new app
    if (
      panelState.config?.autoSwitchEnabled !== false &&
      activeApp &&
      activeApp !== panelState.activeApp
    ) {
      panelState.activeApp = activeApp;
      renderPanel(els);
      bindEvents();
    }
  } catch (_) {}
}

function startPolling() {
  clearInterval(statePollTimer);
  statePollTimer = setInterval(pollServerState, 1000);
}

function stopPolling() {
  clearInterval(statePollTimer);
}

function bindEvents() {
  els.track.querySelectorAll('[data-set-index]').forEach((button) => {
    button.addEventListener('click', () => {
      panelState.activeSetByApp[panelState.activeApp] = Number(button.dataset.setIndex);
      renderPanel(els);
      bindEvents();
    });
  });

  els.track.querySelectorAll('[data-button-id]').forEach((buttonEl) => {
    buttonEl.addEventListener('click', async () => {
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
    });
  });
}

channel.addEventListener('message', (event) => {
  if (event.data?.type === 'config-updated') {
    loadRuntime().catch(() => {});
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopPolling();
  } else {
    if (phoneClient) sendPresence().catch(() => {});
    // On wake: first reload fresh config so buttons update immediately, then
    // check activeApp from server detection so the set switches without waiting
    // for the next 1-second poll tick.
    loadRuntime()
      .then(() => pollServerState())
      .catch(() => {});
    startPolling();
  }
});

window.addEventListener('pagehide', sendDisconnect);
window.addEventListener('beforeunload', sendDisconnect);

loadRuntime()
  .then(() => {
    startPresenceHeartbeat();
    startPolling();
  })
  .catch(() => {});
