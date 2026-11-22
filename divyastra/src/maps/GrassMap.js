import { ArenaMap } from './kit/ArenaMap.js';
import { grassTheme } from './themes/grass.js';

/** Grass arena: `new GrassMap(scene, opts)` — see kit/ArenaMap.js for opts. */
export class GrassMap extends ArenaMap {
  constructor(scene, opts = {}) { super(scene, grassTheme, opts); }
}
