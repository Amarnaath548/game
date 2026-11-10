import { getSpell } from '../config/spellRegistry.js';

export class SpellSlotController {
  constructor(startSpellKey = 'F') {
    this.elements = [];
    this.currentSpell = getSpell(startSpellKey) || getSpell('F');
    this.cooldownTimer = 0;
  }

  addElement(element) {
    if (this.elements.length >= 3) return false;
    this.elements.push(element);
    const key = this.elements.slice().sort().join('_');
    const nextSpell = getSpell(key);
    // If a combo has no registry entry, keep the previous spell but still count the pick
    if (nextSpell) {
      this.currentSpell = nextSpell;
    }
    return true;
  }

  reset(startSpellKey = 'F') {
    this.elements = [];
    this.currentSpell = getSpell(startSpellKey) || getSpell('F');
    this.cooldownTimer = 0;
  }

  canCast() {
    return this.cooldownTimer <= 0;
  }

  startCooldown() {
    this.cooldownTimer = this.currentSpell?.cooldown || 0.65;
  }

  getCooldownProgress() {
    const cd = this.currentSpell?.cooldown || 1.0;
    return Math.max(0, Math.min(1.0, this.cooldownTimer / cd));
  }

  update(dt) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }
  }

  buildCastPayloads(originX, originZ, aimDir, dragRatio = 1.0) {
    const spell = this.currentSpell;
    if (!spell) return [];

    const clampedDrag = Math.max(0.2, Math.min(1.0, dragRatio));
    const dirX = aimDir?.x || 0;
    const dirZ = aimDir?.z || 1;
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / len;
    const nz = dirZ / len;

    // Pass every spell field through
    const basePayload = {
      ...spell,
      originX,
      originZ,
      dragRatio: clampedDrag,
      chainTargets: spell.chainTargets !== undefined ? spell.chainTargets : (spell.chainCount || 0),
      chainRange: spell.chainRange !== undefined ? spell.chainRange : (spell.chainRadius || 0),
      width: spell.width || 0,
      depth: spell.depth || 0,
      strikeDelay: spell.strikeDelay || 0,
      lifesteal: spell.lifesteal || 0,
      knockback: spell.knockback || 2.5,
      stunDuration: spell.stunDuration || 0,
      freezeDuration: spell.freezeDuration || 0,
      slowFactor: spell.slowFactor || 0,
      slowDuration: spell.slowDuration || 0,
      burnDuration: spell.burnDuration || 0,
      burnDps: spell.burnDps || 0,
      aoeRadius: spell.aoeRadius || 0,
      pierce: !!spell.pierce,
      hazardZone: spell.hazardZone || null,
      onImpactSpawn: spell.onImpactSpawn || null
    };

    if (spell.trajectory === 'SPREAD') {
      const count = spell.projectiles || 3;
      const totalSpread = spell.spreadAngle || 0.35;
      const baseAngle = Math.atan2(nx, nz);
      const payloads = [];

      for (let i = 0; i < count; i++) {
        const offset = count > 1 ? (i / (count - 1) - 0.5) * totalSpread : 0;
        const angle = baseAngle + offset;
        payloads.push({
          ...basePayload,
          dirX: Math.sin(angle),
          dirZ: Math.cos(angle)
        });
      }
      return payloads;
    }

    if (spell.trajectory === 'LOBBED') {
      const scaledRange = (spell.range || 20) * clampedDrag;
      return [{
        ...basePayload,
        dirX: nx,
        dirZ: nz,
        range: scaledRange,
        targetX: originX + nx * scaledRange,
        targetZ: originZ + nz * scaledRange
      }];
    }

    if (spell.trajectory === 'INSTANT_STRIKE') {
      const strikeDist = (spell.range || 20) * clampedDrag;
      return [{
        ...basePayload,
        dirX: nx,
        dirZ: nz,
        targetX: originX + nx * strikeDist,
        targetZ: originZ + nz * strikeDist
      }];
    }

    // LINEAR, RADIAL, WAVE, SELF_DASH
    return [{
      ...basePayload,
      dirX: nx,
      dirZ: nz
    }];
  }
}

