import { agaves, banyans, pines, pots, rocks } from '../kit/vegetation.js';

/** Frozen Peaks: muted snowfield, dark slate ruins with bone snow caps, frosted stepwell. */
export const snowTheme = {
  id: 'snow',
  label: 'Frozen Peaks',
  seed: 6311,
  sky: 0xB8CCE0,
  fog: 0xB8CCE0,
  lighting: { hemiSky: 0xEAF5FF, hemiGround: 0xC4DAEE, hemiIntensity: 0.95, sun: 0xF4F9FF, sunIntensity: 1.25 },
  floor: 0xE6EEF2,
  patchLight: 0xF2F6F9,
  patchDark: 0xCDD9E2,
  path: { fill: 0xDCE8F0, edge: 0xC0D2E0, stone: 0x4B5563 },
  ledge: 0xE6EEF2,
  wall: 0x364152,
  cap: 0xEFE6D2,
  blockCap: 0xEFE6D2,
  blockCapThickness: 1.4,
  blocks: [0x3B4656, 0x2F3947, 0x485567, 0x27303C, 0x3E4B5C],
  plaza: {
    rim: 0x3F4B5A, mid: 0x4B5869, inner: 0x424F5F, seam: 0x5D6C7E,
    dais: 0xB9AE98, daisTop: 0xCDD9E2, inlay: 0xE3B04B, glow: 0xE3B04B, snowRing: 0xDCE8F0
  },
  stone: { hi: 0x5A6677, sh: 0x3F4B5A },
  snowCap: 0xEFE6D2,
  agni: { tileHi: 0xC8431E, tileSh: 0xA03314, seam: 0x78260F, curb: 0x8D9AA8, curbDk: 0x6E7B89, bowl: 0x1B1F3B },
  well: {
    frozen: true,
    treadLight: 0xDCE8F0, treadDark: 0xCDD9E2, riser: 0x8FA4B8,
    water: 0x3E6E96, waterEdge: 0x5A8AB4, pad: 0xCDD9E2,
    stone: 0x7E8B9C, stoneDk: 0x5B6777, lotus: 0x8C7EB5, crack: 0x5A8AB4, snow: 0xEFE6D2
  },
  vegetation(map) {
    pines(map, {
      groves: [[-54, -52, 13, 17], [-20, -78, 5, 8]],
      green: 0x1E4E3D, white: 0xEFE6D2, trunk: 0x3E3024, solo: 12, scale: [1.2, 1.9]
    });
    banyans(map, {
      palettes: [{ dark: 0x1E4E3D, mid: 0x2B5E4C, hi: 0x3E6E5E, cap: 0xEFE6D2, trunk: 0x35281E, root: 0x35281E }],
      feature: [[52, 46, 1.7, 0]],
      scatter: 3, scatterRange: [60, 108]
    });
    rocks(map, {
      clusters: [[-62, -34, 9, 3.2, 5], [56, 64, 9, 3.4, 5.5], [70, 48, 6], [38, 80, 5], [-30, -78, 5], [-80, 22, 6], [-70, 70, 6], [84, -34, 6], [14, 92, 5], [-92, -30, 5], [92, 30, 5], [30, -92, 5], [-28, 96, 5]],
      solo: 22,
      colors: [0x424D5C, 0x353F4C, 0x4C5868],
      cap: { color: 0xEFE6D2, sy: 0.5 },
      accent: { color: 0x505D6E, spots: [[-8, -55], [8, 58], [-55, 8], [56, -8], [-8, 68], [9, -68], [-68, -8], [68, 9]] }
    });
    agaves(map, { color: 0x3E6E5E, tint: 0x5A8A7A, solo: 30 });
    pots(map, { colors: [0x8E4A32, 0x7A3F2B, 0xA05A3A], snowCap: 0xEFE6D2 });
  }
};
