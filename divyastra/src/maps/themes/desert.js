import { agaves, cacti, palms, pebbles, pots, ringWalls, rocks, tufts } from '../kit/vegetation.js';

/** Sunscorched Dunes: warm ochre sand, terracotta outcrops, date palms, desert scrub. */
export const desertTheme = {
  id: 'desert',
  label: 'Sunscorched Dunes',
  seed: 4101,
  sky: 0xF4D7A8,
  fog: 0xF4D7A8,
  lighting: { hemiSky: 0xFFF1CC, hemiGround: 0xC98A3A, hemiIntensity: 0.75, sun: 0xFFE7B0, sunIntensity: 1.4 },
  floor: 0xD9A864,
  patchLight: 0xE6BA78,
  patchDark: 0xC48F4E,
  path: { fill: 0xC87652, edge: 0xB0603E, stone: 0xD68966 },
  ledge: 0xC48F4E,
  wall: 0xBA6832,
  cap: 0xD9A864,
  blocks: [0xC46E2E, 0xB05C24, 0xD27C38, 0x9E4E1C, 0xB8652A],
  rimHeight: 1.15,
  plaza: {
    rim: 0x9E998E, mid: 0xB9AE98, inner: 0xC4B298, seam: 0x5D564B,
    dais: 0xC48F4E, daisTop: 0xD9A864, inlay: 0xE3B04B, glow: 0xE3B04B
  },
  stone: { hi: 0xCA9068, sh: 0xA87249 },
  snowCap: null,
  agni: { tileHi: 0x9B6752, tileSh: 0x84523F, seam: 0x6A3D2D, curb: 0xBE7A55, curbDk: 0x9A5B3B, bowl: 0x1B1F3B },
  well: {
    treadLight: 0xD9A864, treadDark: 0xC48F4E, riser: 0x9E6E38,
    water: 0x2E6E73, waterEdge: 0x3F8A8C, pad: 0x6B7A3A,
    stone: 0xC89C6A, stoneDk: 0xA67A4E, lotus: 0xD47285, reeds: 0x6B7A3A
  },
  vegetation(map) {
    palms(map, {
      groves: [[-56, -50, 10, 15], [57, 50, 7, 12]],
      trunk: 0x8F6E42, fronds: [0x6B7A3A, 0x5E6D30, 0x7A8A44]
    });
    rocks(map, {
      clusters: [[-60, -30, 13, 4.6, 6], [48, 62, 13, 4.6, 6], [-30, -80, 5], [72, 48, 6], [84, -34, 6], [-82, 22, 5], [14, 92, 5], [-92, -30, 5], [30, -92, 5], [-26, 96, 5]],
      solo: 22,
      colors: [0xB44A28, 0x9E3C1E, 0xC45632],
      accent: { color: 0xB0663C, spots: [[-8, -55], [8, 58], [-55, 8], [56, -8], [-8, 68], [9, -68], [-68, -8], [68, 9]] }
    });
    cacti(map, { color: 0x587834, spots: [[-72, 20], [76, -10], [-44, -64], [-78, 58], [64, -48]], solo: 4 });
    ringWalls(map, { color: 0xB87E52, darkColor: 0x9E6840 });
    agaves(map, { color: 0x7A8A44, tint: 0x5E6D38, solo: 30 });
    tufts(map, { count: 80, colors: [0x9A8E44, 0x827E38, 0xA89B48] });
    pebbles(map, { clusters: [[78, 14, 14, 5], [60, 40, 12, 6], [-52, -8, 8, 4], [20, 70, 10, 5], [-30, 60, 8, 4]], color: 0xB4744C });
    pots(map, { colors: [0xA84A22, 0x903A18, 0xB85A2E] });
  }
};
