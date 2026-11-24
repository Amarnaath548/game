import * as THREE from 'three';
import { part, merge, lambert, decalMat, mulberry32 } from './geo.js';
import { makeAgaveGeometry } from './vegProps.js';
import { PALETTE } from '../../config/palette.js';

function addMesh(parent, geo, mat, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (opts.order !== undefined) m.renderOrder = opts.order;
  if (opts.receiveShadow) m.receiveShadow = true;
  if (opts.castShadow) m.castShadow = true;
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  parent.add(m);
  return m;
}

export function buildAgni(map) {
  const T = map.theme, A = T.agni, L = map.layout.landmarks;
  const tileHi = lambert(A.tileHi), tileSh = lambert(A.tileSh), seam = lambert(A.seam);
  const curb = lambert(A.curb), curbDk = lambert(A.curbDk);
  const snow = T.snowCap ? lambert(T.snowCap) : null;
  const grp = new THREE.Group();
  grp.position.set(L.agni.x, 0, L.agni.z); grp.rotation.y = L.agni.rot;
  grp.matrixAutoUpdate = false; grp.updateMatrix();

  const gCurbDk = [], gCurb = [], gSeam = [], gTileSh = [], gSnow = [];
  gCurbDk.push(part(new THREE.BoxGeometry(19, 0.2, 19), [0, 0.1, 0]));
  addMesh(grp, new THREE.BoxGeometry(16.4, 0.16, 16.4).translate(0, 0.26, 0), tileHi, { receiveShadow: true });

  const lineH = new THREE.PlaneGeometry(16.0, 0.09).rotateX(-Math.PI / 2);
  const lineV = new THREE.PlaneGeometry(0.09, 16.0).rotateX(-Math.PI / 2);
  for (let i = -3; i <= 3; i++) {
    gSeam.push(part(lineH, [0, 0.345, i * 2.0]));
    gSeam.push(part(lineV, [i * 2.0, 0.345, 0]));
  }
  const tile = new THREE.PlaneGeometry(1.92, 1.92).rotateX(-Math.PI / 2);
  [[-6, 2], [-2, -6], [2, 4], [6, -2], [-4, -4], [4, 6], [0, 0], [-6, 6], [6, 6]].forEach(([cx, cz]) => {
    gTileSh.push(part(tile, [cx + 1, 0.347, cz + 1]));
  });

  const half = 8.35, panel = new THREE.BoxGeometry(2.0, 0.34, 0.1);
  const addWall = (cx, cz, len, ry) => {
    gCurb.push(part(new THREE.BoxGeometry(len, 0.6, 0.7), [cx, 0.5, cz], [0, ry, 0]));
    const n = Math.max(1, Math.floor(len / 2.4));
    for (let k = 0; k < n; k++) {
      const px = -len / 2 + (k + 0.5) * (len / n);
      const c = Math.cos(ry), s = Math.sin(ry);
      gCurbDk.push(part(panel, [cx + px * c - 0.38 * s, 0.5, cz + px * s + 0.38 * c], [0, ry, 0]));
      gCurbDk.push(part(panel, [cx + px * c + 0.38 * s, 0.5, cz + px * s - 0.38 * c], [0, ry, 0]));
    }
    if (snow) {
      const c = Math.cos(ry), s = Math.sin(ry);
      const scx = cx + len * 0.05 * c, scz = cz + len * 0.05 * s;
      gSnow.push(part(new THREE.BoxGeometry(len * 0.8, 0.14, 0.62), [scx, 0.87, scz], [0, ry, 0]));
    }
  };
  addWall(0, -half, 17.3, 0); addWall(half, 0, 17.3, Math.PI / 2); addWall(-half, 0, 17.3, Math.PI / 2);
  const gap = 5.6, seg = (17.3 - gap) / 2;
  addWall(-(gap / 2 + seg / 2), half, seg, 0); addWall(gap / 2 + seg / 2, half, seg, 0);

  for (let st = 0; st < 4; st++) {
    const geo = new THREE.BoxGeometry(gap - 0.4, 0.14, 0.8);
    const pos = [0, 0.09 + st * 0.11, half + 2.3 - st * 0.8];
    if (st % 2) gCurb.push(part(geo, pos)); else gCurbDk.push(part(geo, pos));
  }

  const ped = new THREE.BoxGeometry(1.5, 1.0, 1.5);
  const bowl = new THREE.CylinderGeometry(0.85, 0.55, 0.55, 8);
  const f1 = new THREE.MeshBasicMaterial({ color: PALETTE.elements.AGNI }), f2 = new THREE.MeshBasicMaterial({ color: PALETTE.gold });
  const fg1 = new THREE.ConeGeometry(0.55, 1.2, 5), fg2 = new THREE.ConeGeometry(0.34, 1.1, 5), fg3 = new THREE.ConeGeometry(0.22, 0.7, 5);
  const gBowl = [], gF1 = [], gF2 = [];

  [[-8.5, -8.5], [8.5, -8.5], [-8.5, 8.5], [8.5, 8.5]].forEach(([bx, bz]) => {
    gCurb.push(part(ped, [bx, 0.7, bz]));
    if (snow) gSnow.push(part(new THREE.BoxGeometry(0.9, 0.12, 0.9), [bx + 0.35, 1.22, bz + 0.35]));
    gBowl.push(part(bowl, [bx, 1.45, bz]));
    gF1.push(part(fg1, [bx, 2.25, bz]));
    gF2.push(part(fg2, [bx, 2.6, bz]));
    gF1.push(part(fg3, [bx + 0.3, 2.35, bz - 0.2], [0, 0, -0.25]));
  });

  if (snow) {
    [[-9.5, -3, 3.2, 1.6], [9.4, 4, 2.6, 1.8], [2, -9.7, 3.6, 1.4], [-4, 9.8, 2.8, 1.5]].forEach(([dx, dz, w, d]) => {
      gSnow.push(part(new THREE.BoxGeometry(w, 0.28, d), [dx, 0.14, dz]));
    });
  }

  addMesh(grp, merge(gCurbDk), curbDk, { receiveShadow: true });
  addMesh(grp, merge(gCurb), curb, { receiveShadow: true });
  addMesh(grp, merge(gSeam), seam, { order: 15 });
  addMesh(grp, merge(gTileSh), tileSh, { order: 16, receiveShadow: true });
  addMesh(grp, merge(gBowl), lambert(A.bowl));
  addMesh(grp, merge(gF1), f1);
  addMesh(grp, merge(gF2), f2);
  if (snow && gSnow.length) addMesh(grp, merge(gSnow), snow);

  map.root.add(grp);
}

export function buildStepwell(map) {
  const W = map.theme.well, L = map.layout.landmarks;
  const g = new THREE.Group();
  g.position.set(L.stepwell.x, 0, L.stepwell.z); g.rotation.y = Math.PI / 8;
  g.matrixAutoUpdate = false; g.updateMatrix();
  map.root.add(g);

  const riser = decalMat(W.riser);
  const R0 = 11.5, STEP = 1.3, gRiser = [], gTreadL = [], gTreadD = [];
  for (let k = 0; k < 5; k++) {
    const outer = R0 - STEP * k, inner = outer - STEP;
    const tGeo = part(new THREE.RingGeometry(inner, outer, 8).rotateX(-Math.PI / 2), [0, 0.02 + k * 0.004, 0]);
    if (k % 2) gTreadD.push(tGeo); else gTreadL.push(tGeo);
    gRiser.push(part(new THREE.RingGeometry(outer - 0.4, outer, 8).rotateX(-Math.PI / 2), [0, 0.024 + k * 0.004, 0]));
  }
  addMesh(g, merge(gTreadL), decalMat(W.treadLight), { order: 6, receiveShadow: true });
  addMesh(g, merge(gTreadD), decalMat(W.treadDark), { order: 8, receiveShadow: true });
  addMesh(g, merge(gRiser), riser, { order: 7, receiveShadow: true });

  const waterR = R0 - STEP * 5;
  addMesh(g, new THREE.CircleGeometry(waterR, 8).rotateX(-Math.PI / 2).translate(0, 0.04, 0), decalMat(W.water), { order: 18 });
  addMesh(g, new THREE.RingGeometry(waterR - 0.55, waterR, 8).rotateX(-Math.PI / 2).translate(0, 0.044, 0), decalMat(W.waterEdge, { opacity: 0.55, transparent: true }), { order: 19 });

  if (W.frozen) {
    const crackMat = decalMat(W.crack ?? 0x6FA8CF, { opacity: 0.8, transparent: true });
    const crng = mulberry32(5), gCracks = [], gSnowP = [];
    for (let i = 0; i < 9; i++) {
      const len = 1.5 + crng() * 2.6, a = crng() * Math.PI * 2, d = crng() * (waterR - 1.0);
      const c = new THREE.PlaneGeometry(len, 0.07).rotateX(-Math.PI / 2);
      gCracks.push(part(c, [Math.cos(a) * d, 0.046, Math.sin(a) * d], [0, crng() * 3, 0]));
    }
    addMesh(g, merge(gCracks), crackMat, { order: 20 });
    [[-3.2, 1.4, 1.3], [3.4, -2.2, 1.1], [1.0, 3.8, 0.9], [-1.5, -3.8, 1.0]].forEach(([sx, sz, sr]) => {
      gSnowP.push(part(new THREE.CircleGeometry(sr, 7).rotateX(-Math.PI / 2), [sx, 0.048, sz]));
    });
    addMesh(g, merge(gSnowP), decalMat(W.snow ?? 0xF4FAFF), { order: 21 });
  }

  const stone = lambert(W.stone), stoneDk = lambert(W.stoneDk);
  const snow = map.theme.snowCap ? lambert(map.theme.snowCap) : null;
  const gStone = [], gStoneDk = [], gSnow = [], gLotus = [], gGold = [];

  gStoneDk.push(part(new THREE.BoxGeometry(3.2, 0.34, 3.2), [0, 0.17, 0]));
  gStone.push(part(new THREE.BoxGeometry(2.4, 0.34, 2.4), [0, 0.51, 0]));
  [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].forEach(([cx, cz]) => {
    gStone.push(part(new THREE.BoxGeometry(0.3, 1.5, 0.3), [cx, 1.5, cz]));
  });
  gStoneDk.push(part(new THREE.BoxGeometry(2.4, 0.2, 2.4), [0, 2.35, 0]));
  gStone.push(part(new THREE.ConeGeometry(1.75, 0.9, 4), [0, 2.9, 0], [0, Math.PI / 4, 0]));
  if (snow) gSnow.push(part(new THREE.ConeGeometry(1.35, 0.55, 4), [0, 3.08, 0], [0, Math.PI / 4, 0]));
  addMesh(g, new THREE.OctahedronGeometry(0.16, 0).translate(0, 3.5, 0), lambert(PALETTE.gold));

  const petal = new THREE.ConeGeometry(0.16, 0.42, 4);
  const addLotus = (lx, ly, lz, s = 1) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = lx + Math.cos(a) * 0.17 * s, py = ly + 0.2 * s, pz = lz + Math.sin(a) * 0.17 * s;
      gLotus.push(part(petal, [px, py, pz], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], [s, s, s]));
    }
    gGold.push(part(new THREE.SphereGeometry(0.11 * s, 5, 4), [lx, ly + 0.16 * s, lz]));
  };

  [[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]].forEach(([ox, oz]) => {
    gStoneDk.push(part(new THREE.BoxGeometry(1.0, 0.4, 1.0), [ox, 0.2, oz]));
    gStone.push(part(new THREE.BoxGeometry(0.68, 0.34, 0.68), [ox, 0.57, oz]));
    addLotus(ox, 0.74, oz, 1.1);
  });

  const padGeo = new THREE.CircleGeometry(0.75, 8).rotateX(-Math.PI / 2);
  const prng = mulberry32(77), gPads = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + prng() * 0.5, d = 2.2 + prng() * 2.3;
    const lx = Math.cos(a) * d, lz = Math.sin(a) * d;
    if (Math.abs(Math.abs(lx) - 2.9) < 0.9 && Math.abs(Math.abs(lz) - 2.9) < 0.9) continue;
    const sc = 0.8 + prng() * 0.5;
    gPads.push(part(padGeo, [lx, 0.05, lz], [0, 0, 0], [sc, sc, sc]));
    if (i % 4 === 0 && !W.frozen) addLotus(lx, 0.05, lz, 0.7);
  }
  addMesh(g, merge(gPads), decalMat(W.pad), { order: 20 });

  if (W.reeds) {
    const reedGeo = makeAgaveGeometry(), gReeds = [];
    [[0.4, -3.9], [-3.9, 0.3], [3.9, 0.9], [-0.6, 4.1]].forEach(([rx, rz], i) => {
      const sc = 1.1 + (i % 2) * 0.3;
      gReeds.push(part(reedGeo, [rx, 0.04, rz], [0, 0, 0], [sc, sc, sc]));
    });
    addMesh(g, merge(gReeds), lambert(W.reeds));
  }

  addMesh(g, merge(gStone), stone);
  addMesh(g, merge(gStoneDk), stoneDk);
  if (snow && gSnow.length) addMesh(g, merge(gSnow), snow);
  if (gLotus.length) addMesh(g, merge(gLotus), lambert(W.lotus));
  if (gGold.length) addMesh(g, merge(gGold), lambert(PALETTE.gold));
}
