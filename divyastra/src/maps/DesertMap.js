import { ArenaMap } from './kit/ArenaMap.js';
import { desertTheme } from './themes/desert.js';

/** Desert arena: `new DesertMap(scene, opts)` — see kit/ArenaMap.js for opts. */
export class DesertMap extends ArenaMap {
  constructor(scene, opts = {}) { super(scene, desertTheme, opts); }
}
