import { agaves, banyans, leafPiles, pots, rocks } from '../kit/vegetation.js';

/** Harvest Hollow: olive-gold meadow, burnt-orange banyans, fallen-leaf piles. */
export const autumnTheme = {
  id: 'autumn',
  label: 'Harvest Hollow',
  seed: 5207,
  sky: 0xEBD58A,
  fog: 0xE2CB7C,
  lighting: { hemiSky: 0xFFF1CF, hemiGround: 0x8A7A2A, hemiIntensity: 0.72, sun: 0xFFE9B8, sunIntensity: 1.4 },
  floor: 0xC6BD2D,
  patchLight: 0xE4D02E,
  patchDark: 0xA9B42A,
  path: { fill: 0xE3BA8C, edge: 0xCEA172, stone: 0xE9C79C },
  ledge: 0xF0C93A,
  wall: 0xB36A36,
  cap: 0xE8C238,
  blocks: [0xA9622F, 0x935227, 0xBC7239, 0x82461F, 0xA05A2D],
  plaza: {
    rim: 0xA9A59B, mid: 0xC9C6BA, inner: 0xBAB7AB, seam: 0x8B887E,
    dais: 0xD2CDBB, daisTop: 0xE4DFCD, inlay: 0xF2C14E, glow: 0xFFD54A
  },
  stone: { hi: 0xD9CEB3, sh: 0xB8AB8C },
  snowCap: null,
  agni: { tileHi: 0xDA6B42, tileSh: 0xC75A34, seam: 0xA94A28, curb: 0xD3C6A6, curbDk: 0xAD9F82, bowl: 0x5B6472 },
  well: {
    treadLight: 0xE9C98F, treadDark: 0xD3AB6B, riser: 0xAB8349,
    water: 0x14A99F, waterEdge: 0x86E4DA, pad: 0x55B83A,
    stone: 0xD8C08E, stoneDk: 0xB9A06E, lotus: 0xF472B6
  },
  vegetation(map) {
    const palettes = [
      { dark: 0xC85A14, mid: 0xE9741A, hi: 0xF59B33, trunk: 0x4A3526, root: 0x4A3526 },   // blazing orange
      { dark: 0xB09A1E, mid: 0xD1B72A, hi: 0xE8CE3E, trunk: 0x4A3526, root: 0x4A3526 },   // mustard
      { dark: 0x9A3C15, mid: 0xBC4E1A, hi: 0xD9672A, trunk: 0x5A3A26, root: 0x5A3A26 }    // rust red
    ];
    banyans(map, {
      palettes,
      feature: [[-52, -54, 1.6, 0], [-35, -61, 1.4, 1], [52, 46, 1.65, 2]],
      scatter: 18,
      scatterPalettes: [0, 1, 2, 2, 0]
    });
    leafPiles(map, {
      colors: [0xE8751A, 0xD9620F, 0xF2A03A, 0xC8500F],
      piles: [[-28, -48, 5], [-46, -40, 3.5], [40, 66, 6], [55, 36, 4.5], [30, 52, 3], [-20, -66, 3.5], [66, 56, 3.5]]
    });
    rocks(map, {
      clusters: [[-62, -36, 8, 3.2, 5], [56, 64, 9, 3.4, 5.5], [70, 48, 6], [38, 80, 5], [-30, -78, 6], [-80, 22, 6], [-70, 70, 6], [84, -34, 6], [14, 92, 5], [-92, -30, 5], [92, 30, 5], [30, -92, 5], [-28, 96, 5]],
      solo: 24,
      colors: [0x8D959E, 0x78818A, 0x9CA3AB],
      cap: { color: 0xE0B422, sy: 0.42 },
      accent: { color: 0xB5683A, spots: [[-8, -55], [8, 58], [-55, 8], [56, -8], [-8, 68], [9, -68], [-68, -8], [68, 9]] }
    });
    agaves(map, { color: 0xD6962C, tint: 0xB8741E, solo: 36 });
    pots(map, { colors: [0xB8562B, 0xA14423, 0xC96A38] });
  }
};
