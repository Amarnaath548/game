import * as THREE from 'three';
import { part, merge, lambert, decalMat, mulberry32 } from './geo.js';
import { getSavedQuality } from '../../config/quality.js';
import { buildRuins } from './storyRuins.js';

function createOmTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#D99F44'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(32, 32, 26, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#FFDE7A'; ctx.font = 'bold 30px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('ॐ', 32, 34);
  return new THREE.CanvasTexture(c);
}

function createGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0, 'rgba(255, 248, 220, 1.0)');
  g.addColorStop(0.25, 'rgba(255, 185, 50, 0.85)');
  g.addColorStop(0.60, 'rgba(230, 90, 15, 0.35)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function makeBannerMat(colorHex, timeUniform) {
  const mat = new THREE.MeshLambertMaterial({ color: colorHex, side: THREE.DoubleSide, flatShading: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uStoryTime = timeUniform;
    shader.vertexShader = `uniform float uStoryTime;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nfloat sway = sin(uStoryTime * 1.8 + position.y * 1.2 + position.x * 0.3) * 0.22;\ntransformed.z += sway;`
    );
  };
  return mat;
}

export function buildStory(map) {
  const rng = mulberry32((map.theme.seed ?? 2026) + 404);
  const T = map.theme, L = map.layout.landmarks;
  const quality = map.opts?.quality || getSavedQuality();
  const isLow = quality === 'LOW';

  const sharedTime = { value: 0 };
  const diyaFlameMat = new THREE.MeshBasicMaterial({ color: 0xFFAA22, transparent: true, opacity: 0.95 });
  const diyaBowls = [], diyaFlames = [], glowSpots = [];
  const stoneHi = [], stoneSh = [];

  // --- 1. Plaza Edge Ruins (r ~ 11.5 - 12.5) & 2.2x Diyas ---
  // Ruin A: Broken Lotus Ring & Stepped Base at r ~ 12.5, a ~ 25°
  const rA = 12.5, aA = 0.44, cxA = Math.cos(aA) * rA, czA = Math.sin(aA) * rA;
  stoneSh.push(part(new THREE.CylinderGeometry(2.2, 2.5, 0.22, 14), [cxA, 0.11, czA]));
  stoneHi.push(part(new THREE.CylinderGeometry(1.5, 1.7, 0.18, 12), [cxA, 0.31, czA]));
  const petal = new THREE.ConeGeometry(0.24, 0.48, 4);
  for (let i = 0; i < 12; i++) {
    if (i === 2 || i === 5 || i === 8 || i === 9) continue;
    const a = (i / 12) * Math.PI * 2;
    stoneHi.push(part(petal, [cxA + Math.cos(a) * 1.3, 0.42, czA + Math.sin(a) * 1.3], [Math.sin(a) * 0.75, a, -Math.cos(a) * 0.75]));
  }

  // Ruin B: Half-Arch at r ~ 12.2, a ~ 115°
  const rB = 12.2, aB = 2.01, cxB = Math.cos(aB) * rB, czB = Math.sin(aB) * rB;
  stoneHi.push(part(new THREE.CylinderGeometry(0.44, 0.54, 3.4, 7), [cxB, 1.7, czB], [0.1, aB, -0.08]));
  stoneSh.push(part(new THREE.BoxGeometry(0.55, 0.5, 2.4), [cxB + 0.6, 3.2, czB - 0.4], [0.2, aB, 0.25]));
  stoneSh.push(part(new THREE.BoxGeometry(0.8, 0.35, 0.8), [cxB, 3.45, czB], [0, aB, 0]));

  // Ruin C: Shrine Niche with 2.2x Diya at r ~ 12.2, a ~ 205°
  const rC = 12.2, aC = 3.58, cxC = Math.cos(aC) * rC, czC = Math.sin(aC) * rC;
  stoneSh.push(part(new THREE.BoxGeometry(1.4, 0.55, 1.0), [cxC, 0.27, czC], [0, aC, 0]));
  stoneHi.push(part(new THREE.BoxGeometry(1.2, 1.3, 0.4), [cxC, 1.15, czC], [0, aC, 0]));
  stoneHi.push(part(new THREE.ConeGeometry(1.0, 0.55, 4), [cxC, 2.05, czC], [0, aC + Math.PI / 4, 0]));
  diyaBowls.push(part(new THREE.CylinderGeometry(0.4, 0.2, 0.18, 7), [cxC, 0.62, czC], [0, aC, 0]));
  diyaFlames.push(part(new THREE.ConeGeometry(0.1, 0.28, 5), [cxC, 0.82, czC]));
  glowSpots.push([cxC, 0.88, czC, 1.0]);

  // Ruin D: Toppled Pillar at r ~ 12.5, a ~ 335°
  const rD = 12.5, aD = -0.44, cxD = Math.cos(aD) * rD, czD = Math.sin(aD) * rD;
  stoneSh.push(part(new THREE.CylinderGeometry(0.48, 0.56, 0.8, 8), [cxD, 0.4, czD]));
  stoneHi.push(part(new THREE.CylinderGeometry(0.42, 0.46, 3.2, 8), [cxD + 0.8, 0.35, czD - 0.6], [0.15, aD + 0.5, 1.46]));
  stoneSh.push(part(new THREE.BoxGeometry(0.65, 0.45, 0.65), [cxD + 2.3, 0.22, czD - 1.6], [0.1, aD, 0.2]));

  // 8 plaza diyas scaled by 2.2x with visible warm glow sprites (r ~ 1.2u)
  const diyaBowlGeo = new THREE.CylinderGeometry(0.48, 0.24, 0.2, 8);
  const diyaFlameGeo = new THREE.ConeGeometry(0.11, 0.31, 6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const dx = Math.cos(a) * 14.1, dz = Math.sin(a) * 14.1;
    diyaBowls.push(part(diyaBowlGeo, [dx, 0.1, dz]));
    diyaFlames.push(part(diyaFlameGeo, [dx, 0.28, dz]));
    glowSpots.push([dx, 0.38, dz, 1.0]);
  }

  // --- 2. Path Banners (6u Tall, 2u Wide Flag) and Markers ---
  const poleWood = [], saffronFlags = [], indigoFlags = [], stoneMarkers = [], markerDecals = [];
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 6.0, 6);
  const armGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.4, 4);
  const flagGeo = new THREE.PlaneGeometry(2.0, 2.4, 3, 4);
  const markerGeo = new THREE.BoxGeometry(0.65, 1.1, 0.35);
  const markerCap = new THREE.CylinderGeometry(0.32, 0.32, 0.35, 8).rotateZ(Math.PI / 2);
  const decalQuad = new THREE.PlaneGeometry(0.42, 0.42);

  const DISTS = [34, 46, 58, 70, 82];
  const DIRS = [[0, 1, 0], [0, -1, Math.PI], [1, 0, -Math.PI / 2], [-1, 0, Math.PI / 2]];

  DIRS.forEach(([dx, dz, rotY], dirIdx) => {
    DISTS.forEach((d, step) => {
      const side = (step % 2 === 0 ? 1 : -1);
      const perpX = -dz * side, perpZ = dx * side;
      const px = dx * d + perpX * (L.pathHalfW + 0.8);
      const pz = dz * d + perpZ * (L.pathHalfW + 0.8);
      if (!map.isClear(px, pz, 0.6, { paths: false })) return;

      poleWood.push(part(poleGeo, [px, 3.0, pz]));
      poleWood.push(part(armGeo, [px, 5.7, pz], [0, rotY, Math.PI / 2]));
      const pFlag = [px + perpX * 0.9, 4.5, pz + perpZ * 0.9];
      const targetList = (step + dirIdx) % 2 === 0 ? saffronFlags : indigoFlags;
      targetList.push(part(flagGeo, pFlag, [0, rotY + (side > 0 ? 0 : Math.PI), 0]));

      if (!isLow && (step === 0 || step === 3)) {
        const mx = dx * (d + 3) - perpX * (L.pathHalfW + 1.0);
        const mz = dz * (d + 3) - perpZ * (L.pathHalfW + 1.0);
        if (map.isClear(mx, mz, 0.6, { paths: false })) {
          stoneMarkers.push(part(markerGeo, [mx, 0.55, mz], [0, rotY, 0]));
          stoneMarkers.push(part(markerCap, [mx, 1.1, mz], [0, rotY, 0]));
          markerDecals.push(part(decalQuad, [mx + dx * 0.18, 0.65, mz + dz * 0.18], [0, rotY, 0]));
        }
      }
    });
  });

  // --- 3. Water Crossing & Stepping Stones ---
  let padMesh = null, flowerMesh = null;
  if (!isLow) {
    const W = T.well, poolX = 0, poolZ = 74;
    map.flat(new THREE.PlaneGeometry(12, 6).rotateX(-Math.PI / 2), decalMat(W.water, { opacity: 0.88, transparent: true }), 0.014, 18);
    map.flat(new THREE.PlaneGeometry(12.8, 6.8).rotateX(-Math.PI / 2), decalMat(W.waterEdge, { opacity: 0.5, transparent: true }), 0.012, 17);

    const stepStones = [], stoneGeo = new THREE.CylinderGeometry(0.62, 0.68, 0.16, 8);
    [-2.2, -1.1, 0, 1.1, 2.2].forEach((offsetZ, idx) => {
      stepStones.push(part(stoneGeo, [poolX + (idx % 2 ? 0.35 : -0.35), 0.08, poolZ + offsetZ], [0, rng() * 3, 0]));
    });
    stoneHi.push(...stepStones);

    const padSpots = [];
    [-4.5, -3.2, -2.1, 2.1, 3.2, 4.5].forEach((lx) => {
      padSpots.push([poolX + lx, 0.024, poolZ - 1.2 + (rng() - 0.5) * 2.2, 0.65 + rng() * 0.3]);
    });
    if (!W.frozen && L.stepwell) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.3, d = 2.4 + rng() * 1.8;
        padSpots.push([L.stepwell.x + Math.cos(a) * d, 0.05, L.stepwell.z + Math.sin(a) * d, 0.6 + rng() * 0.3]);
      }
    }
    padMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.7, 8).rotateX(-Math.PI / 2), decalMat(W.pad ?? 0x4F7F3F), padSpots.length);
    padMesh.renderOrder = 22; padMesh.matrixAutoUpdate = false;
    const flowerGeo = merge([part(new THREE.ConeGeometry(0.12, 0.3, 5), [0, 0.12, 0]), part(new THREE.SphereGeometry(0.08, 5, 4), [0, 0.1, 0])]);
    flowerMesh = new THREE.InstancedMesh(flowerGeo, lambert(W.lotus ?? 0xD47285), Math.ceil(padSpots.length / 2));
    flowerMesh.matrixAutoUpdate = false;

    let fIdx = 0;
    padSpots.forEach(([x, y, z, sc], i) => {
      map.dummy.position.set(x, y, z); map.dummy.rotation.set(0, rng() * 3, 0); map.dummy.scale.set(sc, sc, sc);
      map.dummy.updateMatrix(); padMesh.setMatrixAt(i, map.dummy.matrix);
      if (i % 2 === 0 && fIdx < flowerMesh.count) {
        map.dummy.position.y += 0.04; map.dummy.scale.set(1, 1, 1); map.dummy.updateMatrix();
        flowerMesh.setMatrixAt(fIdx++, map.dummy.matrix);
      }
    });
    padMesh.instanceMatrix.needsUpdate = true; padMesh.updateMatrix(); map.root.add(padMesh);
    flowerMesh.instanceMatrix.needsUpdate = true; flowerMesh.updateMatrix(); map.root.add(flowerMesh);

    buildRuins(map, rng, diyaFlames, glowSpots);
    map.layout.anchors.braziers?.forEach(([bx, bz]) => glowSpots.push([bx, 1.45, bz, 1.25]));
    if (L.agni) {
      [[-8.5, -8.5], [8.5, -8.5], [-8.5, 8.5], [8.5, 8.5]].forEach(([ax, az]) => {
        glowSpots.push([L.agni.x + ax, 1.8, L.agni.z + az, 1.2]);
      });
    }
  }

  // --- 4. Glow Sprites Billboard Mesh (r ~ 1.2u) ---
  if (glowSpots.length) {
    const glowTex = createGlowTexture();
    const glowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowTex } },
      vertexShader: `varying vec2 vUv;\nvoid main() {\n  vUv = uv;\n  vec4 center = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);\n  vec4 mvPos = modelViewMatrix * center;\n  mvPos.xy += position.xy;\n  gl_Position = projectionMatrix * mvPos;\n}`,
      fragmentShader: `uniform sampler2D map;\nvarying vec2 vUv;\nvoid main() { gl_FragColor = texture2D(map, vUv); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.InstancedMesh(glowGeo, glowMat, glowSpots.length);
    glowMesh.renderOrder = 35; glowMesh.matrixAutoUpdate = false;
    glowSpots.forEach(([x, y, z, sc], i) => {
      map.dummy.position.set(x, y, z); map.dummy.rotation.set(0, 0, 0); map.dummy.scale.set(sc, sc, sc);
      map.dummy.updateMatrix(); glowMesh.setMatrixAt(i, map.dummy.matrix);
    });
    glowMesh.instanceMatrix.needsUpdate = true; glowMesh.updateMatrix(); map.root.add(glowMesh);
  }

  // Finalize Meshes
  const addMesh = (geo, mat, cast = true) => {
    if (!geo) return;
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true; if (cast) m.castShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix(); map.root.add(m);
  };
  if (stoneHi.length) addMesh(merge(stoneHi), lambert(T.stone.hi));
  if (stoneSh.length) addMesh(merge(stoneSh), lambert(T.stone.sh));
  if (diyaBowls.length) addMesh(merge(diyaBowls), lambert(0x8C3F21), false);
  if (diyaFlames.length) addMesh(merge(diyaFlames), diyaFlameMat, false);
  if (poleWood.length) addMesh(merge(poleWood), lambert(0x5A3A22));
  if (saffronFlags.length) addMesh(merge(saffronFlags), makeBannerMat(0xDE5D14, sharedTime), false);
  if (indigoFlags.length) addMesh(merge(indigoFlags), makeBannerMat(0x2A3D7C, sharedTime), false);
  if (stoneMarkers.length) addMesh(merge(stoneMarkers), lambert(T.stone.hi));
  if (markerDecals.length) addMesh(merge(markerDecals), new THREE.MeshBasicMaterial({ map: createOmTexture(), transparent: true, depthWrite: false }), false);

  map.updateStory = (dt) => {
    sharedTime.value += dt;
    diyaFlameMat.opacity = 0.88 + Math.sin(sharedTime.value * 7.5) * 0.08 + Math.sin(sharedTime.value * 16.2) * 0.04;
  };
}
