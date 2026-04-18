import { getJson, sendJson } from '../../shared/http.js';
import { normaliseConfig } from './normalise.js';

export async function loadConfig() {
  const { config } = await getJson('/api/config');
  return normaliseConfig(config);
}

export async function saveConfig(config) {
  const payload = await sendJson('/api/config', {
    method: 'PUT',
    body: { config }
  });
  return normaliseConfig(payload.config);
}

export async function loadPairing() {
  return getJson('/api/pairing');
}

export async function loadConnectionStatus() {
  return getJson('/api/panel-presence');
}

export async function loadRuntimeState() {
  return getJson('/api/state');
}
