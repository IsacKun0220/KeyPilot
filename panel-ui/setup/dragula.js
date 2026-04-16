const dragula = globalThis.dragula;

if (typeof dragula !== 'function') {
  throw new Error('Dragula failed to load');
}

export default dragula;
