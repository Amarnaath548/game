/**
 * Map layout: landmark placement + gameplay anchor points that decoration must stay clear of.
 * Defaults match the current game. Pass `anchors` overrides to createMap() if your updated
 * game moved chests / pads / crystals / braziers / bushes / suryas.
 */
export const DEFAULT_ANCHORS = {
  mythicChest: [0, -12],
  chests: [
    [-20, -20], [20, -20], [-20, 20], [20, 20],
    [-45, -25], [45, -25], [-45, 25], [45, 25],
    [0, 50], [0, -50], [-50, 0], [50, 0],
    [-75, -40], [75, -40], [-75, 40], [75, 40],
    [40, 70], [-40, -70], [70, 40], [-70, -40],
    [-90, 0], [90, 0], [0, -90], [0, 90]
  ],
  crystals: [[-35, 0], [35, 0], [0, -35], [0, 35], [-60, -60], [60, 60], [-60, 60], [60, -60]],
  bushes: [[-20, -12], [20, 12], [-15, 28], [15, -28], [-42, 15], [42, -15]],
  pads: [[35, 0], [-35, 0], [0, 35], [0, -35]],
  suryas: [[25, 25], [-25, 25], [25, -25], [-25, -25]],
  braziers: [[-25, 50], [55, -15], [-45, -45], [25, -55]]
};

export const LANDMARKS = {
  plazaR: 15.5,
  ringRoad: [18.6, 24.0],
  toranaR: 62,
  innerToranaR: 24,
  pathHalfW: 3.3,
  pathEndR: 96,
  stepwell: { x: -38, z: 34, r: 12 },
  agni: { x: 38, z: -38, r: 13, rot: 0.62 }
};

export function makeLayout(radius = 120, overrides = {}) {
  const A = { ...DEFAULT_ANCHORS, ...overrides };
  const L = LANDMARKS;
  const keep = [
    ...A.chests.map(([x, z]) => [x, z, 2.2]),
    [A.mythicChest[0], A.mythicChest[1], 3.4],
    ...A.crystals.map(([x, z]) => [x, z, 2.2]),
    ...A.bushes.map(([x, z]) => [x, z, 3.4]),
    ...A.pads.map(([x, z]) => [x, z, 2.4]),
    ...A.suryas.map(([x, z]) => [x, z, 2.4]),
    ...A.braziers.map(([x, z]) => [x, z, 2.4]),
    [0, -L.innerToranaR, 3.2], [0, L.innerToranaR, 3.2], [-L.innerToranaR, 0, 3.2], [L.innerToranaR, 0, 3.2],
    [0, -L.toranaR, 3.6], [0, L.toranaR, 3.6], [-L.toranaR, 0, 3.6], [L.toranaR, 0, 3.6],
    [L.stepwell.x, L.stepwell.z, L.stepwell.r],
    [L.agni.x, L.agni.z, L.agni.r]
  ];

  /** True when circle (x, z, r) avoids anchors, plaza, ring road, the cross paths and the rim. */
  function isClear(x, z, r = 1, { paths = true, rim = 4 } = {}) {
    const d = Math.hypot(x, z);
    if (d > radius - rim - r) return false;
    if (paths) {
      if (d < L.ringRoad[1] + r + 0.5) return false;
      if (Math.abs(x) < L.pathHalfW + r + 0.8 && Math.abs(z) < L.pathEndR + 6) return false;
      if (Math.abs(z) < L.pathHalfW + r + 0.8 && Math.abs(x) < L.pathEndR + 6) return false;
    }
    for (const [kx, kz, kr] of keep) {
      if (Math.hypot(x - kx, z - kz) < kr + r) return false;
    }
    return true;
  }

  return { anchors: A, landmarks: L, isClear };
}
