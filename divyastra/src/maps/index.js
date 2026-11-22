export { ArenaMap } from './kit/ArenaMap.js';

export const MAP_IDS = ['grass', 'desert', 'autumn', 'snow'];

/** Lazy loaders — each returns a Promise<{ default: class }> */
const MAP_LOADERS = {
  grass:  () => import('./GrassMap.js').then(m => m.GrassMap),
  desert: () => import('./DesertMap.js').then(m => m.DesertMap),
  autumn: () => import('./AutumnMap.js').then(m => m.AutumnMap),
  snow:   () => import('./SnowMap.js').then(m => m.SnowMap)
};

/**
 * createMap('desert', scene, opts) → Promise<ArenaMap>
 * Dynamically imports only the requested map, then constructs and returns it.
 */
export async function createMap(id, scene, opts = {}) {
  const loader = MAP_LOADERS[id];
  if (!loader) throw new Error(`Unknown map "${id}". Available: ${MAP_IDS.join(', ')}`);
  const Cls = await loader();
  return new Cls(scene, opts);
}
