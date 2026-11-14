import * as THREE from 'three';

function createAstraRingGroup() {
  const g = new THREE.Group();
  const r1 = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.72, 32), new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
  r1.rotateX(-Math.PI / 2); g.add(r1);
  const r2 = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 32), new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
  r2.rotateX(-Math.PI / 2); g.add(r2);
  const l1 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 3.4), new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
  l1.rotateX(-Math.PI / 2); g.add(l1);
  const l2 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.08), new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
  l2.rotateX(-Math.PI / 2); g.add(l2);
  return g;
}

export class AstraVisuals {
  constructor(scene) {
    this.scene = scene;

    // 1. Pooled Astra Geometric Cast Rings (Tier 3: unique materials per ring)
    this.maxAstraRings = 4;
    this.astraRings = [];
    for (let i = 0; i < this.maxAstraRings; i++) {
      const g = createAstraRingGroup();
      g.position.y = 0.05; g.visible = false;
      this.scene.add(g);
      this.astraRings.push({ group: g, active: false, elapsed: 0, duration: 0.5 });
    }

    // 2. Vajra Concentric Shrinking Telegraphs
    this.maxVajra = 3;
    this.vajras = [];
    const vg1 = new THREE.RingGeometry(0.9, 1.05, 32); vg1.rotateX(-Math.PI / 2);
    const vg2 = new THREE.RingGeometry(0.5, 0.65, 32); vg2.rotateX(-Math.PI / 2);
    for (let i = 0; i < this.maxVajra; i++) {
      const g = new THREE.Group();
      const m1 = new THREE.Mesh(vg1, new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
      const m2 = new THREE.Mesh(vg2, new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      g.add(m1); g.add(m2);
      g.position.y = 0.06; g.visible = false;
      this.scene.add(g);
      this.vajras.push({ group: g, m1, m2, active: false, x: 0, z: 0, maxRadius: 4.0, duration: 0.45, elapsed: 0 });
    }

    // 3. Samudra Manthan Swirling Spiral (4 curved arms with thetaLength ~1.6 rad)
    this.maxSpirals = 3;
    this.spirals = [];
    const armConfigs = [
      { inner: 0.6, outer: 1.1, start: 0 },
      { inner: 1.4, outer: 2.0, start: Math.PI * 0.5 },
      { inner: 2.3, outer: 3.0, start: Math.PI },
      { inner: 3.3, outer: 4.1, start: Math.PI * 1.5 }
    ];
    for (let i = 0; i < this.maxSpirals; i++) {
      const group = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0x99f6e4, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false });
      armConfigs.forEach((cfg) => {
        const geo = new THREE.RingGeometry(cfg.inner, cfg.outer, 24, 1, cfg.start, 1.6);
        geo.rotateX(-Math.PI / 2);
        group.add(new THREE.Mesh(geo, mat));
      });
      group.position.y = 0.07; group.visible = false;
      this.scene.add(group);
      this.spirals.push({ mesh: group, mat, active: false, x: 0, z: 0, elapsed: 0, duration: 0.55 });
    }
  }

  spawnAstraRing(x, z) {
    const r = this.astraRings.find((item) => !item.active);
    if (!r) return;
    r.active = true; r.elapsed = 0;
    r.group.position.set(x, 0.05, z);
    r.group.rotation.y = 0; r.group.visible = true;
    r.group.traverse((c) => { if (c.material) c.material.opacity = 0.9; });
  }

  spawnVajraTelegraph(x, z, maxRadius = 4.0, duration = 0.45) {
    const v = this.vajras.find((item) => !item.active);
    if (!v) return;
    v.active = true; v.x = x; v.z = z; v.maxRadius = maxRadius; v.duration = duration; v.elapsed = 0;
    v.group.position.set(x, 0.06, z); v.group.visible = true;
  }

  spawnSpiral(x, z) {
    const s = this.spirals.find((item) => !item.active);
    if (!s) return;
    s.active = true; s.x = x; s.z = z; s.elapsed = 0;
    s.mesh.position.set(x, 0.07, z); s.mesh.rotation.y = 0; s.mesh.visible = true;
  }

  update(dt) {
    this.astraRings.forEach((r) => {
      if (!r.active) return;
      r.elapsed += dt;
      r.group.rotation.y += 3.5 * dt;
      const progress = r.elapsed / r.duration;
      if (progress >= 1.0) { r.active = false; r.group.visible = false; }
      else { r.group.traverse((c) => { if (c.material) c.material.opacity = 0.9 * (1.0 - progress); }); }
    });

    this.vajras.forEach((v) => {
      if (!v.active) return;
      v.elapsed += dt;
      const p = v.elapsed / v.duration;
      if (p >= 1.0) { v.active = false; v.group.visible = false; }
      else {
        const shrink1 = THREE.MathUtils.lerp(v.maxRadius, 0.2, p);
        const shrink2 = THREE.MathUtils.lerp(v.maxRadius * 0.6, 0.1, p);
        v.m1.scale.set(shrink1, 1, shrink1);
        v.m2.scale.set(shrink2, 1, shrink2);
        v.m1.material.opacity = 0.9 * (1.0 - p * 0.5);
      }
    });

    this.spirals.forEach((s) => {
      if (!s.active) return;
      s.elapsed += dt;
      s.mesh.rotation.y += 6.0 * dt;
      const p = s.elapsed / s.duration;
      if (p >= 1.0) { s.active = false; s.mesh.visible = false; }
      else {
        const sc = THREE.MathUtils.lerp(0.3, 1.0, Math.sqrt(p));
        s.mesh.scale.set(sc, 1, sc);
        s.mat.opacity = 0.8 * (1.0 - p);
      }
    });
  }

  reset() {
    this.astraRings.forEach((r) => { r.active = false; r.group.visible = false; });
    this.vajras.forEach((v) => { v.active = false; v.group.visible = false; });
    this.spirals.forEach((s) => { s.active = false; s.mesh.visible = false; });
  }
}
