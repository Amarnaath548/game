import * as THREE from 'three';
import { part, merge, lambert } from './geo.js';

export function buildRuins(map, rng, glowSpots) {
  const T = map.theme, stone = T.stone;
  const hiMat = lambert(stone.hi), shMat = lambert(stone.sh);
  const snowMat = T.snowCap ? lambert(T.snowCap) : null;
  const sandMat = T.id === 'desert' ? lambert(T.patchDark ?? T.floor) : null;
  const leafMat = T.id === 'autumn' ? lambert(0xB8532A) : null;

  const geosHi = [], geosSh = [], geosSnow = [], geosSand = [], geosLeaves = [];
  const CLUSTER_COUNT = 7;

  for (let c = 0; c < CLUSTER_COUNT; c++) {
    const spot = map.findSpot(32, 86, 3.8, 120, { paths: true });
    if (!spot) continue;
    const [cx, cz] = spot;
    map.placed.push([cx, cz, 3.8]);
    const rot = rng() * Math.PI * 2;
    const cr = Math.cos(rot), sr = Math.sin(rot);

    const toW = (lx, ly, lz, ry = 0) => {
      const wx = cx + lx * cr - lz * sr;
      const wz = cz + lx * sr + lz * cr;
      return { pos: [wx, ly, wz], rot: [0, rot + ry, 0] };
    };

    // 1. Half-arch: leaning pillar, angled spring lintel, broken capital
    const pArch = toW(-1.6, 1.4, -0.6, 0.15);
    geosHi.push(part(new THREE.CylinderGeometry(0.36, 0.44, 2.8, 7), pArch.pos, [0.08, pArch.rot[1], -0.06]));
    const pLintel = toW(-1.0, 2.6, -0.6, -0.45);
    geosSh.push(part(new THREE.BoxGeometry(0.48, 0.42, 2.1), pLintel.pos, [0.18, pLintel.rot[1], 0.22]));
    const pCap = toW(-1.6, 2.9, -0.6, 0);
    geosSh.push(part(new THREE.BoxGeometry(0.68, 0.28, 0.68), pCap.pos, pCap.rot));

    // 2. Fallen pillar: standing stub, fallen column chunk, broken ring
    const pStub = toW(1.4, 0.32, -1.2, 0);
    geosSh.push(part(new THREE.CylinderGeometry(0.42, 0.46, 0.64, 7), pStub.pos, pStub.rot));
    const pFallen = toW(1.1, 0.28, 0.1, 0.35);
    geosHi.push(part(new THREE.CylinderGeometry(0.34, 0.38, 2.3, 7), pFallen.pos, [0.12, pFallen.rot[1], 1.44]));
    const pCollar = toW(0.4, 0.24, 0.8, 0);
    geosSh.push(part(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 7), pCollar.pos, [0.1, rot, 1.44]));

    // 3. Carved wall segment: stepped blocks, relief molding, corner rubble
    const pWall1 = toW(0.2, 0.9, 1.6, 0);
    geosHi.push(part(new THREE.BoxGeometry(2.6, 1.8, 0.55), pWall1.pos, pWall1.rot));
    const pWall2 = toW(-1.4, 0.55, 1.6, 0);
    geosSh.push(part(new THREE.BoxGeometry(1.2, 1.1, 0.55), pWall2.pos, pWall2.rot));
    const pMolding = toW(0.2, 1.25, 1.6, 0);
    geosSh.push(part(new THREE.BoxGeometry(2.64, 0.14, 0.62), pMolding.pos, pMolding.rot));
    const pRubble1 = toW(1.6, 0.22, 1.8, 0.8);
    geosHi.push(part(new THREE.DodecahedronGeometry(0.38, 0), pRubble1.pos, pRubble1.rot));
    const pRubble2 = toW(-1.9, 0.18, 1.4, 1.4);
    geosSh.push(part(new THREE.DodecahedronGeometry(0.3, 0), pRubble2.pos, pRubble2.rot));

    // 4. Small shrine niche
    const pNicheBase = toW(0.8, 0.25, -1.8, 0.2);
    geosSh.push(part(new THREE.BoxGeometry(1.3, 0.5, 0.9), pNicheBase.pos, pNicheBase.rot));
    const pNicheBack = toW(0.8, 1.05, -1.95, 0.2);
    geosHi.push(part(new THREE.BoxGeometry(1.15, 1.3, 0.32), pNicheBack.pos, pNicheBack.rot));
    const pNicheRoof = toW(0.8, 1.8, -1.8, 0.2 + Math.PI / 4);
    geosHi.push(part(new THREE.ConeGeometry(0.95, 0.52, 4), pNicheRoof.pos, pNicheRoof.rot));

    // Biome-specific accents
    if (snowMat) {
      geosSnow.push(part(new THREE.BoxGeometry(2.68, 0.16, 0.62), [pWall1.pos[0], 1.88, pWall1.pos[2]], pWall1.rot));
      geosSnow.push(part(new THREE.BoxGeometry(1.28, 0.14, 0.62), [pWall2.pos[0], 1.18, pWall2.pos[2]], pWall2.rot));
      geosSnow.push(part(new THREE.BoxGeometry(0.55, 0.14, 1.8), [pLintel.pos[0], 2.85, pLintel.pos[2]], pLintel.rot));
      geosSnow.push(part(new THREE.BoxGeometry(0.46, 0.12, 1.8), [pFallen.pos[0], 0.46, pFallen.pos[2]], pFallen.rot));
      geosSnow.push(part(new THREE.ConeGeometry(0.80, 0.40, 4), [pNicheRoof.pos[0], 1.98, pNicheRoof.pos[2]], pNicheRoof.rot));
    } else if (sandMat) {
      geosSand.push(part(new THREE.DodecahedronGeometry(1.0, 0), [pWall1.pos[0], 0.18, pWall1.pos[2]], [0, 0, 0], [1.9, 0.36, 1.3]));
      geosSand.push(part(new THREE.DodecahedronGeometry(0.9, 0), [pFallen.pos[0], 0.15, pFallen.pos[2]], [0, 0, 0], [1.4, 0.3, 1.6]));
    } else if (leafMat) {
      geosLeaves.push(part(new THREE.DodecahedronGeometry(0.8, 0), [pWall1.pos[0] + 0.4, 0.14, pWall1.pos[2] + 0.5], [0, 0, 0], [1.3, 0.22, 1.1]));
      geosLeaves.push(part(new THREE.DodecahedronGeometry(0.7, 0), [pArch.pos[0], 0.12, pArch.pos[2]], [0, 0, 0], [1.1, 0.18, 1.2]));
    }
  }

  const addM = (geo, mat, cast = true) => {
    if (!geo) return;
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    if (cast) m.castShadow = true;
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    map.root.add(m);
  };

  if (geosHi.length) addM(merge(geosHi), hiMat);
  if (geosSh.length) addM(merge(geosSh), shMat);
  if (geosSnow.length && snowMat) addM(merge(geosSnow), snowMat, false);
  if (geosSand.length && sandMat) addM(merge(geosSand), sandMat, false);
  if (geosLeaves.length && leafMat) addM(merge(geosLeaves), leafMat, false);
}
