export function damageChest(resolver, c, damage) {
  if (resolver.sound) resolver.sound.playHit?.();
  if (c.takeDamage(damage)) {
    if (resolver.sound) resolver.sound.playExplosion?.();
    resolver.spawnManager?.dropLoot(c.x, c.z, c.isMythic ? 8 : 3, c.isMythic ? 1 : 0.35);
  }
}

export function damageCrystal(resolver, cr, damage, chests) {
  if (resolver.sound) resolver.sound.playHit?.();
  if (cr.takeDamage(damage)) {
    const allActors = [resolver.player, ...(resolver.spawnManager?.bots || [])];
    resolver.triggerCrystalExplosion(cr, allActors, chests || resolver.spawnManager?.chests || []);
  }
}

export function damageObjectsInCircle(resolver, x, z, radius, damage, hitSet = null) {
  if (!resolver?.spawnManager || !damage || damage <= 0) return;
  const chests = resolver.spawnManager.chests || [];
  const crystals = resolver.spawnManager.crystals || [];

  for (const c of chests) {
    if (c.isDead || (hitSet && hitSet.has(c))) continue;
    if (Math.hypot(c.x - x, c.z - z) <= radius + (c.radius || 0.8)) {
      if (hitSet) hitSet.add(c);
      damageChest(resolver, c, damage);
    }
  }

  for (const cr of crystals) {
    if (cr.isDead || (hitSet && hitSet.has(cr))) continue;
    if (Math.hypot(cr.x - x, cr.z - z) <= radius + (cr.radius || 0.8)) {
      if (hitSet) hitSet.add(cr);
      damageCrystal(resolver, cr, damage, chests);
    }
  }
}

export function damageObjectsInWave(resolver, w) {
  if (!resolver?.spawnManager || !w.config?.damage || w.config.damage <= 0) return;
  const cos = Math.cos(-w.angle), sin = Math.sin(-w.angle);
  const halfW = w.width * 0.5, halfD = w.depth * 0.5;
  const chests = resolver.spawnManager.chests || [];
  const crystals = resolver.spawnManager.crystals || [];

  for (const c of chests) {
    if (c.isDead || (w.hitTargets && w.hitTargets.has(c))) continue;
    const dx = c.x - w.x, dz = c.z - w.z;
    const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    if (Math.abs(lx) <= halfW + (c.radius || 0.8) && Math.abs(lz) <= halfD + (c.radius || 0.8)) {
      if (w.hitTargets) w.hitTargets.add(c);
      damageChest(resolver, c, w.config.damage);
    }
  }

  for (const cr of crystals) {
    if (cr.isDead || (w.hitTargets && w.hitTargets.has(cr))) continue;
    const dx = cr.x - w.x, dz = cr.z - w.z;
    const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    if (Math.abs(lx) <= halfW + (cr.radius || 0.8) && Math.abs(lz) <= halfD + (cr.radius || 0.8)) {
      if (w.hitTargets) w.hitTargets.add(cr);
      damageCrystal(resolver, cr, w.config.damage, chests);
    }
  }
}
