import * as THREE from 'three';

// Shared Geometries & Materials for high-performance projectile visuals
const GEO_SPHERE = new THREE.SphereGeometry(0.5, 8, 8);
const GEO_OCTA = new THREE.OctahedronGeometry(0.5);
const GEO_TETRA = new THREE.TetrahedronGeometry(0.55);
const GEO_TRAIL = new THREE.BoxGeometry(0.32, 0.32, 0.32);

export class Projectile {
  constructor(mesh, pool) {
    this.mesh = mesh; // This is a THREE.Group holding the projectile hierarchy
    this.pool = pool;
    this.active = false;

    this.x = 0;
    this.y = 1.2;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.radius = 0.5;
    this.damage = 50;
    this.distanceTraveled = 0;
    this.maxRange = 24;
    this.spellConfig = null;
    this.lobHeight = 0;
    this.owner = null;
    this.hitTargets = new Set();
    this.animTime = 0;

    this.buildMeshes();
  }

  buildMeshes() {
    // 1. Bright Core Mesh
    this.coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.coreMesh = new THREE.Mesh(GEO_SPHERE, this.coreMat);
    this.coreMesh.scale.setScalar(0.65);
    this.mesh.add(this.coreMesh);

    // 2. Translucent Glowing Outer Shell
    this.shellMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    this.shellMesh = new THREE.Mesh(GEO_SPHERE, this.shellMat);
    this.shellMesh.scale.setScalar(1.2);
    this.mesh.add(this.shellMesh);

    // 3. Pooled Trail Nodes (8 fading quads)
    this.trailCount = 8;
    this.trailNodes = [];
    this.trailHistory = [];

    for (let i = 0; i < this.trailCount; i++) {
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
      });
      const trailMesh = new THREE.Mesh(GEO_TRAIL, trailMat);
      trailMesh.visible = false;
      this.mesh.parent ? this.mesh.parent.add(trailMesh) : null;
      this.trailNodes.push({ mesh: trailMesh, mat: trailMat });
      this.trailHistory.push({ x: 0, y: -99, z: 0 });
    }
  }

  spawn(originX, originZ, dirX, dirZ, spellConfig, owner = 'player') {
    this.active = true;
    this.x = originX;
    this.z = originZ;
    this.spellConfig = spellConfig;
    this.owner = owner;
    this.hitTargets.clear();

    this.vx = dirX * spellConfig.speed;
    this.vz = dirZ * spellConfig.speed;
    this.radius = spellConfig.radius || 0.5;
    this.damage = spellConfig.damage;
    this.maxRange = spellConfig.range;
    this.distanceTraveled = 0;
    this.lobHeight = spellConfig.lobArcHeight || 0;
    this.y = 1.2;
    this.animTime = Math.random() * 10;

    // Attach trail nodes to the scene if not yet parented
    if (this.mesh.parent) {
      this.trailNodes.forEach(t => {
        if (!t.mesh.parent) this.mesh.parent.add(t.mesh);
      });
    }

    // Set geometry per spell
    const sid = spellConfig.id;
    if (sid === 'CRYO') {
      this.coreMesh.geometry = GEO_OCTA;
      this.shellMesh.geometry = GEO_OCTA;
    } else if (sid === 'ELECTRO') {
      this.coreMesh.geometry = GEO_TETRA;
      this.shellMesh.geometry = GEO_TETRA;
    } else {
      this.coreMesh.geometry = GEO_SPHERE;
      this.shellMesh.geometry = GEO_SPHERE;
    }

    // Colors: bright core, saturated glowing shell
    this.coreMat.color.setHex(sid === 'ELECTRO' || sid === 'CRYO' ? 0xffffff : spellConfig.color);
    this.shellMat.color.setHex(spellConfig.color);

    // Scale mesh by spell radius
    const baseScale = Math.max(0.7, (this.radius / 0.5) * 1.15);
    this.mesh.scale.setScalar(baseScale);
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.visible = true;

    // Initialize trail history
    for (let i = 0; i < this.trailCount; i++) {
      this.trailHistory[i].x = this.x;
      this.trailHistory[i].y = this.y;
      this.trailHistory[i].z = this.z;
      const t = this.trailNodes[i];
      t.mat.color.setHex(spellConfig.color);
      t.mesh.position.set(this.x, this.y, this.z);
      t.mesh.visible = true;
    }
  }

  update(dt, targets = []) {
    if (!this.active) return;
    this.animTime += dt;

    // Homing steer towards nearest valid enemy at 2.0 rad/s
    if (this.spellConfig?.homing && targets.length > 0) {
      let nearest = null;
      let nearestDist = 20;
      for (const t of targets) {
        if (t === this.owner || t.isDead) continue;
        const d = Math.hypot(t.x - this.x, t.z - this.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = t;
        }
      }
      if (nearest) {
        const targetAngle = Math.atan2(nearest.x - this.x, nearest.z - this.z);
        const curAngle = Math.atan2(this.vx, this.vz);
        let diff = targetAngle - curAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const maxTurn = (this.spellConfig.turnRate || 2.0) * dt;
        const turn = Math.sign(diff) * Math.min(Math.abs(diff), maxTurn);
        const newAngle = curAngle + turn;
        const spd = this.spellConfig.speed;
        this.vx = Math.sin(newAngle) * spd;
        this.vz = Math.cos(newAngle) * spd;
      }
    }

    const dx = this.vx * dt;
    const dz = this.vz * dt;
    this.x += dx;
    this.z += dz;
    this.distanceTraveled += Math.hypot(dx, dz);

    if (this.lobHeight > 0) {
      const progress = Math.min(1.0, this.distanceTraveled / this.maxRange);
      this.y = 1.2 + Math.sin(progress * Math.PI) * this.lobHeight;
    } else {
      this.y = 1.2;
    }

    this.mesh.position.set(this.x, this.y, this.z);

    // Per-spell cartoon visual animation
    const sid = this.spellConfig?.id;
    if (sid === 'PYRO') {
      const pulse = 1.0 + Math.sin(this.animTime * 24) * 0.14;
      this.shellMesh.scale.setScalar(1.2 * pulse);
    } else if (sid === 'CRYO') {
      this.coreMesh.rotation.y += 12 * dt;
      this.coreMesh.rotation.x += 8 * dt;
      this.shellMesh.rotation.y -= 10 * dt;
    } else if (sid === 'ELECTRO') {
      this.coreMesh.position.x = (Math.random() - 0.5) * 0.12;
      this.coreMesh.position.z = (Math.random() - 0.5) * 0.12;
      this.shellMesh.rotation.z += 16 * dt;
    } else if (sid === 'VENOM') {
      const wobble = 1.0 + Math.sin(this.animTime * 14) * 0.22;
      this.shellMesh.scale.set(1.2 / wobble, 1.2 * wobble, 1.2 / wobble);
    }

    // Update pooled fading trail
    this.trailHistory.pop();
    this.trailHistory.unshift({ x: this.x, y: this.y, z: this.z });

    for (let i = 0; i < this.trailCount; i++) {
      const t = this.trailNodes[i];
      const h = this.trailHistory[i];
      t.mesh.position.set(h.x, h.y, h.z);
      const factor = 1.0 - (i / this.trailCount);
      t.mat.opacity = 0.55 * factor;
      t.mesh.scale.setScalar(Math.max(0.1, (this.radius / 0.5) * factor * 0.85));
      t.mesh.visible = true;
    }

    if (this.distanceTraveled >= this.maxRange) {
      this.despawn(true);
    }
  }

  despawn(reachedMaxRange = false) {
    if (!this.active) return;
    this.active = false;
    this.mesh.visible = false;
    this.trailNodes.forEach(t => {
      t.mesh.visible = false;
    });
    if (this.pool) this.pool.release(this.mesh);
  }
}
