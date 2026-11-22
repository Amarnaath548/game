import { ArenaMap } from './kit/ArenaMap.js';
import { snowTheme } from './themes/snow.js';

/** Snow arena: `new SnowMap(scene, opts)` — see kit/ArenaMap.js for opts. */
export class SnowMap extends ArenaMap {
  constructor(scene, opts = {}) { super(scene, snowTheme, opts); }
}
