import * as THREE from 'three';
import { decalMat } from './geoUtils.js';
import { MYTHIC_CHEST, PLAZA_R, AGNI } from '../config/worldLayout.js';

// Weathered ruin stone (pillars, arches) and plaza flagstone
const STONE_HI = 0xD9CDB0;
const STONE_SH = 0xB8A880;
const PLAZA = { rim: 0xA7A59C, mid: 0xC9C7BD, inner: 0xBAB8AE, seam: 0x8F8D84, inlay: 0xF2C14E };
const TERRA_HI = 0xD06A3C;
const TERRA_SH = 0xA94E2C;
const BORDER = 0xCDB48A;
const BORDER_DK = 0xA98E64;
const SLATE_HI = 0x64748B;
const SLATE_SH = 0x334155;

function contactShadow(r) {
  const g = new THREE.CircleGeometry(r, 16); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false
  }));
  m.renderOrder = 30;
  return m;
}

export class WorldLandmarks {
  constructor(scene, obstacles) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.isSnow = false;
    this.plazaMats = [];
    this.toranaMats = [];
    this.sectorMats = [];
    this.initMandapa();
    this.initTorana();
    this.initAgniSector();
  }

  flat(geo, mat, y, order, parent = this.scene) {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y; m.renderOrder = order; m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /* ── Central plaza: flagstone discs with seams, gilded dais under the mythic chest, 4 ruined pillars ── */
  initMandapa() {
    this.sandHiMat = new THREE.MeshLambertMaterial({ color: STONE_HI, flatShading: true });
    this.sandShMat = new THREE.MeshLambertMaterial({ color: STONE_SH, flatShading: true });

    const tiers = [
      { r: PLAZA_R, color: PLAZA.rim, y: 0.02, o: 8 },
      { r: 14.2, color: PLAZA.mid, y: 0.024, o: 9 },
      { r: 12.8, color: PLAZA.inner, y: 0.028, o: 10 }
    ];
    this.plazaTiers = tiers.map((t) => {
      const mat = decalMat(t.color);
      this.plazaMats.push(mat);
      this.flat(new THREE.CircleGeometry(t.r, 56).rotateX(-Math.PI / 2), mat, t.y, t.o);
      return mat;
    });

    // Flagstone seams: concentric hairlines + radial joints
    this.seamMat = decalMat(PLAZA.seam);
    [6.4, 9.6, 12.8].forEach((r) => {
      this.flat(new THREE.RingGeometry(r - 0.07, r + 0.07, 56).rotateX(-Math.PI / 2), this.seamMat, 0.032, 11);
    });
    const seamGeo = new THREE.PlaneGeometry(0.14, 6.4).rotateX(-Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const s = this.flat(seamGeo, this.seamMat, 0.032, 11);
      s.position.set(Math.cos(a) * 9.6, 0.032, Math.sin(a) * 9.6);
      s.rotation.y = -a + Math.PI / 2;
    }

    // Dais under the mythic chest: two stone tiers + gold inlay ring + soft glow
    const [cx, cz] = MYTHIC_CHEST;
    this.daisMat = new THREE.MeshLambertMaterial({ color: 0xBDBBB0, flatShading: true });
    this.daisTopMat = new THREE.MeshLambertMaterial({ color: 0xD3D1C6, flatShading: true });
    this.plazaMats.push(this.daisMat, this.daisTopMat);
    const dais1 = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.3, 0.2, 24), this.daisMat);
    dais1.position.set(cx, 0.1, cz); dais1.renderOrder = 12; dais1.receiveShadow = true; dais1.castShadow = true; this.scene.add(dais1);
    const dais2 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.0, 0.2, 20), this.daisTopMat);
    dais2.position.set(cx, 0.3, cz); dais2.renderOrder = 12; dais2.receiveShadow = true; dais2.castShadow = true; this.scene.add(dais2);
    this.inlayMat = new THREE.MeshLambertMaterial({ color: PLAZA.inlay, flatShading: true });
    const inlay = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.45, 24).rotateX(-Math.PI / 2), this.inlayMat);
    inlay.position.set(cx, 0.405, cz); inlay.renderOrder = 13; this.scene.add(inlay);
    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFD54A, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24).rotateX(-Math.PI / 2), this.glowMat);
    glow.position.set(cx, 0.42, cz); glow.renderOrder = 14; this.scene.add(glow);

    // 4 stepped octagonal corner pillars (r = 13.5u, ruined heights 2.4u to 3.4u)
    const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    const heights = [2.4, 3.4, 2.7, 3.1];
    const baseGeo = new THREE.BoxGeometry(1.6, 0.4, 1.6);
    const neckGeo = new THREE.BoxGeometry(1.0, 0.18, 1.0);
    const capGeo = new THREE.BoxGeometry(1.4, 0.32, 1.4);
    const jaggedGeo = new THREE.DodecahedronGeometry(0.55, 0);

    angles.forEach((a, i) => {
      const px = Math.cos(a) * 13.5, pz = Math.sin(a) * 13.5, h = heights[i];
      const g = new THREE.Group(); g.position.set(px, 0, pz);
      const shad = contactShadow(1.5); shad.position.y = 0.04; g.add(shad);

      const base = new THREE.Mesh(baseGeo, this.sandShMat); base.position.y = 0.2; base.castShadow = true; g.add(base);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.65, h, 8), this.sandHiMat);
      shaft.position.y = 0.4 + h * 0.5; shaft.castShadow = true; g.add(shaft);
      const neck = new THREE.Mesh(neckGeo, this.sandShMat); neck.position.y = 0.4 + h + 0.09; neck.castShadow = true; g.add(neck);
      const cap = new THREE.Mesh(capGeo, this.sandShMat); cap.position.y = 0.4 + h + 0.34; cap.castShadow = true; g.add(cap);
      const jag = new THREE.Mesh(jaggedGeo, this.sandHiMat);
      jag.position.y = 0.4 + h + 0.65; jag.rotation.set(0.2, a, 0.25); jag.castShadow = true; g.add(jag);

      this.scene.add(g);
      this.obstacles.push({ x: px, z: pz, radius: 0.8 });
    });
  }

  /* ── Carved Torana archways at r = 24u and r = 62u ── */
  initTorana() {
    const toranas = [
      { x: 0, z: -24, rot: 0 }, { x: 0, z: 24, rot: Math.PI },
      { x: -24, z: 0, rot: Math.PI / 2 }, { x: 24, z: 0, rot: -Math.PI / 2 },
      { x: 0, z: -62, rot: 0 }, { x: 0, z: 62, rot: Math.PI },
      { x: -62, z: 0, rot: Math.PI / 2 }, { x: 62, z: 0, rot: -Math.PI / 2 }
    ];

    const plinthGeo = new THREE.BoxGeometry(1.5, 0.4, 1.5);
    const colGeo = new THREE.CylinderGeometry(0.48, 0.58, 4.4, 8);
    const lintelLower = new THREE.BoxGeometry(5.2, 0.4, 1.0);
    const lintelUpper = new THREE.BoxGeometry(5.8, 0.35, 0.9);
    const arcGeo = new THREE.TorusGeometry(2.0, 0.22, 6, 12, Math.PI);
    const apexGeo = new THREE.OctahedronGeometry(0.35, 0);
    const finGeo = new THREE.ConeGeometry(0.28, 0.8, 4);

    toranas.forEach((tp) => {
      const g = new THREE.Group(); g.position.set(tp.x, 0, tp.z); g.rotation.y = tp.rot;

      [-2.2, 2.2].forEach((ox) => {
        const pl = new THREE.Mesh(plinthGeo, this.sandShMat); pl.position.set(ox, 0.2, 0); pl.castShadow = true; g.add(pl);
        const col = new THREE.Mesh(colGeo, this.sandHiMat); col.position.set(ox, 2.6, 0); col.castShadow = true; g.add(col);
        const sh = contactShadow(1.2); sh.position.set(ox, 0.04, 0); g.add(sh);
      });

      const l1 = new THREE.Mesh(lintelLower, this.sandShMat); l1.position.set(0, 4.6, 0); l1.castShadow = true; g.add(l1);
      const l2 = new THREE.Mesh(lintelUpper, this.sandHiMat); l2.position.set(0, 5.0, 0); l2.castShadow = true; g.add(l2);

      const arc = new THREE.Mesh(arcGeo, this.sandHiMat); arc.position.set(0, 5.1, 0); arc.castShadow = true; g.add(arc);
      const apex = new THREE.Mesh(apexGeo, this.sandShMat); apex.position.set(0, 7.2, 0); apex.castShadow = true; g.add(apex);

      [-2.6, 2.6].forEach((fx) => {
        const fn = new THREE.Mesh(finGeo, this.sandHiMat); fn.position.set(fx, 5.6, 0); fn.castShadow = true; g.add(fn);
      });
      this.scene.add(g);

      const cos = Math.cos(tp.rot), sin = Math.sin(tp.rot);
      [-2.2, 2.2].forEach((ox) => {
        this.obstacles.push({ x: tp.x + ox * cos, z: tp.z + ox * sin, radius: 0.7 });
      });
    });
  }

  /* ── Open-air Agni Yajna-Shala: tiled terracotta floor, carved stone border, stairs, 4 pedestal braziers ── */
  initAgniSector() {
    this.terraHiMat = new THREE.MeshLambertMaterial({ color: TERRA_HI, flatShading: true });
    this.terraShMat = new THREE.MeshLambertMaterial({ color: TERRA_SH, flatShading: true });
    this.curbMat = new THREE.MeshLambertMaterial({ color: BORDER, flatShading: true });
    this.curbDkMat = new THREE.MeshLambertMaterial({ color: BORDER_DK, flatShading: true });
    this.sectorMats.push(this.terraHiMat, this.terraShMat);

    const grp = new THREE.Group();
    grp.position.set(AGNI.x, 0, AGNI.z);
    grp.rotation.y = AGNI.rot;

    // Stepped plinth + tiled floor
    const platBase = new THREE.Mesh(new THREE.BoxGeometry(19, 0.2, 19), this.curbDkMat);
    platBase.position.y = 0.1; platBase.receiveShadow = true; grp.add(platBase);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.16, 16.4), this.terraHiMat);
    floor.position.y = 0.26; floor.receiveShadow = true; grp.add(floor);

    // Fine tile grid: thin seam lines + a few subtly darker tiles for variety
    this.seamTerraMat = new THREE.MeshLambertMaterial({ color: 0x8C3F22, flatShading: true });
    this.sectorMats.push(this.seamTerraMat);
    const lineH = new THREE.PlaneGeometry(16.0, 0.09).rotateX(-Math.PI / 2);
    const lineV = new THREE.PlaneGeometry(0.09, 16.0).rotateX(-Math.PI / 2);
    for (let i = -3; i <= 3; i++) {
      const h = new THREE.Mesh(lineH, this.seamTerraMat); h.position.set(0, 0.345, i * 2.0); h.renderOrder = 15; grp.add(h);
      const v = new THREE.Mesh(lineV, this.seamTerraMat); v.position.set(i * 2.0, 0.345, 0); v.renderOrder = 15; grp.add(v);
    }
    const tile = new THREE.PlaneGeometry(1.92, 1.92).rotateX(-Math.PI / 2);
    [[-6, 2], [-2, -6], [2, 4], [6, -2], [-4, -4], [4, 6], [0, 0], [-6, 6], [6, 6]].forEach(([cx, cz]) => {
      const t = new THREE.Mesh(tile, this.terraShMat);
      t.position.set(cx + 1.0, 0.347, cz + 1.0); t.renderOrder = 16; t.receiveShadow = true; grp.add(t);
    });

    // Carved border: low balustrade with inset panels; the +z side opens onto a stair run
    const halfSide = 8.35;
    const panel = new THREE.BoxGeometry(2.0, 0.34, 0.1);
    const addWall = (cx, cz, len, ry) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(len, 0.6, 0.7), this.curbMat);
      w.position.set(cx, 0.5, cz); w.rotation.y = ry; w.castShadow = true; w.receiveShadow = true; grp.add(w);
      const holder = new THREE.Group(); holder.position.set(cx, 0.5, cz); holder.rotation.y = ry;
      const n = Math.max(1, Math.floor(len / 2.4));
      for (let k = 0; k < n; k++) {
        const p = new THREE.Mesh(panel, this.curbDkMat);
        p.position.set(-len / 2 + (k + 0.5) * (len / n), 0, 0.38);
        holder.add(p);
        const p2 = new THREE.Mesh(panel, this.curbDkMat);
        p2.position.set(-len / 2 + (k + 0.5) * (len / n), 0, -0.38);
        holder.add(p2);
      }
      grp.add(holder);
    };
    addWall(0, -halfSide, 17.3, 0);                     // -z
    addWall(halfSide, 0, 17.3, Math.PI / 2);            // +x
    addWall(-halfSide, 0, 17.3, Math.PI / 2);           // -x
    const gap = 5.6, segLen = (17.3 - gap) / 2;
    addWall(-(gap / 2 + segLen / 2), halfSide, segLen, 0);  // +z, left of the stairs
    addWall((gap / 2 + segLen / 2), halfSide, segLen, 0);   // +z, right of the stairs

    // Stair run climbing through the gap (4 treads)
    for (let st = 0; st < 4; st++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(gap - 0.4, 0.14 + st * 0.0, 0.8), st % 2 ? this.curbMat : this.curbDkMat);
      step.scale.y = 1;
      step.position.set(0, 0.07 + (3 - st) * 0.0, halfSide + 2.3 - st * 0.8);
      step.position.y = 0.09 + st * 0.11;
      step.castShadow = true; step.receiveShadow = true; grp.add(step);
    }

    // 4 braziers on stone pedestals with layered flames
    const pedGeo = new THREE.BoxGeometry(1.5, 1.0, 1.5);
    const bowlGeo = new THREE.CylinderGeometry(0.85, 0.55, 0.55, 8);
    const bowlMat = new THREE.MeshLambertMaterial({ color: 0x5B6472, flatShading: true });
    const fMat1 = new THREE.MeshBasicMaterial({ color: 0xF97316 });
    const fMat2 = new THREE.MeshBasicMaterial({ color: 0xFDE047 });
    const fGeo1 = new THREE.ConeGeometry(0.55, 1.2, 5);
    const fGeo2 = new THREE.ConeGeometry(0.34, 1.1, 5);
    const fGeo3 = new THREE.ConeGeometry(0.22, 0.7, 5);
    this.sectorMats.push(bowlMat);
    [[-8.5, -8.5], [8.5, -8.5], [-8.5, 8.5], [8.5, 8.5]].forEach(([bx, bz]) => {
      const ped = new THREE.Mesh(pedGeo, this.curbMat); ped.position.set(bx, 0.7, bz); ped.castShadow = true; grp.add(ped);
      const bowl = new THREE.Mesh(bowlGeo, bowlMat); bowl.position.set(bx, 1.45, bz); bowl.castShadow = true; grp.add(bowl);
      const f1 = new THREE.Mesh(fGeo1, fMat1); f1.position.set(bx, 2.25, bz); grp.add(f1);
      const f2 = new THREE.Mesh(fGeo2, fMat2); f2.position.set(bx, 2.6, bz); grp.add(f2);
      const f3 = new THREE.Mesh(fGeo3, fMat1); f3.position.set(bx + 0.3, 2.35, bz - 0.2); f3.rotation.z = -0.25; grp.add(f3);
    });

    this.scene.add(grp);
  }

  applyBiome(biome) {
    this.isSnow = biome && biome.id === 'SNOW';
    const s = this.isSnow;
    this.sandHiMat.color.setHex(s ? SLATE_HI : STONE_HI);
    this.sandShMat.color.setHex(s ? SLATE_SH : STONE_SH);
    const plazaCols = s ? [0x64748B, 0x94A3B8, 0x7A8AA0] : [PLAZA.rim, PLAZA.mid, PLAZA.inner];
    this.plazaTiers.forEach((m, i) => m.color.setHex(plazaCols[i]));
    this.seamMat.color.setHex(s ? 0x475569 : PLAZA.seam);
    this.daisMat.color.setHex(s ? 0x64748B : 0xBDBBB0);
    this.daisTopMat.color.setHex(s ? 0x94A3B8 : 0xD3D1C6);
    this.terraHiMat.color.setHex(s ? SLATE_HI : TERRA_HI);
    this.terraShMat.color.setHex(s ? SLATE_SH : TERRA_SH);
    this.curbMat.color.setHex(s ? 0x94A3B8 : BORDER);
    this.curbDkMat.color.setHex(s ? 0x64748B : BORDER_DK);
  }
}
