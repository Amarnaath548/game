import * as THREE from 'three';
import { PALETTE } from '../config/palette.js';

const ELEM_TO_STYLE = { F: 'EMBER', W: 'DROPLET', E: 'SHARD' };

export class ParticleSystem {
  constructor(scene, maxParticles = 250) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.particleScale = 1.0;
    this.qualityTier = 'HIGH';
    this.activeCount = 0;

    // InstancedMesh for debris/sparks
    const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, mat, maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.scene.add(this.mesh);

    this.particles = [];
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, tx: 0, ty: 0, tz: 0,
        scale: 1, life: 0, maxLife: 0.5, color: new THREE.Color(1, 1, 1),
        type: 'EMBER' // 'EMBER', 'DROPLET', 'SHARD', 'SPIRAL'
      });
    }
    this.dummy = new THREE.Object3D();
    this.tempColor = new THREE.Color();
    this.maxActiveBursts = 6;
    this.activeBursts = [];

    // Pooled Impact Ring Decals (high-contrast border for Grass and Snow biomes)
    this.maxRings = 12;
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.85, 1.0, 32);
    ringGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < this.maxRings; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.04; ringMesh.visible = false;
      this.scene.add(ringMesh);
      this.rings.push({ mesh: ringMesh, active: false, x: 0, z: 0, maxRadius: 3.0, elapsed: 0, duration: 0.4 });
    }
  }

  spawnBurst(x, y, z, colorHex = PALETTE.elements.AGNI, amount = 12, speed = 8, scale = 1.0, elementsOrStyle = null) {
    this.tempColor.setHex(colorHex);
    let styles = [];
    if (Array.isArray(elementsOrStyle)) {
      styles = elementsOrStyle.map((e) => ELEM_TO_STYLE[e] || e).filter((s) => s === 'EMBER' || s === 'DROPLET' || s === 'SHARD');
    } else if (typeof elementsOrStyle === 'string') {
      const s = ELEM_TO_STYLE[elementsOrStyle] || elementsOrStyle;
      if (s === 'EMBER' || s === 'DROPLET' || s === 'SHARD') styles = [s];
    }

    if (styles.length === 0) {
      if (colorHex === PALETTE.elements.PRITHVI || colorHex === 0x8b5a2b || colorHex === 0x785535 || colorHex === 0x854d0e || colorHex === 0x888899) styles = ['SHARD'];
      else if (colorHex === PALETTE.elements.JALA || colorHex === 0x06b6d4 || colorHex === 0x0284c7 || colorHex === 0x0ea5e9 || colorHex === 0x38bdf8 || colorHex === 0x10b981) styles = ['DROPLET'];
      else styles = ['EMBER'];
    }

    if (this.activeBursts.length >= this.maxActiveBursts) {
      const oldest = this.activeBursts.shift();
      if (oldest) {
        for (let b = 0; b < oldest.indices.length; b++) {
          const idx = oldest.indices[b], p = this.particles[idx];
          if (p && p.active) {
            p.active = false;
            this.dummy.position.set(0, -999, 0);
            this.dummy.scale.set(0, 0, 0);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(idx, this.dummy.matrix);
          }
        }
      }
    }
    const currentBurst = { indices: [], maxLife: 0 };
    const maxSpawn = Math.max(1, Math.round(amount * (this.particleScale || 1.0)));
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < maxSpawn; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x; p.y = y; p.z = z;
        p.type = styles[spawned % styles.length];

        const theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI;
        const mag = (0.5 + Math.random() * 0.5) * speed;

        if (p.type === 'EMBER') {
          p.vx = Math.cos(theta) * mag * 0.45;
          p.vy = (0.8 + Math.random() * 0.8) * speed + 2.5;
          p.vz = Math.sin(theta) * mag * 0.45;
        } else if (p.type === 'DROPLET') {
          p.vx = Math.cos(theta) * mag * 1.1;
          p.vy = Math.sin(phi) * mag * 0.5 + 1.2;
          p.vz = Math.sin(theta) * mag * 1.1;
        } else {
          p.vx = Math.cos(theta) * mag * 0.7;
          p.vy = Math.abs(Math.sin(phi)) * mag * 0.7 + 1.5;
          p.vz = Math.sin(theta) * mag * 0.7;
        }

        p.scale = (0.6 + Math.random() * 0.6) * scale;
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.35;
        p.color.copy(this.tempColor);
        this.mesh.setColorAt(i, p.color);
        currentBurst.indices.push(i);
        if (p.maxLife > currentBurst.maxLife) currentBurst.maxLife = p.maxLife;
        spawned++;
      }
    }
    if (spawned > 0) {
      this.activeBursts.push(currentBurst);
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }

  spawnImpact(x, z, colorHex, radius = 2.5, aoeRadius = 0, elementsOrStyle = null) {
    const targetRadius = aoeRadius > 0 ? aoeRadius : Math.max(1.8, radius * 3.0);
    const particleCount = aoeRadius > 0 ? 24 : 12, speed = aoeRadius > 0 ? 12 : 8;
    this.spawnBurst(x, 0.8, z, colorHex, particleCount, speed, aoeRadius > 0 ? 1.4 : 1.0, elementsOrStyle);
    this.spawnRing(x, z, colorHex, targetRadius, 0.4);
  }

  spawnRing(x, z, colorHex, maxRadius = 3.0, duration = 0.4, y = 0.04) {
    for (let i = 0; i < this.maxRings; i++) {
      const r = this.rings[i];
      if (!r.active) {
        r.active = true; r.x = x; r.z = z; r.maxRadius = maxRadius; r.elapsed = 0; r.duration = duration;
        r.mesh.position.set(x, y, z);
        r.mesh.material.color.setHex(colorHex);
        r.mesh.material.opacity = 0.9;
        r.mesh.scale.set(0.1, 1, 0.1);
        r.mesh.visible = true;
        break;
      }
    }
  }

  spawnMuzzleBurst(x, y, z, dirX, dirZ, colorHex = PALETTE.elements.AGNI, amount = 7, elementsOrStyle = null) {
    this.tempColor.setHex(colorHex);
    const style = Array.isArray(elementsOrStyle) && elementsOrStyle.length > 0 ? (ELEM_TO_STYLE[elementsOrStyle[0]] || 'EMBER') : 'EMBER';
    const maxSpawn = Math.max(1, Math.round(amount * (this.particleScale || 1.0)));
    const len = Math.hypot(dirX, dirZ) || 1, nx = dirX / len, nz = dirZ / len;
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < maxSpawn; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true; p.x = x; p.y = y; p.z = z; p.type = style;
      const spread = (Math.random() - 0.5) * 0.7, spd = 7 + Math.random() * 6;
      p.vx = (nx - nz * spread) * spd; p.vz = (nz + nx * spread) * spd; p.vy = (Math.random() - 0.3) * 3.0;
      p.scale = 0.38 + Math.random() * 0.25; p.life = 0; p.maxLife = 0.18 + Math.random() * 0.12;
      p.color.copy(this.tempColor); this.mesh.setColorAt(i, p.color); spawned++;
    }
    if (spawned > 0 && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  spawnSpiralParticle(actorX, actorZ, tipX, tipY, tipZ, colorHex = PALETTE.elements.AGNI) {
    if (this.qualityTier === 'LOW' || this.activeCount >= this.maxParticles) return;
    this.tempColor.setHex(colorHex);
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      const ang = Math.random() * Math.PI * 2, rad = 0.85 + Math.random() * 0.45;
      p.active = true; p.type = 'SPIRAL'; p.vx = 0; p.vy = 0; p.vz = 0;
      p.x = actorX + Math.cos(ang) * rad; p.y = 0.6 + Math.random() * 0.6; p.z = actorZ + Math.sin(ang) * rad;
      p.tx = tipX; p.ty = tipY; p.tz = tipZ; p.scale = 0.42; p.life = 0; p.maxLife = 0.22;
      p.color.copy(this.tempColor); this.mesh.setColorAt(i, p.color);
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
      this.activeCount++;
      break;
    }
  }

  update(dt) {
    this.activeCount = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.dummy.position.set(0, -999, 0); this.dummy.scale.set(0, 0, 0); this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      this.activeCount++;
      if (p.type === 'SPIRAL') {
        const dx = p.tx - p.x, dy = p.ty - p.y, dz = p.tz - p.z, invT = 1 / Math.max(0.04, p.maxLife - p.life);
        p.x += (dx * invT - dz * 7.5) * dt; p.y += dy * invT * dt; p.z += (dz * invT + dx * 7.5) * dt;
      } else {
        if (p.type === 'EMBER') { p.vy += 3 * dt; p.vx += Math.sin(p.life * 12) * 2 * dt; }
        else if (p.type === 'DROPLET') { p.vy -= 22 * dt; }
        else { p.vy -= 28 * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.1) { p.y = 0.1; p.vy = p.type === 'EMBER' ? 1.5 : -p.vy * 0.35; p.vx *= 0.7; p.vz *= 0.7; }
      }

      const progress = p.life / p.maxLife;
      const currentScale = p.scale * (1 - progress);
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.setScalar(Math.max(0.01, currentScale));
      this.dummy.rotation.x += p.vx * dt * 2;
      this.dummy.rotation.y += p.vz * dt * 2;
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.count = this.maxParticles;
    this.mesh.instanceMatrix.needsUpdate = true;

    for (let b = this.activeBursts.length - 1; b >= 0; b--) {
      this.activeBursts[b].maxLife -= dt;
      if (this.activeBursts[b].maxLife <= 0) this.activeBursts.splice(b, 1);
    }

    for (let i = 0; i < this.maxRings; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      r.elapsed += dt;
      const progress = r.elapsed / r.duration;
      if (progress >= 1.0) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const scale = THREE.MathUtils.lerp(0.2, r.maxRadius, Math.sqrt(progress));
      r.mesh.scale.set(scale, 1, scale);
      r.mesh.material.opacity = 0.9 * (1.0 - progress);
    }
  }
}
