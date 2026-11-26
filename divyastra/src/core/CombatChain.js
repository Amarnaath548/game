import { SEPARATION_FACTOR } from '../config/constants.js';

export function executeMeleeHit(resolver, cfg, owner) {
  if (owner.punchTimer !== undefined) owner.punchTimer = 0.15;
  resolver.particleSys.spawnBurst(owner.x + cfg.dirX * 1.1, 1.0, owner.z + cfg.dirZ * 1.1, 0xffaa44, 8, 4, 1.0, cfg.elements);
  if (resolver.sound) resolver.sound.playHit();
  const halfCos = Math.cos((cfg.arc || 1.75) / 2);
  const range = Math.max(cfg.range || 2.2, ((owner?.radius ?? 1.0) + 1.0) * SEPARATION_FACTOR + 0.6);
  const tgts = ((owner === resolver.player || !!owner?.isPlayer) ? resolver.spawnManager.bots : [resolver.player, ...resolver.spawnManager.bots]).filter((b) => b !== owner);
  const inCone = (t) => {
    const dx = t.x - owner.x, dz = t.z - owner.z, d = Math.hypot(dx, dz);
    return d <= range + (t.radius || 0.8) && (cfg.dirX * dx + cfg.dirZ * dz) / (d || 1) >= halfCos;
  };
  tgts.forEach((t) => { if (!t.isDead && inCone(t)) resolver.applySpellHit(t, cfg, owner, t.x, t.z, cfg.dirX, cfg.dirZ); });
  resolver.spawnManager.chests?.forEach((c) => { if (!c.isDead && inCone(c) && c.takeDamage(cfg.damage)) resolver.spawnManager.dropLoot(c.x, c.z, c.isMythic ? 8 : 3, c.isMythic ? 1.0 : 0.35); });
  resolver.spawnManager.crystals?.forEach((c) => { if (!c.isDead && inCone(c) && c.takeDamage(cfg.damage)) resolver.triggerCrystalExplosion(c, tgts, resolver.spawnManager.chests); });
}

export function resolveChain(resolver, originX, originZ, cfg, owner, directTarget, targets) {
  const chainTargets = cfg.chainTargets || 2, chainRange = cfg.chainRange || 6.0;
  let count = 0;
  for (const other of targets.filter((a) => a !== directTarget && !a.isDead && a !== owner)) {
    if (count >= chainTargets) break;
    if (Math.hypot(other.x - originX, other.z - originZ) <= chainRange) {
      resolver.applySpellHit(other, { ...cfg, damage: Math.round(cfg.damage * 0.5) }, owner, originX, originZ);
      count++;
    }
  }
}

export function spawnSubMunitions(resolver, x, z, cfg, owner) {
  const count = cfg.onImpactSpawn?.count || 5;
  for (let i = 0; i < count; i++) {
    const p = resolver.projectiles.find((proj) => !proj.active);
    if (!p) break;
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    p.spawn(x, z, Math.sin(angle), Math.cos(angle), {
      id: cfg.id || 'SUB_MUNITION', color: cfg.color || 0xf43f5e, damage: Math.round((cfg.damage || 50) * 0.45),
      speed: 18, range: 4.5 + Math.random() * 2.0, radius: 0.35, aoeRadius: 2.2, lobArcHeight: 1.8,
      burnDuration: 1.5, burnDps: 6, elements: cfg.elements
    }, owner);
  }
}

export function resolveObeliskCollisions(resolver, actor) {
  if (!resolver?.sceneManager?.obelisks || !actor) return;
  resolver.sceneManager.obelisks.forEach((o) => {
    const dx = actor.x - o.x, dz = actor.z - o.z, dist = Math.hypot(dx, dz), minDist = actor.radius + o.radius;
    if (dist < minDist && dist > 0.001) {
      actor.x = o.x + (dx / dist) * minDist;
      actor.z = o.z + (dz / dist) * minDist;
      if (actor.group) { actor.group.position.x = actor.x; actor.group.position.z = actor.z; }
    }
  });
}
