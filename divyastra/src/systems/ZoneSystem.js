import * as THREE from 'three';
import { STORM_PHASES, ARENA } from '../config/constants.js';
import { ZoneVisuals } from './ZoneVisuals.js';
import { getDifficulty } from '../config/difficulty.js';

export let activeZoneSystem = null;

export class ZoneSystem {
  constructor(scene) {
    if (activeZoneSystem && typeof activeZoneSystem.dispose === 'function') {
      activeZoneSystem.dispose();
    }

    this.scene = scene;
    this.currentPhaseIndex = 0;
    this.phaseTime = 0;
    this.currentRadius = STORM_PHASES[0].startRadius;
    this.centerX = 0;
    this.centerZ = 0;
    this.isMatchOver = false;
    this.initRadius = STORM_PHASES[0].startRadius;

    this.visuals = new ZoneVisuals(scene);
    this.forcefield = this.visuals.wall;
    this.groundRing = this.visuals.edgeRing;

    activeZoneSystem = this;
    if (typeof window !== 'undefined') window.__zoneSys = this;
  }

  update(dt, actors = []) {
    if (this.isMatchOver) return;

    const currentPhase = STORM_PHASES[this.currentPhaseIndex];
    if (!currentPhase) return;

    this.phaseTime += dt;
    const duration = currentPhase.duration * (getDifficulty()?.zoneTimeMult ?? 1.0);
    const progress = Math.min(1.0, this.phaseTime / duration);

    this.currentRadius = THREE.MathUtils.lerp(
      currentPhase.startRadius,
      currentPhase.endRadius,
      progress
    );

    // Update visuals with current state & player
    const player = actors.find((a) => a.isPlayer);
    this.visuals.update(dt, this, player);

    // Tick out-of-bounds damage (logic strictly unchanged)
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
    if (this.phaseTime >= duration) {
      if (this.currentPhaseIndex < STORM_PHASES.length - 1) {
        this.currentPhaseIndex++;
        this.phaseTime = 0;
      } else {
        this.isMatchOver = true;
      }
    }
  }

  isShrinking() {
    const currentPhase = STORM_PHASES[this.currentPhaseIndex];
    if (!currentPhase) return false;
    return currentPhase.endRadius < currentPhase.startRadius;
  }

  getTimeUntilNextShrink() {
    const currentPhase = STORM_PHASES[this.currentPhaseIndex];
    if (!currentPhase) return 0;
    if (currentPhase.endRadius < currentPhase.startRadius) {
      return 0; // Currently shrinking
    }
    const duration = currentPhase.duration * (getDifficulty()?.zoneTimeMult ?? 1.0);
    return Math.max(0, duration - this.phaseTime);
  }

  getSafeDistance(x, z) {
    const dist = Math.hypot(x - this.centerX, z - this.centerZ);
    return this.currentRadius - dist;
  }

  dispose() {
    if (this.visuals) this.visuals.dispose();
  }
}
