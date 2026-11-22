import * as THREE from 'three';
import { part, merge, lambert, decalMat } from './geo.js';

export function buildPlaza(map) {
  const T = map.theme, P = T.plaza, L = map.layout.landmarks;
  const R = L.plazaR;

  [[R, P.rim, 0.02, 8], [14.2, P.mid, 0.024, 9], [12.8, P.inner, 0.028, 10]].forEach(([r, c, y, o]) => {
    map.flat(new THREE.CircleGeometry(r, 56).rotateX(-Math.PI / 2), decalMat(c), y, o);
  });

  const seamMat = decalMat(P.seam);
  const seamGeos = [];
  [6.4, 9.6, 12.8].forEach((r) => {
    seamGeos.push(new THREE.RingGeometry(r - 0.07, r + 0.07, 56).rotateX(-Math.PI / 2));
  });

  const seamPlane = new THREE.PlaneGeometry(0.14, 6.4).rotateX(-Math.PI / 2);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    seamGeos.push(part(seamPlane, [Math.cos(a) * 9.6, 0, Math.sin(a) * 9.6], [0, -a + Math.PI / 2, 0]));
  }
  const mergedSeams = merge(seamGeos);
  const seamMesh = map.flat(mergedSeams, seamMat, 0.032, 11);
  seamMesh.matrixAutoUpdate = false;
  seamMesh.updateMatrix();

  if (T.plaza.snowRing) {
    map.flat(new THREE.RingGeometry(R - 0.9, R, 56).rotateX(-Math.PI / 2), decalMat(T.plaza.snowRing), 0.034, 12);
  }

  const [cx, cz] = map.layout.anchors.mythicChest;
  const d1 = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.3, 0.2, 24), lambert(P.dais));
  d1.position.set(cx, 0.1, cz); d1.renderOrder = 12; d1.receiveShadow = true;
  d1.matrixAutoUpdate = false; d1.updateMatrix(); map.root.add(d1);

  const d2 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.0, 0.2, 20), lambert(P.daisTop));
  d2.position.set(cx, 0.3, cz); d2.renderOrder = 12; d2.receiveShadow = true;
  d2.matrixAutoUpdate = false; d2.updateMatrix(); map.root.add(d2);

  const inlay = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.45, 24).rotateX(-Math.PI / 2), lambert(P.inlay));
  inlay.position.set(cx, 0.405, cz); inlay.renderOrder = 13;
  inlay.matrixAutoUpdate = false; inlay.updateMatrix(); map.root.add(inlay);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: P.glow ?? 0xFFD54A, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  glow.position.set(cx, 0.42, cz); glow.renderOrder = 14;
  glow.matrixAutoUpdate = false; glow.updateMatrix(); map.root.add(glow);
}

export function buildMonuments(map) {
  const T = map.theme, L = map.layout.landmarks;
  const hi = lambert(T.stone.hi), sh = lambert(T.stone.sh);
  const snow = T.snowCap ? lambert(T.snowCap) : null;
  const geosHi = [], geosSh = [], geosSnow = [];
  const shadows = [];

  const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const heights = [2.4, 3.4, 2.7, 3.1];
  angles.forEach((a, i) => {
    const px = Math.cos(a) * 13.5, pz = Math.sin(a) * 13.5, h = heights[i];
    geosSh.push(part(new THREE.BoxGeometry(1.6, 0.4, 1.6), [px, 0.2, pz]));
    geosHi.push(part(new THREE.CylinderGeometry(0.52, 0.65, h, 8), [px, 0.4 + h * 0.5, pz]));
    geosSh.push(part(new THREE.BoxGeometry(1.0, 0.18, 1.0), [px, 0.4 + h + 0.09, pz]));
    geosSh.push(part(new THREE.BoxGeometry(1.4, 0.32, 1.4), [px, 0.4 + h + 0.34, pz]));
    geosHi.push(part(new THREE.DodecahedronGeometry(0.55, 0), [px, 0.4 + h + 0.65, pz], [0.2, a, 0.25]));
    if (snow) {
      geosSnow.push(part(new THREE.CylinderGeometry(0.62, 0.74, 0.22, 8), [px, 0.4 + h + 0.58, pz]));
      geosSnow.push(part(new THREE.BoxGeometry(1.5, 0.16, 1.5), [px, 0.4 + h + 0.70, pz]));
    }
    shadows.push([px, pz, 1.5, 1.5]);
    map.obstacles.push({ x: px, z: pz, radius: 0.8 });
  });

  const A = L.innerToranaR, B = L.toranaR;
  const list = [
    { x: 0, z: -A, rot: 0 }, { x: 0, z: A, rot: Math.PI }, { x: -A, z: 0, rot: Math.PI / 2 }, { x: A, z: 0, rot: -Math.PI / 2 },
    { x: 0, z: -B, rot: 0 }, { x: 0, z: B, rot: Math.PI }, { x: -B, z: 0, rot: Math.PI / 2 }, { x: B, z: 0, rot: -Math.PI / 2 }
  ];
  const plinth = new THREE.BoxGeometry(1.5, 0.4, 1.5);
  const col = new THREE.CylinderGeometry(0.48, 0.58, 4.4, 8);
  const l1 = new THREE.BoxGeometry(5.2, 0.4, 1.0);
  const l2 = new THREE.BoxGeometry(5.8, 0.35, 0.9);
  const arc = new THREE.TorusGeometry(2.0, 0.22, 6, 12, Math.PI);
  const apex = new THREE.OctahedronGeometry(0.35, 0);
  const fin = new THREE.ConeGeometry(0.28, 0.8, 4);

  list.forEach((tp) => {
    const c = Math.cos(tp.rot), s = Math.sin(tp.rot);
    const toWorld = (lx, ly, lz, rotY = 0) => {
      const wx = tp.x + lx * c - lz * s;
      const wz = tp.z + lx * s + lz * c;
      return { pos: [wx, ly, wz], rot: [0, tp.rot + rotY, 0] };
    };

    [-2.2, 2.2].forEach((ox) => {
      const p1 = toWorld(ox, 0.2, 0);
      geosSh.push(part(plinth, p1.pos, p1.rot));
      const p2 = toWorld(ox, 2.6, 0);
      geosHi.push(part(col, p2.pos, p2.rot));
      shadows.push([tp.x + ox * c, tp.z + ox * s, 1.2, 1.2]);
      if (snow) {
        const ps = toWorld(ox, 4.9, 0);
        geosSnow.push(part(new THREE.CylinderGeometry(0.55, 0.62, 0.2, 8), ps.pos, ps.rot));
      }
    });

    const pl1 = toWorld(0, 4.6, 0); geosSh.push(part(l1, pl1.pos, pl1.rot));
    const pl2 = toWorld(0, 5.0, 0); geosHi.push(part(l2, pl2.pos, pl2.rot));
    const parc = toWorld(0, 5.1, 0); geosHi.push(part(arc, parc.pos, parc.rot));
    const pape = toWorld(0, 7.2, 0); geosSh.push(part(apex, pape.pos, pape.rot));
    [-2.6, 2.6].forEach((fx) => {
      const pfin = toWorld(fx, 5.6, 0);
      geosHi.push(part(fin, pfin.pos, pfin.rot));
    });

    if (snow) {
      const ps1 = toWorld(0, 5.28, 0); geosSnow.push(part(new THREE.BoxGeometry(5.8, 0.2, 0.95), ps1.pos, ps1.rot));
      const ps2 = toWorld(-2.2, 0.44, 0); geosSnow.push(part(new THREE.BoxGeometry(1.3, 0.2, 1.3), ps2.pos, ps2.rot));
      const ps3 = toWorld(2.2, 0.44, 0); geosSnow.push(part(new THREE.BoxGeometry(1.3, 0.2, 1.3), ps3.pos, ps3.rot));
    }

    [-2.2, 2.2].forEach((ox) => map.obstacles.push({ x: tp.x + ox * c, z: tp.z + ox * s, radius: 0.7 }));
  });

  if (geosHi.length) {
    const m = new THREE.Mesh(merge(geosHi), hi);
    m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix();
    map.root.add(m);
  }
  if (geosSh.length) {
    const m = new THREE.Mesh(merge(geosSh), sh);
    m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix();
    map.root.add(m);
  }
  if (geosSnow.length && snow) {
    const m = new THREE.Mesh(merge(geosSnow), snow);
    m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix();
    map.root.add(m);
  }
  if (shadows.length) {
    map.addContactShadows(shadows, 'monuments');
  }
}
