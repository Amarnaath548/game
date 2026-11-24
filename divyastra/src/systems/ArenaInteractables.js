import * as THREE from 'three';
import { CollisionSystem } from './CollisionSystem.js';
import { PAD_COORDS, SURYA_COORDS, BRAZIER_COORDS } from '../config/worldLayout.js';
import { PALETTE } from '../config/palette.js';

const PAD_RADIUS = 1.6;
const PAD_COOLDOWN = 6.0;
const PAD_DASH_SPEED = 38;
const PAD_DASH_DUR = 0.22;
const BRAZIER_BURST_R = 3.2;
const BRAZIER_DMG = 18;
const BRAZIER_CD = 8.0;
const SURYA_COL_R = 0.85;

function contactShadow(r) {
  const g = new THREE.CircleGeometry(r, 12); g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false
  }));
}

/* ── Prana Vayu Wind Pad ── */
function buildPad(scene, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const sh = contactShadow(1.6); sh.position.y = 0.02; g.add(sh);

  const baseGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.15, 16);
  g.add(new THREE.Mesh(baseGeo, new THREE.MeshLambertMaterial({ color: PALETTE.stone, flatShading: true })));

  const r1Mat = new THREE.MeshBasicMaterial({ color: PALETTE.elements.JALA, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
  const r1 = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 16).rotateX(-Math.PI / 2), r1Mat);
  r1.position.y = 0.18; r1.renderOrder = 2; g.add(r1);

  const r2Mat = new THREE.MeshBasicMaterial({ color: PALETTE.bone, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false });
  const r2 = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.65, 16).rotateX(-Math.PI / 2), r2Mat);
  r2.position.y = 0.32; r2.renderOrder = 2; g.add(r2);
  scene.add(g);
  return { group: g, x, z, ring1: r1, ring2: r2, type: 'PAD' };
}

/* ── Surya Mirror Pillar ── */
function buildSurya(scene, x, z, obstacles) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const sh = contactShadow(1.5); sh.position.y = 0.02; g.add(sh);

  // Stepped hexagonal gold base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.45, 6), new THREE.MeshLambertMaterial({ color: PALETTE.gold, flatShading: true }));
  base.position.y = 0.225; g.add(base);

  // Tall beveled octagonal gold monolith (height: 3.8, radius: 0.75 in gold)
  const frameMat = new THREE.MeshLambertMaterial({ color: PALETTE.gold, flatShading: true });
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.75, 3.8, 8), frameMat);
  frame.position.y = 2.35; g.add(frame);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.72, 0.35, 8), new THREE.MeshLambertMaterial({ color: PALETTE.saffron, flatShading: true }));
  cap.position.y = 4.4; g.add(cap);

  // Bright vertical glowing mirror panel on front/back faces
  const coreMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bone, emissive: PALETTE.gold, emissiveIntensity: 0.45, metalness: 0.85, roughness: 0.1, flatShading: true
  });
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.8, 0.25), coreMat);
  core.position.y = 2.35; g.add(core);

  scene.add(g);
  obstacles.push({ x, z, radius: SURYA_COL_R, isSuryaPillar: true });
  return { group: g, x, z, type: 'SURYA' };
}

/* ── Agni Kund Brazier ── */
function buildBrazier(scene, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const sh = contactShadow(1.2); sh.position.y = 0.02; g.add(sh);

  // Wide dark stone bowl
  const bowlGeo = new THREE.CylinderGeometry(0.85, 0.6, 0.65, 8);
  const bowl = new THREE.Mesh(bowlGeo, new THREE.MeshLambertMaterial({ color: PALETTE.ink, flatShading: true }));
  bowl.position.y = 0.325; g.add(bowl);

  // Glowing embers
  const embers = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 8).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: PALETTE.sindoor })
  );
  embers.position.y = 0.64; embers.renderOrder = 2; g.add(embers);

  // 3 layered low-poly flame cones
  const fMat1 = new THREE.MeshBasicMaterial({ color: PALETTE.elements.AGNI });
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 5), fMat1);
  f1.position.y = 1.15; g.add(f1);

  const fMat2 = new THREE.MeshBasicMaterial({ color: PALETTE.saffron });
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.85, 5), fMat2);
  f2.position.y = 1.05; g.add(f2);

  const fMat3 = new THREE.MeshBasicMaterial({ color: PALETTE.gold });
  const f3 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 5), fMat3);
  f3.position.y = 0.95; g.add(f3);

  scene.add(g);
  return { group: g, x, z, embers, f1, f2, f3, cooldown: 0, lit: true, type: 'BRAZIER' };
}

/* ═══ Main System ═══ */
export class ArenaInteractables {
  constructor(scene, obstacles, particleSys, sound) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.particleSys = particleSys;
    this.sound = sound;
    this.pads = []; this.suryas = []; this.braziers = [];
    this.padCooldowns = new Map();
    this.active = false;
  }

  spawn() {
    this.cleanup();
    const padPos = PAD_COORDS.map(([x, z]) => ({ x, z }));
    const suryaPos = SURYA_COORDS.map(([x, z]) => ({ x, z }));
    const brazierPos = BRAZIER_COORDS.map(([x, z]) => ({ x, z }));

    padPos.forEach(p => this.pads.push(buildPad(this.scene, p.x, p.z)));
    suryaPos.forEach(p => this.suryas.push(buildSurya(this.scene, p.x, p.z, this.obstacles)));
    brazierPos.forEach(p => this.braziers.push(buildBrazier(this.scene, p.x, p.z)));
    this.padCooldowns.clear();
    this.active = true;
  }

  cleanup() {
    [...this.pads, ...this.suryas, ...this.braziers].forEach(o => this.scene.remove(o.group));
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      if (this.obstacles[i].isSuryaPillar) this.obstacles.splice(i, 1);
    }
    this.pads = []; this.suryas = []; this.braziers = [];
    this.padCooldowns.clear();
    this.active = false;
  }

  update(dt, actors) {
    if (!this.active) return;
    const t = performance.now() * 0.001;

    // Pulse & rotate wind pads
    this.pads.forEach(p => {
      p.ring1.rotation.y = t * 1.6;
      p.ring1.position.y = 0.18 + Math.sin(t * 2.2) * 0.05;
      p.ring2.rotation.y = -t * 2.2;
      p.ring2.position.y = 0.32 + Math.sin(t * 2.8 + 1) * 0.06;
    });

    // Animate 3 layered flames
    this.braziers.forEach(b => {
      if (b.cooldown > 0) {
        b.cooldown -= dt;
        if (b.cooldown <= 0) {
          b.lit = true;
          b.embers.visible = true;
          [b.f1, b.f2, b.f3].forEach(f => { f.visible = true; });
        }
      }
      if (b.lit) {
        const s = 1.0 + Math.sin(t * 7 + b.x) * 0.12;
        b.f1.scale.set(s, s * 1.1, s); b.f1.rotation.y = t * 2.5;
        b.f2.scale.set(s * 0.9, s, s * 0.9); b.f2.rotation.y = -t * 3.2;
        b.f3.scale.set(s * 1.1, s * 0.85, s * 1.1);
      }
    });

    actors.forEach(actor => {
      if (actor.isDead || actor.dashTimer > 0) return;
      this.checkPads(actor);
      this.checkBraziers(actor);
    });
  }

  checkPads(actor) {
    const id = actor.id || actor.name || 'player';
    if (!this.padCooldowns.has(id)) this.padCooldowns.set(id, {});
    const cds = this.padCooldowns.get(id);

    this.pads.forEach((pad, idx) => {
      if (cds[idx] > 0) { cds[idx] -= 0.016; return; }
      if (Math.hypot(actor.x - pad.x, actor.z - pad.z) < PAD_RADIUS) {
        let dx = actor.vx || 0, dz = actor.vz || 0;
        if (Math.hypot(dx, dz) < 0.1) { dx = actor.aimDirX || 0; dz = actor.aimDirZ || 1; }
        const nl = Math.hypot(dx, dz) || 1;
        actor.dashTimer = PAD_DASH_DUR;
        actor.dashDirX = dx / nl; actor.dashDirZ = dz / nl;
        actor.dashSpeed = PAD_DASH_SPEED;
        cds[idx] = PAD_COOLDOWN;
        if (this.particleSys) this.particleSys.spawnBurst(pad.x, 0.5, pad.z, PALETTE.elements.JALA, 10, 5);
        if (this.sound) this.sound.playDash();
      }
    });
  }

  checkBraziers(actor) {
    this.braziers.forEach(b => {
      if (!b.lit || b.cooldown > 0) return;
      if (Math.hypot(actor.x - b.x, actor.z - b.z) < 1.6 && actor.kbTimer > 0) {
        this.triggerBrazier(b, [actor]);
      }
    });
  }

  triggerBrazier(b, nearActors) {
    b.lit = false;
    b.embers.visible = false;
    [b.f1, b.f2, b.f3].forEach(f => { f.visible = false; });
    b.cooldown = BRAZIER_CD;
    if (this.particleSys) this.particleSys.spawnBurst(b.x, 1.0, b.z, PALETTE.elements.AGNI, 16, 6);
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

  reflectProjectile(proj) {
    for (const s of this.suryas) {
      if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, s.x, s.z, SURYA_COL_R)) {
        if (proj._suryaBounced) return false;
        const nx = proj.x - s.x, nz = proj.z - s.z;
        const nl = Math.hypot(nx, nz) || 1;
        const nnx = nx / nl, nnz = nz / nl;
        const dot = proj.vx * nnx + proj.vz * nnz;
        proj.vx -= 2 * dot * nnx; proj.vz -= 2 * dot * nnz;
        proj._suryaBounced = true;
        if (this.particleSys) this.particleSys.spawnBurst(proj.x, 1.0, proj.z, PALETTE.gold, 8, 4);
        if (this.sound) this.sound.playHit();
        return true;
      }
    }
    return false;
  }
}
