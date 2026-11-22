import { agaves, cacti, palms, pebbles, pots, ringWalls, rocks, tufts } from '../kit/vegetation.js';

/** Sunscorched Dunes: golden sand, red-rock outcrops, palm oasis, saguaro cacti. */
export const desertTheme = {
  id: 'desert',
  label: 'Sunscorched Dunes',
  seed: 4101,
  sky: 0xFAD98E,
  fog: 0xF4C873,
  lighting: { hemiSky: 0xFFF1CC, hemiGround: 0xC98A3A, hemiIntensity: 0.75, sun: 0xFFE7B0, sunIntensity: 1.4 },
  floor: 0xF7BD3A,
  patchLight: 0xFFD35C,
  patchDark: 0xEDAC2F,
  path: { fill: 0xD47F61, edge: 0xBA664B, stone: 0xE09468 },
  ledge: 0xF4BC4B,
  wall: 0xEE8A3C,
  cap: 0xF5B04A,
  blocks: [0xE27A33, 0xCF6A2A, 0xEE9444, 0xC25D26, 0xDB7430],
  rimHeight: 1.15,
  plaza: {
    rim: 0xA9A59B, mid: 0xC8C5BA, inner: 0xB9B6AB, seam: 0x8A877D,
    dais: 0xE4B25C, daisTop: 0xF2C66C, inlay: 0xF2C14E, glow: 0xFFD54A
  },
  stone: { hi: 0xCA9068, sh: 0xA87249 },
  snowCap: null,
  agni: { tileHi: 0x9B6752, tileSh: 0x84523F, seam: 0x6A3D2D, curb: 0xBE7A55, curbDk: 0x9A5B3B, bowl: 0x5B6472 },
  well: {
    treadLight: 0xE9A767, treadDark: 0xD48D4D, riser: 0xA9663A,
    water: 0x1CC8D8, waterEdge: 0x9AF2F8, pad: 0x4CB82E,
    stone: 0xD9A474, stoneDk: 0xB98051, lotus: 0xF472B6, reeds: 0x6F9A3A
  },
  vegetation(map) {
    palms(map, {
      groves: [[-56, -50, 10, 15], [57, 50, 7, 12]],
      trunk: 0xA07F50, fronds: [0x8A9B44, 0x738F38, 0x98A84C]
    });
    rocks(map, {
      clusters: [[-60, -30, 13, 4.6, 6], [48, 62, 13, 4.6, 6], [-30, -80, 5], [72, 48, 6], [84, -34, 6], [-82, 22, 5], [14, 92, 5], [-92, -30, 5], [30, -92, 5], [-26, 96, 5]],
      solo: 22,
      colors: [0xC8502F, 0xB4442A, 0xD9633A],
      accent: { color: 0xC67A4B, spots: [[-8, -55], [8, 58], [-55, 8], [56, -8], [-8, 68], [9, -68], [-68, -8], [68, 9]] }
    });
    cacti(map, { color: 0x5CA33A, spots: [[-72, 20], [76, -10], [-44, -64], [-78, 58], [64, -48]], solo: 4 });
    ringWalls(map, { color: 0xCB8D5E, darkColor: 0xAD744A });
    agaves(map, { color: 0x8AA04A, tint: 0x6E9A52, solo: 30 });
    tufts(map, { count: 80, colors: [0xA89B4A, 0x8E8A3E, 0xB9A94F] });
    pebbles(map, { clusters: [[78, 14, 14, 5], [60, 40, 12, 6], [-52, -8, 8, 4], [20, 70, 10, 5], [-30, 60, 8, 4]], color: 0xC98458 });
    pots(map, { colors: [0xB8562B, 0xA14423, 0xC96A38] });
  }
};
