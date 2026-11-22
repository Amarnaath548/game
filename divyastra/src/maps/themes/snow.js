import { agaves, banyans, pines, pots, rocks } from '../kit/vegetation.js';

/** Frozen Peaks: ice-blue snowfield, slate ruins with snow caps, frozen stepwell, snow-laden pines. */
export const snowTheme = {
  id: 'snow',
  label: 'Frozen Peaks',
  seed: 6311,
  sky: 0xBFE6FF,
  fog: 0xD8EEFA,
  lighting: { hemiSky: 0xEAF5FF, hemiGround: 0xC4DAEE, hemiIntensity: 0.95, sun: 0xF4F9FF, sunIntensity: 1.25 },
  floor: 0xE7F3FB,
  patchLight: 0xFFFFFF,
  patchDark: 0xCDE3F3,
  path: { fill: 0xBDDCEF, edge: 0xA3C9E3, stone: 0x434C59 },
  ledge: 0xF4FAFF,
  wall: 0x2F3743,
  cap: 0xF4FAFF,
  blockCap: 0xF4FAFF,
  blockCapThickness: 1.4,
  blocks: [0x353E4A, 0x2A323D, 0x414B58, 0x232A34, 0x38424E],
  plaza: {
    rim: 0x39414C, mid: 0x434C58, inner: 0x3B444F, seam: 0x5B6676,
    dais: 0xBFD5E6, daisTop: 0xE3F0F8, inlay: 0xF2C14E, glow: 0xFFD54A, snowRing: 0xEAF4FB
  },
  stone: { hi: 0x4E5766, sh: 0x394250 },
  snowCap: 0xF4FAFF,
  agni: { tileHi: 0xDA6A30, tileSh: 0xC65B26, seam: 0xA94B20, curb: 0x9BA4AF, curbDk: 0x78818C, bowl: 0x5B6472 },
  well: {
    frozen: true,
    treadLight: 0xE5F1F9, treadDark: 0xC5DCEB, riser: 0x9EBDD4,
    water: 0x9DD3F1, waterEdge: 0xE1F3FD, pad: 0xEAF4FA,
    stone: 0x8C98A7, stoneDk: 0x667385, lotus: 0xA78BFA, crack: 0x6FA8CF, snow: 0xF4FAFF
  },
  vegetation(map) {
    pines(map, {
      groves: [[-54, -52, 13, 17], [-20, -78, 5, 8]],
      green: 0x2E6B3A, white: 0xF4FAFF, trunk: 0x4A3526, solo: 12, scale: [1.2, 1.9]
    });
    banyans(map, {
      palettes: [{ dark: 0x2F5F2C, mid: 0x3E7A36, hi: 0x4F9440, cap: 0xF4FAFF, trunk: 0x3B2A1F, root: 0x3B2A1F }],
      feature: [[52, 46, 1.7, 0]],
      scatter: 3, scatterRange: [60, 108]
    });
    rocks(map, {
      clusters: [[-62, -34, 9, 3.2, 5], [56, 64, 9, 3.4, 5.5], [70, 48, 6], [38, 80, 5], [-30, -78, 5], [-80, 22, 6], [-70, 70, 6], [84, -34, 6], [14, 92, 5], [-92, -30, 5], [92, 30, 5], [30, -92, 5], [-28, 96, 5]],
      solo: 22,
      colors: [0x3A424E, 0x2F3640, 0x454E5B],
      cap: { color: 0xF4FAFF, sy: 0.5 },
      accent: { color: 0x4B5563, spots: [[-8, -55], [8, 58], [-55, 8], [56, -8], [-8, 68], [9, -68], [-68, -8], [68, 9]] }
    });
    agaves(map, { color: 0x7FB8BA, tint: 0x9FD0D0, solo: 30 });
    pots(map, { colors: [0x8E4A32, 0x7A3F2B, 0xA05A3A], snowCap: 0xF4FAFF });
  }
};
