import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene, maxParticles = 250) {
    this.scene = scene;
    this.maxParticles = maxParticles;

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

    // Pooled Impact Ring Decals (flat colored rings expanding on the ground)
    this.maxRings = 12;
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.85, 1.0, 32);
    ringGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < this.maxRings; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.04;
      ringMesh.visible = false;
      this.scene.add(ringMesh);

      this.rings.push({
        mesh: ringMesh,
        active: false,
        x: 0,
        z: 0,
        maxRadius: 3.0,
        elapsed: 0,
        duration: 0.4
      });
    }
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

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const mag = (0.5 + Math.random() * 0.5) * speed;

        p.vx = Math.sin(phi) * Math.cos(theta) * mag;
        p.vy = Math.abs(Math.cos(phi)) * mag + 2;
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

  spawnImpact(x, z, colorHex, radius = 2.5, aoeRadius = 0) {
    const targetRadius = aoeRadius > 0 ? aoeRadius : Math.max(1.8, radius * 3.0);
    const particleCount = aoeRadius > 0 ? 26 : 14;
    const speed = aoeRadius > 0 ? 12 : 8;

    this.spawnBurst(x, 0.8, z, colorHex, particleCount, speed, aoeRadius > 0 ? 1.4 : 1.0);
    this.spawnRing(x, z, colorHex, targetRadius, 0.4);
  }

  spawnRing(x, z, colorHex, maxRadius = 3.0, duration = 0.4) {
    for (let i = 0; i < this.maxRings; i++) {
      const r = this.rings[i];
      if (!r.active) {
        r.active = true;
        r.x = x;
        r.z = z;
        r.maxRadius = maxRadius;
        r.elapsed = 0;
        r.duration = duration;

        r.mesh.position.set(x, 0.04, z);
        r.mesh.material.color.setHex(colorHex);
        r.mesh.material.opacity = 0.85;
        r.mesh.scale.set(0.1, 1, 0.1);
        r.mesh.visible = true;
        break;
      }
    }
  }

  update(dt) {
    // Update Debris/Sparks
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      p.vy -= 18 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

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
    }

    this.mesh.count = this.maxParticles;
    this.mesh.instanceMatrix.needsUpdate = true;

    // Update Ground Ring Decals
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

      // Smooth expanding scale and fading opacity
      const scale = THREE.MathUtils.lerp(0.2, r.maxRadius, Math.sqrt(progress));
      r.mesh.scale.set(scale, 1, scale);
      r.mesh.material.opacity = 0.85 * (1.0 - progress);
    }
  }
}
