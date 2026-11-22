import { GrassMap } from './GrassMap.js';
import { DesertMap } from './DesertMap.js';
import { AutumnMap } from './AutumnMap.js';
import { SnowMap } from './SnowMap.js';

export { ArenaMap } from './kit/ArenaMap.js';
export { GrassMap, DesertMap, AutumnMap, SnowMap };

export const MAPS = { grass: GrassMap, desert: DesertMap, autumn: AutumnMap, snow: SnowMap };
export const MAP_IDS = Object.keys(MAPS);

/**
 * createMap('desert', scene, { obstacles, anchors, floor, applyEnvironment })
 * Returns the map; call map.dispose() to remove it completely (geometry, materials, scene env).
 */
export function createMap(id, scene, opts = {}) {
  const Cls = MAPS[id];
  if (!Cls) throw new Error(`Unknown map "${id}". Available: ${MAP_IDS.join(', ')}`);
  return new Cls(scene, opts);
}
