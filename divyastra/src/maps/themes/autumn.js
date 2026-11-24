import { agaves, banyans, leafPiles, pots, rocks } from '../kit/vegetation.js';

/** Harvest Hollow: warm ochre meadow, burnt-amber banyans, fallen-leaf piles. */
export const autumnTheme = {
  id: 'autumn',
  label: 'Harvest Hollow',
  seed: 5207,
  sky: 0xE8B88A,
  fog: 0xE8B88A,
  lighting: { hemiSky: 0xFFF1CF, hemiGround: 0x8A7A2A, hemiIntensity: 0.72, sun: 0xFFE9B8, sunIntensity: 1.4 },
  floor: 0x9A7A3A,
  patchLight: 0xAB8A44,
  patchDark: 0x8A5A2A,
  path: { fill: 0xD4B97A, edge: 0xBA9F64, stone: 0xDFCA8C },
  ledge: 0x8A5A2A,
  wall: 0x9E5A2A,
  cap: 0x9A7A3A,
  blocks: [0x9C5424, 0x86441C, 0xAC602C, 0x743814, 0x924C20],
  plaza: {
    rim: 0x9E998E, mid: 0xB9AE98, inner: 0xC4B298, seam: 0x5D564B,
    dais: 0xB9AE98, daisTop: 0xD6C7B2, inlay: 0xE3B04B, glow: 0xE3B04B
  },
  stone: { hi: 0xB9AE98, sh: 0x9E937E },
  snowCap: null,
  agni: { tileHi: 0xC8431E, tileSh: 0xA03314, seam: 0x78260F, curb: 0xB9AE98, curbDk: 0x9A8E7A, bowl: 0x1B1F3B },
  well: {
    treadLight: 0xD4B97A, treadDark: 0xB9AE98, riser: 0x9A855A,
    water: 0x34586E, waterEdge: 0x46728C, pad: 0x6E7830,
    stone: 0xB9AE98, stoneDk: 0x9E937E, lotus: 0xD47285
  },
  vegetation(map) {
    const palettes = [
      { dark: 0xA04418, mid: 0xB8532A, hi: 0xD97034, trunk: 0x4A3526, root: 0x4A3526 },   // warm rust orange
      { dark: 0x8A6E20, mid: 0x9A7A3A, hi: 0xB59444, trunk: 0x4A3526, root: 0x4A3526 },   // warm ochre
      { dark: 0x843014, mid: 0x9C401E, hi: 0xB8532A, trunk: 0x5A3A26, root: 0x5A3A26 }    // warm sindoor-brown
    ];
    banyans(map, {
      palettes,
      feature: [[-52, -54, 1.6, 0], [-35, -61, 1.4, 1], [52, 46, 1.65, 2]],
      scatter: 18,
      scatterPalettes: [0, 1, 2, 2, 0]
    });
    leafPiles(map, {
      colors: [0xB8532A, 0xA84A22, 0xC86E30, 0x98401A],
      piles: [[-28, -48, 5], [-46, -40, 3.5], [40, 66, 6], [55, 36, 4.5], [30, 52, 3], [-20, -66, 3.5], [66, 56, 3.5]]
    });
    rocks(map, {
      clusters: [[-62, -36, 8, 3.2, 5], [56, 64, 9, 3.4, 5.5], [70, 48, 6], [38, 80, 5], [-30, -78, 6], [-80, 22, 6], [-70, 70, 6], [84, -34, 6], [14, 92, 5], [-92, -30, 5], [92, 30, 5], [30, -92, 5], [-28, 96, 5]],
      solo: 24,
      colors: [0x8A8E88, 0x747872, 0x989C96],
      cap: { color: 0x9A7A3A, sy: 0.42 },
      accent: { color: 0x9E5A2A, spots: [[-8, -55], [8, 58], [-55, 8], [56, -8], [-8, 68], [9, -68], [-68, -8], [68, 9]] }
    });
    agaves(map, { color: 0x9A7A3A, tint: 0x8A5A2A, solo: 36 });
    pots(map, { colors: [0xA84A22, 0x903A18, 0xB85A2E] });
  }
};
