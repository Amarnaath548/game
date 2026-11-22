/**
 * Vegetation kit: tree and prop builders for arena themes.
 * Re-exports builders split across vegTrees.js, vegProps.js, and vegScatter.js.
 */

export { banyans, pines, palms, cacti } from './vegTrees.js';
export {
  rocks,
  agaves,
  pots,
  tufts,
  makeAgaveGeometry,
  makePotGeometry
} from './vegProps.js';
export { leafPiles, pebbles, ringWalls } from './vegScatter.js';
