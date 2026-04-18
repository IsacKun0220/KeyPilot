import '../../shared/runtime-core.js';

const { createId: createSharedId, createSlug: createSharedSlug } = globalThis.KeyPilotCore;

export function createSlug(value = '') {
  return createSharedSlug(value, 48);
}

export function createId(prefix = 'id') {
  return createSharedId(prefix);
}
