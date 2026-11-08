import * as THREE from 'three';
import { STORM_PHASES, COLORS } from '../config/constants.js';

export class ZoneSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentPhaseIndex = 0;
    this.phaseTime = 0;
    this.currentRadius = STORM_PHASES[0].startRadius;
    this.centerX = 0;
    this.centerZ = 0;
    this.isMatchOver = false;

    // Visual Cylinder Forcefield
    const cylGeo = new THREE.CylinderGeometry(this.currentRadius, this.currentRadius, 18, 64, 1, true);
    this.cylMat = new THREE.MeshBasicMaterial({
      color: COLORS.STORM_RING,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.forcefield = new THREE.Mesh(cylGeo, this.cylMat);
    this.forcefield.position.set(0, 9, 0);
    this.scene.add(this.forcefield);

    // Glowing ground perimeter ring
    const ringGeo = new THREE.RingGeometry(this.currentRadius - 0.4, this.currentRadius + 0.4, 64);
    ringGeo.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.STORM_RING,
      side: THREE.DoubleSide
    });
    this.groundRing = new THREE.Mesh(ringGeo, this.ringMat);
    this.groundRing.position.y = 0.08;
    this.scene.add(this.groundRing);
  }

  update(dt, actors = []) {
    if (this.isMatchOver) return;

    const currentPhase = STORM_PHASES[this.currentPhaseIndex];
    if (!currentPhase) return;

    this.phaseTime += dt;
    const progress = Math.min(1.0, this.phaseTime / currentPhase.duration);

    // Lerp radius
    this.currentRadius = THREE.MathUtils.lerp(
      currentPhase.startRadius,
      currentPhase.endRadius,
      progress
    );

    // Update 3D visual cylinder scale
    const scale = this.currentRadius / STORM_PHASES[0].startRadius;
    this.forcefield.scale.set(scale, 1, scale);
    this.groundRing.scale.set(scale, scale, 1);

    // Tick out-of-bounds damage (ONLY if phase has tickDamage > 0)
    if (currentPhase.tickDamage > 0) {
      const damageTick = currentPhase.tickDamage * dt;
      actors.forEach((actor) => {
        if (actor.isDead) return;
        const dist = Math.hypot(actor.x - this.centerX, actor.z - this.centerZ);
        // Generous buffer so actors inside the boundary never take storm damage
        if (dist > this.currentRadius + 1.0) {
          actor.takeDamage(damageTick);
        }
      });
    }

    // Advance Phase
    if (this.phaseTime >= currentPhase.duration) {
      if (this.currentPhaseIndex < STORM_PHASES.length - 1) {
        this.currentPhaseIndex++;
        this.phaseTime = 0;
      } else {
        this.isMatchOver = true;
      }
    }
  }

  getSafeDistance(x, z) {
    const dist = Math.hypot(x - this.centerX, z - this.centerZ);
    return this.currentRadius - dist;
  }
}

