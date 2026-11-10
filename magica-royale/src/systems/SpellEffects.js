import * as THREE from 'three';

export class SpellEffects {
  constructor(scene, particleSys) {
    this.scene = scene;
    this.particleSys = particleSys;

    // 1. Pooled Radial Rings (Supernova, Hurricane)
    this.maxRadials = 4;
    this.radials = [];
    const radGeo = new THREE.RingGeometry(0.85, 1.0, 32);
    radGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < this.maxRadials; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(radGeo, mat);
      mesh.position.y = 0.08;
      mesh.visible = false;
      this.scene.add(mesh);
      this.radials.push({ mesh, mat, active: false, x: 0, z: 0, curRadius: 0, maxRadius: 6, duration: 0.4, elapsed: 0, config: null, owner: null, hitTargets: new Set() });
    }

    // 2. Pooled Waves (Tsunami, Avalanche)
    this.maxWaves = 4;
    this.waves = [];
    const waveGeo = new THREE.BoxGeometry(1, 0.8, 1);
    for (let i = 0; i < this.maxWaves; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.75, depthWrite: false });
      const mesh = new THREE.Mesh(waveGeo, mat);
      mesh.position.y = 0.45;
      mesh.visible = false;
      this.scene.add(mesh);
      this.waves.push({ mesh, mat, active: false, x: 0, z: 0, dirX: 0, dirZ: 1, angle: 0, speed: 20, distanceTraveled: 0, maxRange: 24, width: 8, depth: 2, config: null, owner: null, hitTargets: new Set() });
    }

    // 3. Pooled Hazard Zones (Eruption, Storm Front)
    this.maxHazards = 6;
    this.hazards = [];
    const hazGeo = new THREE.RingGeometry(0.05, 1.0, 32);
    hazGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < this.maxHazards; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(hazGeo, mat);
      mesh.position.y = 0.03;
      mesh.visible = false;
      this.scene.add(mesh);
      this.hazards.push({ mesh, mat, active: false, x: 0, z: 0, radius: 5, dps: 20, duration: 3.5, elapsed: 0, config: null, owner: null, tickTimer: 0 });
    }

    // 4. Pooled Lightning Beams (Thunderbolt)
    this.maxBeams = 4;
    this.beams = [];
    const beamGeo = new THREE.CylinderGeometry(0.25, 0.5, 24, 6);
    for (let i = 0; i < this.maxBeams; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(beamGeo, mat);
      mesh.position.y = 12;
      mesh.visible = false;
      this.scene.add(mesh);
      this.beams.push({ mesh, mat, active: false, elapsed: 0, duration: 0.18 });
    }
  }

  spawnRadial(x, z, config, owner) {
    const r = this.radials.find((item) => !item.active);
    if (!r) return;
    r.active = true;
    r.x = x;
    r.z = z;
    r.maxRadius = config.radius || 6.0;
    r.duration = 0.42;
    r.elapsed = 0;
    r.config = config;
    r.owner = owner;
    r.hitTargets.clear();
    r.mat.color.setHex(config.color || 0xffffff);
    r.mesh.position.set(x, 0.08, z);
    r.mesh.scale.set(0.1, 1, 0.1);
    r.mesh.visible = true;
    if (this.particleSys) this.particleSys.spawnBurst(x, 0.5, z, config.color, 12, 6);
  }

  spawnWave(x, z, dirX, dirZ, config, owner) {
    const w = this.waves.find((item) => !item.active);
    if (!w) return;
    w.active = true;
    w.x = x;
    w.z = z;
    const len = Math.hypot(dirX, dirZ) || 1;
    w.dirX = dirX / len;
    w.dirZ = dirZ / len;
    w.angle = Math.atan2(w.dirX, w.dirZ);
    w.speed = config.speed || 20;
    w.distanceTraveled = 0;
    w.maxRange = config.range || 24;
    w.width = config.width || 8.0;
    w.depth = config.depth || 2.0;
    w.config = config;
    w.owner = owner;
    w.hitTargets.clear();
    w.mat.color.setHex(config.color || 0x0ea5e9);
    w.mesh.scale.set(w.width, 0.8, w.depth);
    w.mesh.rotation.y = w.angle;
    w.mesh.position.set(x, 0.45, z);
    w.mesh.visible = true;
  }

  spawnHazardZone(x, z, config, owner) {
    const hz = this.hazards.find((item) => !item.active);
    if (!hz) return;
    const cfg = config.hazardZone || {};
    hz.active = true;
    hz.x = x;
    hz.z = z;
    hz.radius = cfg.radius || config.aoeRadius || 5.0;
    hz.dps = cfg.dps || 22;
    hz.duration = cfg.duration || 3.5;
    hz.elapsed = 0;
    hz.tickTimer = 0;
    hz.config = config;
    hz.owner = owner;
    hz.mat.color.setHex(config.color || 0xca8a04);
    hz.mesh.position.set(x, 0.03, z);
    hz.mesh.scale.set(hz.radius, 1, hz.radius);
    hz.mesh.visible = true;
    if (this.particleSys) this.particleSys.spawnBurst(x, 0.4, z, config.color, 10, 4);
  }

  spawnLightningBeam(x, z, colorHex = 0xfef08a) {
    const b = this.beams.find((item) => !item.active);
    if (!b) return;
    b.active = true;
    b.elapsed = 0;
    b.mat.color.setHex(colorHex);
    b.mat.opacity = 0.95;
    b.mesh.position.set(x, 12, z);
    b.mesh.visible = true;
    if (this.particleSys) this.particleSys.spawnBurst(x, 1.0, z, colorHex, 20, 10);
  }

  update(dt, targets = [], onHitCallback = null) {
    // 1. Radials
    this.radials.forEach((r) => {
      if (!r.active) return;
      r.elapsed += dt;
      const progress = r.elapsed / r.duration;
      if (progress >= 1.0) { r.active = false; r.mesh.visible = false; return; }
      r.curRadius = THREE.MathUtils.lerp(0.5, r.maxRadius, Math.sqrt(progress));
      r.mesh.scale.set(r.curRadius, 1, r.curRadius);
      r.mat.opacity = 0.85 * (1.0 - progress);

      targets.forEach((t) => {
        if (t.isDead || t === r.owner || r.hitTargets.has(t)) return;
        const d = Math.hypot(t.x - r.x, t.z - r.z);
        if (d <= r.curRadius + t.radius && d >= r.curRadius - 1.4) {
          r.hitTargets.add(t);
          if (onHitCallback) onHitCallback(t, r.config, r.owner, r.x, r.z);
        }
      });
    });

    // 2. Waves
    this.waves.forEach((w) => {
      if (!w.active) return;
      const dist = w.speed * dt;
      w.x += w.dirX * dist;
      w.z += w.dirZ * dist;
      w.distanceTraveled += dist;
      w.mesh.position.set(w.x, 0.45, w.z);

      const cos = Math.cos(-w.angle), sin = Math.sin(-w.angle);
      const halfW = w.width * 0.5, halfD = w.depth * 0.5;

      targets.forEach((t) => {
        if (t.isDead || t === w.owner || w.hitTargets.has(t)) return;
        const dx = t.x - w.x, dz = t.z - w.z;
        const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
        if (Math.abs(lx) <= halfW + t.radius && Math.abs(lz) <= halfD + t.radius) {
          w.hitTargets.add(t);
          if (onHitCallback) onHitCallback(t, w.config, w.owner, w.x, w.z, w.dirX, w.dirZ);
        }
      });

      if (w.distanceTraveled >= w.maxRange) { w.active = false; w.mesh.visible = false; }
    });

    // 3. Hazard Zones
    this.hazards.forEach((hz) => {
      if (!hz.active) return;
      hz.elapsed += dt;
      hz.tickTimer += dt;
      const pulse = 1.0 + Math.sin(hz.elapsed * 6) * 0.05;
      hz.mesh.scale.set(hz.radius * pulse, 1, hz.radius * pulse);

      if (hz.tickTimer >= 0.25) {
        hz.tickTimer = 0;
        const tickDmg = Math.round(hz.dps * 0.25);
        targets.forEach((t) => {
          if (t.isDead || t === hz.owner) return;
          if (Math.hypot(t.x - hz.x, t.z - hz.z) <= hz.radius) {
            if (onHitCallback) onHitCallback(t, { ...hz.config, damage: tickDmg, isDoT: true }, hz.owner, hz.x, hz.z);
          }
        });
      }

      if (hz.elapsed >= hz.duration) { hz.active = false; hz.mesh.visible = false; }
    });

    // 4. Lightning Beams
    this.beams.forEach((b) => {
      if (!b.active) return;
      b.elapsed += dt;
      b.mat.opacity = 0.95 * (1.0 - b.elapsed / b.duration);
      if (b.elapsed >= b.duration) { b.active = false; b.mesh.visible = false; }
    });
  }

  reset() {
    [...this.radials, ...this.waves, ...this.hazards, ...this.beams].forEach((e) => {
      e.active = false;
      if (e.mesh) e.mesh.visible = false;
    });
  }
}

