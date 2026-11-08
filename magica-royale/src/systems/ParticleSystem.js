import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene, maxParticles = 300) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.count = 0;

    // Use InstancedMesh with small box geometry for low-poly debris/sparks
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, mat, maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.scene.add(this.mesh);

    // Particle state buffers
    this.particles = [];
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 1,
        life: 0,
        maxLife: 0.5,
        color: new THREE.Color(1, 1, 1)
      });
    }

    this.dummy = new THREE.Object3D();
  }

  spawnBurst(x, y, z, colorHex = 0xff5500, amount = 12, speed = 8, scale = 1.0) {
    const col = new THREE.Color(colorHex);
    let spawned = 0;

    for (let i = 0; i < this.maxParticles && spawned < amount; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;

        // Random spherical burst
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const mag = (0.5 + Math.random() * 0.5) * speed;

        p.vx = Math.sin(phi) * Math.cos(theta) * mag;
        p.vy = Math.abs(Math.cos(phi)) * mag + 2; // upward bias
        p.vz = Math.sin(phi) * Math.sin(theta) * mag;

        p.scale = (0.6 + Math.random() * 0.6) * scale;
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.35;
        p.color.copy(col);

        this.mesh.setColorAt(i, p.color);
        spawned++;
      }
    }
    if (spawned > 0 && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  update(dt) {
    let activeCount = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        // Scale to 0 to hide
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      // Physics
      p.vy -= 18 * dt; // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Ground bounce
      if (p.y < 0.1) {
        p.y = 0.1;
        p.vy = -p.vy * 0.4;
        p.vx *= 0.7;
        p.vz *= 0.7;
      }

      const progress = p.life / p.maxLife;
      const currentScale = p.scale * (1 - progress);

      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.setScalar(Math.max(0.01, currentScale));
      this.dummy.rotation.x += p.vx * dt * 2;
      this.dummy.rotation.y += p.vz * dt * 2;
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      activeCount++;
    }

    this.mesh.count = this.maxParticles;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

