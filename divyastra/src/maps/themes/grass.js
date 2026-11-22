import { agaves, banyans, pots, rocks } from '../kit/vegetation.js';

/** Verdant Ruins: lime meadow, green banyans, mossy boulders (the original arena look). */
export const grassTheme = {
  id: 'grass',
  label: 'Verdant Ruins',
  seed: 2026,
  sky: 0x7FF5E4,
  fog: 0x7FF5E4,
  floor: 0x76C725,
  patchLight: 0xA6DE32,
  patchDark: 0x5BB81D,
  path: { fill: 0xDDB574, edge: 0xC59A58, stone: 0xEACB8F },
  ledge: 0x9ED836,
  wall: 0xD4783A,
  cap: 0x9BE02F,
  blocks: [0xD2713A, 0xBF5E2C, 0xDB8346, 0xA9531F, 0xC96A33],
  plaza: {
    rim: 0xA7A59C, mid: 0xC9C7BD, inner: 0xBAB8AE, seam: 0x8F8D84,
    dais: 0xBDBBB0, daisTop: 0xD3D1C6, inlay: 0xF2C14E, glow: 0xFFD54A
  },
  stone: { hi: 0xD9CDB0, sh: 0xB8A880 },
  snowCap: null,
  agni: { tileHi: 0xD06A3C, tileSh: 0xA94E2C, seam: 0x8C3F22, curb: 0xCDB48A, curbDk: 0xA98E64, bowl: 0x5B6472 },
  well: {
    treadLight: 0xEBCB92, treadDark: 0xCFA666, riser: 0xAD8450,
    water: 0x29A3DD, waterEdge: 0x86D6F5, pad: 0x4CB82E,
    stone: 0xD4C7A8, stoneDk: 0xB3A47F, lotus: 0xF472B6
  },
  vegetation(map) {
    banyans(map, {
      palettes: [{ dark: 0x3F8E1C, mid: 0x5BB22A, hi: 0x86D63A, trunk: 0x6B4426, root: 0x5A3A22 }],
      feature: [[-52, -54, 1.55, 0], [-35, -61, 1.35, 0], [52, 46, 1.6, 0]],
      scatter: 19
    });
    rocks(map, {
      clusters: [[-62, -36, 7], [-30, -78, 6], [-18, -60, 5], [56, 62, 7], [70, 48, 6], [38, 80, 5], [-80, 22, 6], [-70, 70, 6], [84, -34, 6], [14, 92, 5], [-92, -30, 5], [92, 30, 5], [30, -92, 5], [-28, 96, 5]],
      solo: 26,
      colors: [0x8B939A, 0x737C84, 0x9AA2A8],
      cap: { color: 0x6FC22B, sy: 0.4 },
      accent: { color: 0xB5683A, spots: [[-8, -55], [8, 58], [-55, 8], [56, -8], [-8, 68], [9, -68], [-68, -8], [68, 9]] }
    });
    agaves(map, { color: 0x35966A, solo: 40 });
    pots(map, { colors: [0xC4602F, 0xAD4A22, 0xD0733A] });
  }
};
