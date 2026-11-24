import { agaves, banyans, pots, rocks } from '../kit/vegetation.js';

/** Dharma Plains: muted olive-warm meadow, dark green banyans, warm stone boulders. */
export const grassTheme = {
  id: 'grass',
  label: 'Dharma Plains',
  seed: 2026,
  sky: 0xE8C9A0,
  fog: 0xE8C9A0,
  floor: 0x7A9A4A,
  patchLight: 0x8DB06A,
  patchDark: 0x6A8A3E,
  path: { fill: 0xD9C79A, edge: 0xC4B285, stone: 0xE4D4B0 },
  ledge: 0x6A8A3E,
  wall: 0xBA6B3A,
  cap: 0x7A9A4A,
  blocks: [0xB86230, 0xA85324, 0xC46E3A, 0x984618, 0xB05C2B],
  plaza: {
    rim: 0x9E998E, mid: 0xB9AE98, inner: 0xABA18D, seam: 0x7E776C,
    dais: 0xB9AE98, daisTop: 0xCEBFAB, inlay: 0xE3B04B, glow: 0xE3B04B
  },
  stone: { hi: 0xB9AE98, sh: 0x9E937E },
  snowCap: null,
  agni: { tileHi: 0xC8431E, tileSh: 0xA03314, seam: 0x78260F, curb: 0xB9AE98, curbDk: 0x9A8E7A, bowl: 0x1B1F3B },
  well: {
    treadLight: 0xD9C79A, treadDark: 0xB9AE98, riser: 0x9E8F78,
    water: 0x2E5E6E, waterEdge: 0x3F7A8C, pad: 0x4F7F3F,
    stone: 0xB9AE98, stoneDk: 0x9E937E, lotus: 0xD47285
  },
  vegetation(map) {
    banyans(map, {
      palettes: [{ dark: 0x24462C, mid: 0x2F5A3A, hi: 0x4F7F3F, trunk: 0x5C3E26, root: 0x4A301D }],
      feature: [[-52, -54, 1.55, 0], [-35, -61, 1.35, 0], [52, 46, 1.6, 0]],
      scatter: 19
    });
    rocks(map, {
      clusters: [[-62, -36, 7], [-30, -78, 6], [-18, -60, 5], [56, 62, 7], [70, 48, 6], [38, 80, 5], [-80, 22, 6], [-70, 70, 6], [84, -34, 6], [14, 92, 5], [-92, -30, 5], [92, 30, 5], [30, -92, 5], [-28, 96, 5]],
      solo: 26,
      colors: [0x8A8E88, 0x747872, 0x989C96],
      cap: { color: 0x6A8A3E, sy: 0.4 },
      accent: { color: 0xBA6B3A, spots: [[-8, -55], [8, 58], [-55, 8], [56, -8], [-8, 68], [9, -68], [-68, -8], [68, 9]] }
    });
    agaves(map, { color: 0x3D6648, solo: 40 });
    pots(map, { colors: [0xB85426, 0x9E421C, 0xC46130] });
  }
};
