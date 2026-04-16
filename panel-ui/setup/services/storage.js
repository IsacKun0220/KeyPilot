import { normaliseConfig } from './normalise.js';

export async function getJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function loadConfig() {
  const { config } = await getJson('/api/config');
  return normaliseConfig(config);
}

export async function saveConfig(config) {
  const payload = await getJson('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });
  return normaliseConfig(payload.config);
}

export async function loadPairing() {
  return getJson('/api/pairing');
}

export async function loadConnectionStatus() {
  return getJson('/api/panel-presence');
}
