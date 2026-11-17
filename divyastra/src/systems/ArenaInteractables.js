import * as THREE from 'three';
import { CollisionSystem } from './CollisionSystem.js';

/* ── Config ── */
const PAD_RADIUS = 1.6;
const PAD_COOLDOWN = 6.0;
const PAD_DASH_SPEED = 38;
const PAD_DASH_DUR = 0.22;
const BRAZIER_BURST_R = 3.2;
const BRAZIER_DMG = 18;
const BRAZIER_CD = 8.0;
const SURYA_COL_R = 0.75;

/* ── Shared helpers ── */
function contactShadow(r) {
  const g = new THREE.CircleGeometry(r, 12); g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false
  }));
}

/* ── Prana Vayu Wind Pad ── */
function buildPad(scene, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  // recessed stone ring
  const baseGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.15, 16);
  g.add(new THREE.Mesh(baseGeo, new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true })));
  // 2 rotating cyan rings
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x80f0ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const r1G = new THREE.RingGeometry(0.9, 1.1, 16); r1G.rotateX(-Math.PI / 2);
  const r1 = new THREE.Mesh(r1G, ringMat); r1.position.y = 0.2; r1.renderOrder = 2; g.add(r1);
  const r2G = new THREE.RingGeometry(0.5, 0.65, 16); r2G.rotateX(-Math.PI / 2);
  const r2 = new THREE.Mesh(r2G, ringMat); r2.position.y = 0.35; r2.renderOrder = 2; g.add(r2);
  scene.add(g);
  return { group: g, x, z, ring1: r1, ring2: r2, type: 'PAD' };
}

/* ── Surya Mirror Pillar ── */
function buildSurya(scene, x, z, obstacles) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const sh = contactShadow(1.2); sh.position.y = 0.02; g.add(sh);
  const pGeo = new THREE.CylinderGeometry(0.65, 0.75, 3.2, 8);
  const pMat = new THREE.MeshLambertMaterial({ color: 0xD49B2A, flatShading: true });
  const p = new THREE.Mesh(pGeo, pMat); p.position.y = 1.6; g.add(p);
  // top cap
  const capGeo = new THREE.CylinderGeometry(0.75, 0.65, 0.3, 8);
  const cap = new THREE.Mesh(capGeo, new THREE.MeshLambertMaterial({ color: 0xFBBF24, flatShading: true }));
  cap.position.y = 3.35; g.add(cap);
  scene.add(g);
  obstacles.push({ x, z, radius: SURYA_COL_R, isSuryaPillar: true });
  return { group: g, x, z, type: 'SURYA' };
}

/* ── Agni Kund Brazier ── */
function buildBrazier(scene, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const sh = contactShadow(1.1); sh.position.y = 0.02; g.add(sh);
  // Stone bowl
  const bowlGeo = new THREE.CylinderGeometry(0.7, 0.9, 0.9, 8);
  g.add(new THREE.Mesh(bowlGeo, new THREE.MeshLambertMaterial({ color: 0x78716c, flatShading: true })));
  bowlGeo.translate(0, 0.45, 0);
  // Flame
  const flameGeo = new THREE.OctahedronGeometry(0.45, 0);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6b1a });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = 1.2; g.add(flame);
  scene.add(g);
  return { group: g, x, z, flame, flameMat, cooldown: 0, lit: true, type: 'BRAZIER' };
}

/* ═══ Main System ═══ */
export class ArenaInteractables {
  constructor(scene, obstacles, particleSys, sound) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.particleSys = particleSys;
    this.sound = sound;
    this.pads = []; this.suryas = []; this.braziers = [];
    this.padCooldowns = new Map(); // actorId -> { padIdx -> timer }
    this.active = false;
  }

  spawn() {
    this.cleanup();
    // Symmetric mid-ring placements (30-70u)
    const padPos = [
      { x: 35, z: 0 }, { x: -35, z: 0 }, { x: 0, z: 35 }, { x: 0, z: -35 }
    ];
    const suryaPos = [
      { x: 25, z: 25 }, { x: -25, z: 25 }, { x: 25, z: -25 }, { x: -25, z: -25 }
    ];
    const brazierPos = [
      { x: 50, z: -40 }, { x: -50, z: 40 }, { x: 40, z: 50 }, { x: -40, z: -50 }
    ];
    padPos.forEach(p => this.pads.push(buildPad(this.scene, p.x, p.z)));
    suryaPos.forEach(p => this.suryas.push(buildSurya(this.scene, p.x, p.z, this.obstacles)));
    brazierPos.forEach(p => this.braziers.push(buildBrazier(this.scene, p.x, p.z)));
    this.padCooldowns.clear();
    this.active = true;
  }

  cleanup() {
    [...this.pads, ...this.suryas, ...this.braziers].forEach(o => this.scene.remove(o.group));
    // Remove surya obstacles from shared list
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      if (this.obstacles[i].isSuryaPillar) this.obstacles.splice(i, 1);
    }
    this.pads = []; this.suryas = []; this.braziers = [];
    this.padCooldowns.clear();
    this.active = false;
  }

  /* ── Per-frame update ── */
  update(dt, actors) {
    if (!this.active) return;
    const t = performance.now() * 0.001;
    // Animate pad rings
    this.pads.forEach(p => {
      p.ring1.rotation.y = t * 1.5;
      p.ring1.position.y = 0.2 + Math.sin(t * 2) * 0.08;
      p.ring2.rotation.y = -t * 2.0;
      p.ring2.position.y = 0.35 + Math.sin(t * 2.5 + 1) * 0.06;
    });
    // Animate brazier flames
    this.braziers.forEach(b => {
      if (b.cooldown > 0) { b.cooldown -= dt; if (b.cooldown <= 0) { b.lit = true; b.flame.visible = true; } }
      if (b.lit) {
        b.flame.scale.setScalar(0.9 + Math.sin(t * 8 + b.x) * 0.2);
        b.flame.rotation.y = t * 3;
        b.flameMat.color.setHex(Math.random() > 0.5 ? 0xff6b1a : 0xffaa33);
      }
    });
    // Check actors on pads
    actors.forEach(actor => {
      if (actor.isDead || actor.dashTimer > 0) return;
      this.checkPads(actor);
      this.checkBraziers(actor, dt);
    });
  }

  checkPads(actor) {
    const id = actor.id || actor.name || 'player';
    if (!this.padCooldowns.has(id)) this.padCooldowns.set(id, {});
    const cds = this.padCooldowns.get(id);
    this.pads.forEach((pad, idx) => {
      if (cds[idx] > 0) { cds[idx] -= 0.016; return; }
      const dist = Math.hypot(actor.x - pad.x, actor.z - pad.z);
      if (dist < PAD_RADIUS) {
        // Launch in facing/movement direction
        let dx = actor.vx || 0, dz = actor.vz || 0;
        const len = Math.hypot(dx, dz);
        if (len < 0.1) { dx = actor.aimDirX || 0; dz = actor.aimDirZ || 1; }
        const nl = Math.hypot(dx, dz) || 1;
        actor.dashTimer = PAD_DASH_DUR;
        actor.dashDirX = dx / nl; actor.dashDirZ = dz / nl;
        actor.dashSpeed = PAD_DASH_SPEED;
        cds[idx] = PAD_COOLDOWN;
        if (this.particleSys) this.particleSys.spawnBurst(pad.x, 0.5, pad.z, 0x80f0ff, 10, 5);
        if (this.sound) this.sound.playDash();
      }
    });
  }

  checkBraziers(actor) {
    this.braziers.forEach(b => {
      if (!b.lit || b.cooldown > 0) return;
      const dist = Math.hypot(actor.x - b.x, actor.z - b.z);
      if (dist < 1.6 && actor.kbTimer > 0) {
        this.triggerBrazier(b, [actor]);
      }
    });
  }

  triggerBrazier(b, nearActors) {
    b.lit = false; b.flame.visible = false; b.cooldown = BRAZIER_CD;
    if (this.particleSys) this.particleSys.spawnBurst(b.x, 1.0, b.z, 0xff4400, 16, 6);
    if (this.sound) this.sound.playExplosion();
    nearActors.forEach(actor => {
      const d = Math.hypot(actor.x - b.x, actor.z - b.z);
      if (d <= BRAZIER_BURST_R && !actor.isDead) {
        actor.takeDamage(BRAZIER_DMG);
        if (actor.applyBurn) actor.applyBurn(8, 2.0);
        const nx = d > 0.01 ? (actor.x - b.x) / d : 0;
        const nz = d > 0.01 ? (actor.z - b.z) / d : 1;
        actor.applyKnockback(nx, nz, 3.0);
      }
    });
  }

  /* ── Surya Mirror projectile reflection ── */
  reflectProjectile(proj) {
    // Find which surya was hit
    for (const s of this.suryas) {
      if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, s.x, s.z, SURYA_COL_R)) {
        if (proj._suryaBounced) return false; // max 1 bounce
        // Reflect velocity: v - 2*dot(v,n)*n
        const nx = proj.x - s.x, nz = proj.z - s.z;
        const nl = Math.hypot(nx, nz) || 1;
        const nnx = nx / nl, nnz = nz / nl;
        const dot = proj.vx * nnx + proj.vz * nnz;
        proj.vx -= 2 * dot * nnx; proj.vz -= 2 * dot * nnz;
        proj._suryaBounced = true;
        // Gold spark burst
        if (this.particleSys) this.particleSys.spawnBurst(proj.x, 1.0, proj.z, 0xFBBF24, 8, 4);
        if (this.sound) this.sound.playHit();
        return true;
      }
    }
    return false;
  }

  /* Brazier damage from attacks hitting it */
  checkAttackOnBrazier(x, z, radius, actors) {
    this.braziers.forEach(b => {
      if (!b.lit) return;
      if (Math.hypot(x - b.x, z - b.z) <= radius + 0.9) {
        this.triggerBrazier(b, actors);
      }
    });
  }
}
