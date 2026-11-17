import * as THREE from 'three';

const SANDSTONE = 0xD9B382;
const SANDSTONE_DARK = 0xB89A62;
const SLATE = 0x334155;
const SLATE_DARK = 0x1e293b;
const TERRACOTTA = 0x8C583A;
const TERRACOTTA_SNOW = 0x475569;

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

  /* ── Central Mandapa (0–18u) ── */
  initMandapa() {
    // Paved courtyard base slab
    const slabGeo = new THREE.CylinderGeometry(16, 16, 0.25, 32);
    this.slabMat = new THREE.MeshLambertMaterial({ color: SANDSTONE, flatShading: true });
    this.mandapaMats.push(this.slabMat);
    const slab = new THREE.Mesh(slabGeo, this.slabMat);
    slab.position.y = 0.13; this.scene.add(slab);

    // Concentric border rings
    [14, 16].forEach((r) => {
      const rGeo = new THREE.RingGeometry(r - 0.4, r, 48); rGeo.rotateX(-Math.PI / 2);
      const rMat = new THREE.MeshBasicMaterial({
        color: SANDSTONE_DARK, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false
      });
      this.mandapaMats.push(rMat);
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.position.y = 0.27; ring.renderOrder = 2; this.scene.add(ring);
    });

    // 4 broken corner pillars at r=14u
    const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    const pillarGeo = new THREE.CylinderGeometry(0.55, 0.65, 2.8, 6);
    this.pillarMat = new THREE.MeshLambertMaterial({ color: SANDSTONE, flatShading: true });
    this.mandapaMats.push(this.pillarMat);
    const capGeo = new THREE.DodecahedronGeometry(0.6, 0);

    angles.forEach((a) => {
      const px = Math.cos(a) * 14, pz = Math.sin(a) * 14;
      const g = new THREE.Group(); g.position.set(px, 0, pz);
      const shad = contactShadow(1.4); shad.position.y = 0.02; g.add(shad);
      const pil = new THREE.Mesh(pillarGeo, this.pillarMat);
      pil.position.y = 1.4; g.add(pil);
      const cap = new THREE.Mesh(capGeo, this.pillarMat);
      cap.position.y = 3.1; cap.rotation.set(0.3, a, 0.2); g.add(cap);
      this.scene.add(g);
      this.obstacles.push({ x: px, z: pz, radius: 0.75 });
    });
  }

  /* ── Torana Archways at cardinal approaches ── */
  initTorana() {
    const toranaPositions = [
      { x: 0, z: -55, rot: 0 }, { x: 0, z: 55, rot: Math.PI },
      { x: -55, z: 0, rot: Math.PI / 2 }, { x: 55, z: 0, rot: -Math.PI / 2 },
      { x: 0, z: -90, rot: 0 }, { x: 0, z: 90, rot: Math.PI },
      { x: -90, z: 0, rot: Math.PI / 2 }, { x: 90, z: 0, rot: -Math.PI / 2 }
    ];
    this.toranaPillarMat = new THREE.MeshLambertMaterial({ color: SANDSTONE, flatShading: true });
    this.toranaLintelMat = new THREE.MeshLambertMaterial({ color: SANDSTONE_DARK, flatShading: true });
    this.toranaMats.push(this.toranaPillarMat, this.toranaLintelMat);
    const pGeo = new THREE.CylinderGeometry(0.5, 0.6, 4.5, 6);
    const lGeo = new THREE.BoxGeometry(5.0, 0.6, 1.0);
    const arcGeo = new THREE.TorusGeometry(2.2, 0.25, 6, 12, Math.PI);
    const finGeo = new THREE.ConeGeometry(0.3, 0.9, 4);

    toranaPositions.forEach((tp) => {
      const g = new THREE.Group(); g.position.set(tp.x, 0, tp.z); g.rotation.y = tp.rot;
      // Left pillar
      const lp = new THREE.Mesh(pGeo, this.toranaPillarMat); lp.position.set(-2.2, 2.25, 0); g.add(lp);
      const ls = contactShadow(1.0); ls.position.set(-2.2, 0.02, 0); g.add(ls);
      // Right pillar
      const rp = new THREE.Mesh(pGeo, this.toranaPillarMat); rp.position.set(2.2, 2.25, 0); g.add(rp);
      const rs = contactShadow(1.0); rs.position.set(2.2, 0.02, 0); g.add(rs);
      // Lintel
      const lt = new THREE.Mesh(lGeo, this.toranaLintelMat); lt.position.set(0, 4.8, 0); g.add(lt);
      // Decorative arc
      const arc = new THREE.Mesh(arcGeo, this.toranaLintelMat);
      arc.position.set(0, 5.1, 0); arc.rotation.z = Math.PI; g.add(arc);
      // Upturned finials
      const fl = new THREE.Mesh(finGeo, this.toranaPillarMat); fl.position.set(-2.4, 5.5, 0); g.add(fl);
      const fr = new THREE.Mesh(finGeo, this.toranaPillarMat); fr.position.set(2.4, 5.5, 0); g.add(fr);
      this.scene.add(g);

      // Register pillar colliders (world coords)
      const cos = Math.cos(tp.rot), sin = Math.sin(tp.rot);
      const offsets = [-2.2, 2.2];
      offsets.forEach((ox) => {
        const wx = tp.x + ox * cos;
        const wz = tp.z + ox * sin;
        this.obstacles.push({ x: wx, z: wz, radius: 0.65 });
      });
    });
  }

  /* ── Agni Yajna-Shala sector ground circle ── */
  initAgniSector() {
    const agniGeo = new THREE.CircleGeometry(12, 24); agniGeo.rotateX(-Math.PI / 2);
    this.agniMat = new THREE.MeshLambertMaterial({ color: TERRACOTTA });
    this.sectorMats.push(this.agniMat);
    const agni = new THREE.Mesh(agniGeo, this.agniMat);
    agni.position.set(45, 0.02, -45); agni.renderOrder = 1; this.scene.add(agni);

    // Low stone curb blocks
    const curbGeo = new THREE.BoxGeometry(1.6, 0.4, 0.5);
    const curbMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true });
    this.sectorMats.push(curbMat);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const cb = new THREE.Mesh(curbGeo, curbMat);
      cb.position.set(45 + Math.cos(a) * 11.5, 0.2, -45 + Math.sin(a) * 11.5);
      cb.rotation.y = a; this.scene.add(cb);
    }
  }

  applyBiome(biome) {
    this.isSnow = biome && biome.id === 'SNOW';
    const stone = this.isSnow ? SLATE : SANDSTONE;
    const stoneDk = this.isSnow ? SLATE_DARK : SANDSTONE_DARK;
    if (this.slabMat) this.slabMat.color.setHex(stone);
    if (this.pillarMat) this.pillarMat.color.setHex(stone);
    if (this.toranaPillarMat) this.toranaPillarMat.color.setHex(stone);
    if (this.toranaLintelMat) this.toranaLintelMat.color.setHex(stoneDk);
    if (this.agniMat) this.agniMat.color.setHex(this.isSnow ? TERRACOTTA_SNOW : TERRACOTTA);
  }
}
