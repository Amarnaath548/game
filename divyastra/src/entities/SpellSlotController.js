import { getSpell, FIST_SPELL } from '../config/spellRegistry.js';
import { resolveSpell } from '../config/spellSchools.js';

export class SpellSlotController {
  constructor(startSpellKey = null) {
    this.picks = [];
    this.upgradeId = null;
    this.currentSpell = startSpellKey ? (getSpell(startSpellKey) || FIST_SPELL) : FIST_SPELL;
    this.cooldownTimer = 0;
  }

  get elements() {
    return this.picks;
  }

  set elements(val) {
    this.picks = Array.isArray(val) ? val : [];
  }

  get activeSpell() {
    return this.picks.length === 0 ? FIST_SPELL : this.currentSpell;
  }

  needsUpgradeChoice(element) {
    return this.picks.length === 1 && this.picks[0] === element;
  }

  addElement(element, upgradeId = null) {
    if (this.picks.length >= 3) return false;
    this.picks.push(element);
    if (upgradeId) {
      this.upgradeId = upgradeId;
    }
    const nextSpell = resolveSpell(this.picks, this.upgradeId);
    if (nextSpell) {
      this.currentSpell = nextSpell;
    }
    return true;
  }

  reset(startSpellKey = null) {
    this.picks = [];
    this.upgradeId = null;
    this.currentSpell = startSpellKey ? (getSpell(startSpellKey) || FIST_SPELL) : FIST_SPELL;
    this.cooldownTimer = 0;
  }

  canCast() {
    return this.cooldownTimer <= 0;
  }

  startCooldown() {
    const spell = this.activeSpell;
    this.cooldownTimer = spell?.cooldown || 0.55;
  }

  getCooldownProgress() {
    const cd = this.activeSpell?.cooldown || 1.0;
    return Math.max(0, Math.min(1.0, this.cooldownTimer / cd));
  }

  update(dt) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }
  }

  buildCastPayloads(originX, originZ, aimDir, dragRatio = 1.0, damageMultiplier = 1.0) {
    const spell = this.activeSpell;
    if (!spell) return [];

    const clampedDrag = Math.max(0.2, Math.min(1.0, dragRatio));
    const dirX = aimDir?.x || 0;
    const dirZ = aimDir?.z || 1;
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / len;
    const nz = dirZ / len;

    const basePayload = {
      ...spell,
      damage: Math.round(spell.damage * damageMultiplier),
      originX,
      originZ,
      dragRatio: clampedDrag,
      sideEffect: spell.sideEffect ? { ...spell.sideEffect } : null,
      mods: spell.mods ? { ...spell.mods } : {},
      arc: spell.arc || 1.75,
      chainTargets: spell.chainTargets !== undefined ? spell.chainTargets : (spell.chainCount || 0),
      chainRange: spell.chainRange !== undefined ? spell.chainRange : (spell.chainRadius || 0),
      width: spell.width || 0,
      depth: spell.depth || 0,
      strikeDelay: spell.strikeDelay || 0,
      lifesteal: spell.lifesteal || 0,
      knockback: spell.knockback || 1.5,
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

    if (spell.trajectory === 'MELEE') {
      return [{
        ...basePayload,
        dirX: nx,
        dirZ: nz,
        range: spell.range || 2.2,
        arc: spell.arc || 1.75
      }];
    }

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

    // Default: LINEAR, RADIAL, WAVE, SELF_DASH
    return [{
      ...basePayload,
      dirX: nx,
      dirZ: nz
    }];
  }
}
