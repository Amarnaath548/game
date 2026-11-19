import { AOE_SPLASH_DAMAGE_MULT } from '../config/constants.js';
import { damageObjectsInCircle } from './EnvironmentDamage.js';

export function applyStatuses(target, cfg, particleSys = null) {
  if (!target || target.isDead) return;
  if (cfg.stunDuration || cfg.freezeDuration) {
    const dur = cfg.stunDuration || cfg.freezeDuration;
    if (target.applyStun) target.applyStun(dur);
    else if (target.applyChill) target.applyChill(1.0, dur);
  } else if (cfg.slowFactor) {
    target.applyChill?.(cfg.slowFactor, cfg.slowDuration || 1.5);
  }
  if (cfg.burnDuration) {
    target.applyBurn?.(cfg.burnDps || 8, cfg.burnDuration);
    if (particleSys) particleSys.spawnBurst(target.x, 0.8, target.z, 0xff5500, 6, 3, 0.7, 'EMBER');
  }
  if (cfg.poison || cfg.id === 'VENOM') {
    target.applyPoison?.(cfg.dps || 10, cfg.duration || 3.5);
  }
}

export function applyBurnSpread(target, cfg, owner, allActors = [], particleSys = null) {
  if (!cfg.burnSpread || !cfg.burnRadius || !target) return;
  const radius = cfg.burnRadius;
  const dps = cfg.burnDps || 8;
  const duration = cfg.burnDuration || 3;
  for (const enemy of allActors) {
    if (enemy === target || enemy === owner || enemy.isDead) continue;
    if (Math.hypot(enemy.x - target.x, enemy.z - target.z) <= radius) {
      enemy.applyBurn?.(dps, duration);
      if (particleSys) particleSys.spawnBurst(enemy.x, 0.8, enemy.z, 0xff5500, 5, 3, 0.7, 'EMBER');
    }
  }
}

export function applySpellHit(resolver, target, cfg, owner, hitX, hitZ, dirX = null, dirZ = null) {
  let dmg = cfg.damage || 0;
  if (owner?.isPlayer && resolver.player?.perks?.includes('EXECUTIONER') && target.hp < target.maxHp * 0.4) {
    dmg = Math.round(dmg * 1.35);
  }
  const dealt = target.takeDamage(dmg);
  if (owner?.isPlayer && dealt > 0 && resolver.questManager) {
    resolver.questManager.record('damage', dealt);
  }
  let lifesteal = cfg.lifesteal || 0;
  if (owner?.isPlayer && resolver.player?.perks?.includes('VAMPIRIC_SOUL')) lifesteal += 0.20;
  if (lifesteal > 0 && dealt > 0 && owner?.heal) owner.heal(dealt * lifesteal);

  if (resolver.sound) resolver.sound.playHit();
  const kx = dirX !== null ? dirX : target.x - hitX;
  const kz = dirZ !== null ? dirZ : target.z - hitZ;
  const kb = cfg.knockback !== undefined ? cfg.knockback : 2.5;
  if (kb > 0) target.applyKnockback(kx, kz, kb);

  if (resolver.hitFeedback) resolver.hitFeedback.apply(target, dealt, owner, kx, kz);
  const tx = target.x !== undefined ? target.x : (hitX ?? 0);
  const tz = target.z !== undefined ? target.z : (hitZ ?? 0);
  if (resolver.damageNumbers) resolver.damageNumbers.spawn(tx, tz, dealt, cfg.color || 0xff5500);

  applyStatuses(target, cfg, resolver.particleSys);

  const actors = resolver.spawnManager ? [resolver.player, ...resolver.spawnManager.bots] : [];
  applyBurnSpread(target, cfg, owner, actors, resolver.particleSys);

  if (target.isDead) resolver.handleKill(owner, target, cfg.id);
}

export function detonateAoE(resolver, x, z, cfg, owner, directTarget = null, targets = [], hitObjects = null) {
  if (!cfg) return;
  const aoe = cfg.aoeRadius || 3.5;
  const sc = cfg.tier === 3 ? 1.4 : 1.0;
  if (resolver.sound) resolver.sound.playExplosion();
  if (resolver.particleSys) {
    resolver.particleSys.spawnImpact(x, z, cfg.color || 0xff5500, (cfg.radius || 0.5) * sc, aoe * sc, cfg.elements);
  }
  if (cfg.hazardZone && resolver.spellEffects) resolver.spellEffects.spawnHazardZone(x, z, cfg, owner);
  if (cfg.onImpactSpawn) resolver.spawnSubMunitions(x, z, cfg, owner);

  const splashDmg = Math.round((cfg.damage || 0) * AOE_SPLASH_DAMAGE_MULT);
  targets.forEach((o) => {
    if (o !== directTarget && !o.isDead && o !== owner && Math.hypot(o.x - x, o.z - z) <= aoe) {
      applySpellHit(resolver, o, { ...cfg, aoeRadius: undefined, damage: splashDmg }, owner, x, z);
    }
  });

  const hitSet = hitObjects || new Set();
  if (directTarget) hitSet.add(directTarget);
  if (splashDmg > 0) damageObjectsInCircle(resolver, x, z, aoe, splashDmg, hitSet);
}
