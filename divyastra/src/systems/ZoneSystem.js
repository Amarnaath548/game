import * as THREE from 'three';
import { STORM_PHASES, COLORS, ARENA } from '../config/constants.js';

export class ZoneSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentPhaseIndex = 0;
    this.phaseTime = 0;
    this.currentRadius = STORM_PHASES[0].startRadius;
    this.centerX = 0;
    this.centerZ = 0;
    this.isMatchOver = false;
    this.initRadius = STORM_PHASES[0].startRadius;

    // Flat ground band showing the storm area — a wide annulus from the
    // boundary edge outward to the arena edge. Fully visible from the 58°
    // overhead camera without any vertical surface creating purple haze.
    const bandOuter = ARENA.RADIUS + 30; // extend past arena edge
    const bandGeo = new THREE.RingGeometry(this.currentRadius, bandOuter, 64);
    bandGeo.rotateX(-Math.PI / 2);
    this.bandMat = new THREE.MeshBasicMaterial({
      color: COLORS.STORM_RING,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.stormBand = new THREE.Mesh(bandGeo, this.bandMat);
    this.stormBand.position.y = 0.04;
    this.stormBand.renderOrder = 1;
    this.scene.add(this.stormBand);

    // Bright thin boundary ring on the ground
    const ringGeo = new THREE.RingGeometry(this.currentRadius - 0.6, this.currentRadius + 0.6, 64);
    ringGeo.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.STORM_RING,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.groundRing = new THREE.Mesh(ringGeo, this.ringMat);
    this.groundRing.position.y = 0.09;
    this.groundRing.renderOrder = 2;
    this.scene.add(this.groundRing);
  }

  update(dt, actors = []) {
    if (this.isMatchOver) return;

    const currentPhase = STORM_PHASES[this.currentPhaseIndex];
    if (!currentPhase) return;

    this.phaseTime += dt;
    const progress = Math.min(1.0, this.phaseTime / currentPhase.duration);

    this.currentRadius = THREE.MathUtils.lerp(
      currentPhase.startRadius,
      currentPhase.endRadius,
      progress
    );

    // Rebuild the storm band geometry every frame (cheap for a single ring)
    this.stormBand.geometry.dispose();
    const bandOuter = ARENA.RADIUS + 30;
    const newGeo = new THREE.RingGeometry(Math.max(0.1, this.currentRadius), bandOuter, 64);
    newGeo.rotateX(-Math.PI / 2);
    this.stormBand.geometry = newGeo;

    // Scale the boundary ring instead of rebuilding
    const scale = this.currentRadius / this.initRadius;
    this.groundRing.scale.set(scale, scale, 1);

    // Storm band opacity: invisible during safe phase, ramps up with damage
    const stormStrength = currentPhase.tickDamage > 0
      ? Math.min(1.0, currentPhase.tickDamage / 40)
      : 0;
    this.bandMat.opacity = THREE.MathUtils.lerp(0.0, 0.3, stormStrength);

    // Tick out-of-bounds damage
    if (currentPhase.tickDamage > 0) {
      const damageTick = currentPhase.tickDamage * dt;
      actors.forEach((actor) => {
        if (actor.isDead) return;
        const dist = Math.hypot(actor.x - this.centerX, actor.z - this.centerZ);
        if (dist > this.currentRadius + 1.0) {
          let dmg = damageTick;
          if (!actor.isPlayer && this.currentPhaseIndex < 3) {
            const safeFloor = Math.round(actor.maxHp * 0.4);
            dmg = Math.min(dmg, Math.max(0, actor.hp - safeFloor));
          }
          if (dmg > 0) actor.takeDamage(dmg);
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
