import { sendJson } from '../shared/http.js';

export function isPhoneClient() {
  const ua = navigator.userAgent || '';
  const uaMobile = Boolean(navigator.userAgentData?.mobile) || /iPhone|iPod|Android.+Mobile|Windows Phone|Mobile/i.test(ua);
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const narrowViewport = Math.min(window.innerWidth, window.innerHeight) <= 900;
  return uaMobile && (coarsePointer || narrowViewport);
}

export function createPanelPresenceController({ clientId, phoneClient }) {
  let presenceTimer = null;
  let disconnectSent = false;

  async function sendPresence() {
    if (!phoneClient) return;
    disconnectSent = false;
    await sendJson('/api/panel-presence', {
      method: 'POST',
      body: {
        clientId,
        isPhoneClient: true,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      }
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

  return {
    sendPresence,
    sendDisconnect,
    startPresenceHeartbeat
  };
}
