# Divyastra arena maps (standalone)

Four self-contained arena maps built from one shared kit. Nothing here touches your game
files — drop the `src/maps/` folder (and optionally `maps-preview.html`) into the project.

| id       | class       | look                                                                          |
|----------|-------------|-------------------------------------------------------------------------------|
| `grass`  | `GrassMap`  | lime meadow, green banyans, mossy boulders (the original arena look)          |
| `desert` | `DesertMap` | golden sand, red-rock outcrops, palm oasis, saguaro cacti, turquoise stepwell |
| `autumn` | `AutumnMap` | olive-gold meadow, orange / mustard / rust banyans, fallen-leaf piles         |
| `snow`   | `SnowMap`   | ice-blue snowfield, slate ruins with snow caps, snow pines, frozen stepwell   |

## Preview now (no game code needed)
```
npm run dev      # then open  /maps-preview.html
```
Buttons / keys 1-4 switch maps; drag = orbit, wheel = zoom.

## Use in the game
```js
import { createMap } from './maps/index.js';

this.map?.dispose();                                   // removes everything it added
this.map = createMap('desert', this.scene, {
  obstacles: this.obstacles,        // pillar + torana colliders are pushed here ({x, z, radius})
  floor: false,                     // true (default) = the map builds its own floor disc
  applyEnvironment: true,           // sets scene.background + fog from the theme
  // anchors: { chests, crystals, pads, suryas, braziers, bushes, mythicChest }  // see kit/layout.js
});
this.map.applyLighting(this.hemiLight, this.dirLight); // optional; snow needs cool light or white reads beige
floorMesh.material.color.setHex(this.map.floorColor);  // if you keep your own floor
```
* A map **replaces** WorldTerrain / WorldEnvironment / WorldLandmarks for that scene — don't run both.
* `dispose()` frees geometry, materials and scene env, but cannot remove entries it pushed into your
  `obstacles` array; reset that array when you swap maps.
* If your updated game moved chests / pads / crystals / braziers / suryas / bushes / the mythic chest,
  pass them via `anchors` so decoration stays clear of them (defaults match the previous build).
* The mythic chest prop is **not** part of the map; the map builds a dais + glow at `anchors.mythicChest`
  (dais top is y = 0.4, so seat the chest at that height).
* The purple storm cylinder is your `ZoneSystem` — the maps only build the cliff rim around the arena edge.

## Layout
```
src/maps/
  index.js                 createMap(), MAPS, MAP_IDS
  GrassMap.js DesertMap.js AutumnMap.js SnowMap.js
  themes/*.js              one data file per map (palette + which props to scatter)
  kit/ArenaMap.js          shared structure: terrain, roads, rim, plaza, pillars, arches, Agni platform, stepwell
  kit/vegetation.js        banyans, palms, cacti, snow pines, boulders, agave, pots, leaf piles, tufts, pebbles, ring walls
  kit/layout.js            landmark positions + anchor-aware isClear()
  kit/geo.js               geometry / material helpers
```

## Adding another map
Copy a file in `themes/`, change the colours, pick/compose builders in `vegetation(map)`, and add a
3-line class + one entry in `index.js`. Builders are seeded (`theme.seed`) so layouts are deterministic.

## Cost
All repeated props are instanced and flat-shaded; everything lives under one `Group`
(`map.root`) so you can also toggle `map.root.visible`. Verified: cycling all four maps repeatedly
leaves scene children and GPU geometry counts unchanged (no leaks).
