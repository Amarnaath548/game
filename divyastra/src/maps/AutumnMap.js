import { ArenaMap } from './kit/ArenaMap.js';
import { autumnTheme } from './themes/autumn.js';

/** Autumn arena: `new AutumnMap(scene, opts)` — see kit/ArenaMap.js for opts. */
export class AutumnMap extends ArenaMap {
  constructor(scene, opts = {}) { super(scene, autumnTheme, opts); }
}
