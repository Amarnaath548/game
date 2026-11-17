import * as THREE from 'three';

const SAND_HI = 0xEBD09E;
const SAND_SH = 0xC9A368;
const SAND_CURB = 0xE6C28A;
const TERRA_HI = 0xC85A32;
const TERRA_SH = 0x9E472A;
const SLATE_HI = 0x64748B;
const SLATE_SH = 0x334155;

function contactShadow(r) {
  const g = new THREE.CircleGeometry(r, 16); g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false
  }));
}

export class WorldLandmarks {
  constructor(scene, obstacles) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.isSnow = false;
    this.mandapaMats = [];
    this.toranaMats = [];
    this.sectorMats = [];
    this.initMandapa();
    this.initTorana();
    this.initAgniSector();
  }

  /* ── Central Mandapa (0–15u, Flush with Arena Floor) ── */
  initMandapa() {
    this.sandHiMat = new THREE.MeshLambertMaterial({ color: SAND_HI, flatShading: true });
    this.sandShMat = new THREE.MeshLambertMaterial({ color: SAND_SH, flatShading: true });
    this.mandapaMats.push(this.sandHiMat, this.sandShMat);

    [
      { r: 15.5, y: 0.012, color: SAND_SH },
      { r: 14.2, y: 0.015, color: SAND_HI },
      { r: 12.8, y: 0.018, color: SAND_SH }
    ].forEach((tier) => {
      const g = new THREE.CircleGeometry(tier.r, 48).rotateX(-Math.PI / 2);
      const m = new THREE.MeshBasicMaterial({ color: tier.color, side: THREE.DoubleSide, depthWrite: false });
      this.mandapaMats.push(m);
      const mesh = new THREE.Mesh(g, m); mesh.position.y = tier.y; mesh.renderOrder = 1; this.scene.add(mesh);
    });

    const shrineRing = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 4.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: SAND_HI, side: THREE.DoubleSide, depthWrite: false })
    );
    shrineRing.position.y = 0.022; shrineRing.renderOrder = 1; this.scene.add(shrineRing);

    // 4 stepped octagonal corner pillars (r = 13.5u, ruined heights 2.2u to 3.4u)
    const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    const heights = [2.4, 3.4, 2.7, 3.1];
    const baseGeo = new THREE.BoxGeometry(1.6, 0.4, 1.6);
    const neckGeo = new THREE.BoxGeometry(1.0, 0.18, 1.0);
    const capGeo = new THREE.BoxGeometry(1.4, 0.32, 1.4);
    const jaggedGeo = new THREE.DodecahedronGeometry(0.55, 0);

    angles.forEach((a, i) => {
      const px = Math.cos(a) * 13.5, pz = Math.sin(a) * 13.5, h = heights[i];
      const g = new THREE.Group(); g.position.set(px, 0, pz);
      const shad = contactShadow(1.5); shad.position.y = 0.025; g.add(shad);

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

  /* ── Carved Torana Archways at r = 24u and r = 62u ── */
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
        const sh = contactShadow(1.2); sh.position.y = 0.02; g.add(sh);
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

  /* ── Open-Air Agni Yajna-Shala (38, -38, NO roof or house) ── */
  initAgniSector() {
    this.terraHiMat = new THREE.MeshLambertMaterial({ color: TERRA_HI, flatShading: true });
    this.terraShMat = new THREE.MeshLambertMaterial({ color: TERRA_SH, flatShading: true });
    this.curbMat = new THREE.MeshLambertMaterial({ color: SAND_CURB, flatShading: true });
    this.sectorMats.push(this.terraHiMat, this.terraShMat, this.curbMat);

    const agniGroup = new THREE.Group();
    agniGroup.position.set(38, 0, -38);

    // 2-tier stepped square terracotta platform (base 18x18, inner 16x16)
    const platBase = new THREE.Mesh(new THREE.BoxGeometry(18, 0.14, 18), this.terraShMat);
    platBase.position.y = 0.07; platBase.receiveShadow = true; agniGroup.add(platBase);

    const platInner = new THREE.Mesh(new THREE.BoxGeometry(16, 0.18, 16), this.terraHiMat);
    platInner.position.y = 0.16; platInner.receiveShadow = true; agniGroup.add(platInner);

    // Subtle grid of tile seam lines
    const lineMat = new THREE.MeshBasicMaterial({ color: TERRA_SH, depthWrite: false });
    this.sectorMats.push(lineMat);
    for (let i = -6; i <= 6; i += 4) {
      const lx = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 15.6).rotateX(-Math.PI / 2), lineMat);
      lx.position.set(i, 0.252, 0); lx.renderOrder = 1; agniGroup.add(lx);
      const lz = new THREE.Mesh(new THREE.PlaneGeometry(15.6, 0.08).rotateX(-Math.PI / 2), lineMat);
      lz.position.set(0, 0.252, i); lz.renderOrder = 1; agniGroup.add(lz);
    }

    // Wide sandstone edge curbs
    const cb1 = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.22, 0.6), this.curbMat); cb1.position.set(0, 0.26, 8.0); cb1.castShadow = true; agniGroup.add(cb1);
    const cb2 = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.22, 0.6), this.curbMat); cb2.position.set(0, 0.26, -8.0); cb2.castShadow = true; agniGroup.add(cb2);
    const cb3 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 16.4), this.curbMat); cb3.position.set(8.0, 0.26, 0); cb3.castShadow = true; agniGroup.add(cb3);
    const cb4 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 16.4), this.curbMat); cb4.position.set(-8.0, 0.26, 0); cb4.castShadow = true; agniGroup.add(cb4);

    // 4 large carved stone fire braziers at inner corners (±6.2, ±6.2)
    const bowlGeo = new THREE.CylinderGeometry(0.75, 0.55, 0.7, 8);
    const bowlMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const fMat1 = new THREE.MeshBasicMaterial({ color: 0xF97316 });
    const fMat2 = new THREE.MeshBasicMaterial({ color: 0xFDE047 });
    const fGeo1 = new THREE.ConeGeometry(0.48, 0.95, 5);
    const fGeo2 = new THREE.ConeGeometry(0.3, 0.65, 5);
    this.sectorMats.push(bowlMat, fMat1, fMat2);

    [[-6.2, -6.2], [6.2, -6.2], [-6.2, 6.2], [6.2, 6.2]].forEach(([bx, bz]) => {
      const sh = contactShadow(1.3); sh.position.set(bx, 0.02, bz); agniGroup.add(sh);
      const bowl = new THREE.Mesh(bowlGeo, bowlMat); bowl.position.set(bx, 0.6, bz); bowl.castShadow = true; agniGroup.add(bowl);
      const fl1 = new THREE.Mesh(fGeo1, fMat1); fl1.position.set(bx, 1.25, bz); agniGroup.add(fl1);
      const fl2 = new THREE.Mesh(fGeo2, fMat2); fl2.position.set(bx, 1.35, bz); agniGroup.add(fl2);
    });

    this.scene.add(agniGroup);
  }

  applyBiome(biome) {
    this.isSnow = biome && biome.id === 'SNOW';
    const sHi = this.isSnow ? SLATE_HI : SAND_HI;
    const sSh = this.isSnow ? SLATE_SH : SAND_SH;
    const tHi = this.isSnow ? SLATE_HI : TERRA_HI;
    const tSh = this.isSnow ? SLATE_SH : TERRA_SH;

    if (this.sandHiMat) this.sandHiMat.color.setHex(sHi);
    if (this.sandShMat) this.sandShMat.color.setHex(sSh);
    if (this.curbMat) this.curbMat.color.setHex(sHi);
    if (this.terraHiMat) this.terraHiMat.color.setHex(tHi);
    if (this.terraShMat) this.terraShMat.color.setHex(tSh);
    this.mandapaMats.forEach((m) => { if (m.color) m.color.setHex(sHi); });
    this.sectorMats.forEach((m) => { if (m.color) m.color.setHex(tHi); });
  }
}
