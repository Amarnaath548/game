import * as THREE from 'three';

export class CombatResolver {
  constructor(deps) {
    Object.assign(this, deps);
    this.astraVisuals = deps.astraVisuals || null;
    this.spellEffects = deps.spellEffects || new SpellEffects(deps.sceneManager.scene, deps.particleSys, this.astraVisuals);
    this.delayedStrikes = [];
    this.spellDashes = [];
    const tgGeo = new THREE.RingGeometry(5.0, 5.5, 32);
    tgGeo.rotateX(-Math.PI / 2);
    this.telegraphMesh = new THREE.Mesh(tgGeo, new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    this.telegraphMesh.position.y = 0.05; this.telegraphMesh.visible = false;
    this.sceneManager.scene.add(this.telegraphMesh);
    this.telegraphTimer = 0;
  }

  showTelegraph(x, z, radius = 5.5, duration = 0.4, spellId = null) {
    if (spellId === 'F_W_W' && this.astraVisuals) {
      return this.astraVisuals.spawnVajraTelegraph(x, z, radius, duration);
    }
    this.telegraphMesh.position.set(x, 0.05, z);
    this.telegraphMesh.scale.setScalar(radius / 5.5);
    this.telegraphMesh.visible = true; this.telegraphTimer = duration;
  }

  executeCastPayload(payload, owner) {
    const isP = owner === this.player, cfg = { ...payload };
    if (owner?.dmgBonus) cfg.damage += owner.dmgBonus;
    if (isP && this.player.staffElement && cfg.elements?.includes(this.player.staffElement)) cfg.damage = Math.round(cfg.damage * 1.12);
    if (isP && this.spellbookManager) {
      const sm = this.spellbookManager.getDamageMultiplier(cfg.id);
      if (sm > 1.0) cfg.damage = Math.round(cfg.damage * sm);
    }
    if (isP && this.player.perks.includes('SNIPER_VELOCITY')) { cfg.speed = (cfg.speed || 28) * 1.35; cfg.range = (cfg.range || 24) * 1.35; }
    if (isP && this.player.perks.includes('GIANT_ARCANA')) { cfg.radius = (cfg.radius || 0.5) * 1.4; if (cfg.aoeRadius) cfg.aoeRadius *= 1.4; }
    const sx = cfg.originX ?? owner.x, sz = cfg.originZ ?? owner.z;
    if (cfg.tier === 3 && this.astraVisuals) this.astraVisuals.spawnAstraRing(owner.x, owner.z);

    if (cfg.trajectory === 'MELEE') return this.executeMelee(cfg, owner);
    if (cfg.trajectory === 'SELF_DASH') {
      const spd = cfg.speed || 42, rng = cfg.range || 14;
      owner.isInvulnerable = true;
      this.spellDashes.push({ owner, dirX: cfg.dirX, dirZ: cfg.dirZ, speed: spd, duration: rng / spd, elapsed: 0, config: cfg, hitTargets: new Set() });
      if (this.sound) this.sound.playDash();
      return;
    }
    if (cfg.trajectory === 'RADIAL') return this.spellEffects.spawnRadial(sx, sz, cfg, owner);
    if (cfg.trajectory === 'WAVE') return this.spellEffects.spawnWave(sx, sz, cfg.dirX, cfg.dirZ, cfg, owner);
    if (cfg.trajectory === 'INSTANT_STRIKE' || cfg.strikeDelay > 0) {
      const tx = cfg.targetX ?? (sx + (cfg.dirX || 0) * (cfg.range || 20)), tz = cfg.targetZ ?? (sz + (cfg.dirZ || 1) * (cfg.range || 20));
      const delay = cfg.strikeDelay || 0.45;
      this.showTelegraph(tx, tz, cfg.aoeRadius || 4.0, delay, cfg.id);
      this.delayedStrikes.push({ ...cfg, targetX: tx, targetZ: tz, timer: delay, owner });
      return;
    }
    const p = this.projectiles.find((proj) => !proj.active);
    if (p) p.spawn(sx + cfg.dirX * ((owner.radius || 1) + 0.35), sz + cfg.dirZ * ((owner.radius || 1) + 0.35), cfg.dirX, cfg.dirZ, cfg, owner);
  }

  executeMelee(cfg, owner) {
    if (owner.punchTimer !== undefined) owner.punchTimer = 0.15;
    this.particleSys.spawnBurst(owner.x + cfg.dirX * 1.1, 1.0, owner.z + cfg.dirZ * 1.1, 0xffaa44, 8, 4);
    if (this.sound) this.sound.playHit();
    const halfCos = Math.cos((cfg.arc || 1.75) / 2), range = cfg.range || 2.2;
    const tgts = ((owner === this.player || !!owner?.isPlayer) ? this.spawnManager.bots : [this.player, ...this.spawnManager.bots]).filter((b) => b !== owner);
    const inCone = (t) => {
      const dx = t.x - owner.x, dz = t.z - owner.z, d = Math.hypot(dx, dz);
      return d <= range + (t.radius || 0.8) && (cfg.dirX * dx + cfg.dirZ * dz) / (d || 1) >= halfCos;
    };
    tgts.forEach((t) => { if (!t.isDead && inCone(t)) this.applySpellHit(t, cfg, owner, t.x, t.z, cfg.dirX, cfg.dirZ); });
    this.spawnManager.chests?.forEach((c) => { if (!c.isDead && inCone(c) && c.takeDamage(cfg.damage)) this.spawnManager.dropLoot(c.x, c.z, c.isMythic ? 8 : 3, c.isMythic ? 1.0 : 0.35); });
    this.spawnManager.crystals?.forEach((c) => { if (!c.isDead && inCone(c) && c.takeDamage(cfg.damage)) this.triggerCrystalExplosion(c, tgts, this.spawnManager.chests); });
  }

  playerShoot(input) {
    if (this.player.isDead || !this.player.spellSlot?.canCast()) return;
    this.player.spellSlot.startCooldown();
    if (this.player.cooldownMult) this.player.spellSlot.cooldownTimer *= this.player.cooldownMult;
    this.player.shootCooldown = this.player.spellSlot.cooldownTimer;
    const tapasBonus = this.player.consumeTapasBonus ? this.player.consumeTapasBonus() : 0;
    const dmgMult = 1.0 + tapasBonus;
    const payloads = this.player.spellSlot.buildCastPayloads(this.player.x, this.player.z, input.aimDir, input.dragRatio || 1.0, dmgMult);
    if (tapasBonus > 0) {
      this.particleSys?.spawnBurst(this.player.x, 0.8, this.player.z, 0xfacc15, 16, 6, 1.2, 'EMBER');
    }
    if (this.questManager && this.player.currentSpell?.id !== 'fist') this.questManager.record('cast', 1);
    this.sound.playCast(this.player.currentSpell.id);
    payloads.forEach((payload) => this.executeCastPayload(payload, this.player));
  }

  botShoot(bot, aimX, aimZ) {
    if (bot.isDead || !bot.spellSlot) return;
    bot.spellSlot.startCooldown();
    bot.shootCooldown = bot.spellSlot.cooldownTimer;
    const payloads = bot.spellSlot.buildCastPayloads(bot.x, bot.z, { x: aimX, z: aimZ }, 1.0);
    payloads.forEach((payload) => this.executeCastPayload(payload, bot));
  }

  triggerCrystalExplosion(crystal, allActors, chests) {
    this.sound.playExplosion(); this.sceneManager.addTrauma(0.5);
    this.particleSys.spawnImpact(crystal.x, crystal.z, 0xff0055, 3.0, crystal.explosionRadius);
    [...allActors, ...chests.filter((c) => !c.isDead)].forEach((t) => {
      if (Math.hypot(t.x - crystal.x, t.z - crystal.z) <= crystal.explosionRadius) t.takeDamage(crystal.explosionDamage);
    });
  }

  resolveObeliskCollisions(actor) {
    this.sceneManager.obelisks.forEach((o) => {
      const dx = actor.x - o.x, dz = actor.z - o.z, dist = Math.hypot(dx, dz), minDist = actor.radius + o.radius;
      if (dist < minDist && dist > 0.001) { actor.x = o.x + (dx / dist) * minDist; actor.z = o.z + (dz / dist) * minDist; }
    });
  }

  spawnSubMunitions(x, z, cfg, owner) {
    const count = cfg.onImpactSpawn?.count || 5;
    for (let i = 0; i < count; i++) {
      const p = this.projectiles.find((proj) => !proj.active);
      if (!p) break;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      p.spawn(x, z, Math.sin(angle), Math.cos(angle), { id: cfg.id || 'E_F_F', color: cfg.color || 0xf43f5e, damage: Math.round((cfg.damage || 50) * 0.45), speed: 18, range: 4.5 + Math.random() * 2.0, radius: 0.35, aoeRadius: 2.2, lobArcHeight: 1.8, burnDuration: 1.5, burnDps: 6 }, owner);
    }
  }

  applySpellHit(target, cfg, owner, hitX, hitZ, dirX = null, dirZ = null) {
    let dmg = cfg.damage;
    if (owner?.isPlayer && this.player.perks.includes('EXECUTIONER') && target.hp < target.maxHp * 0.4) dmg = Math.round(dmg * 1.35);
    const dealt = target.takeDamage(dmg);
    if (owner?.isPlayer && dealt > 0 && this.questManager) this.questManager.record('damage', dealt);
    if (cfg.lifesteal && dealt > 0 && owner?.heal) owner.heal(dealt * cfg.lifesteal);
    this.sound.playHit();
    const kx = dirX !== null ? dirX : target.x - hitX, kz = dirZ !== null ? dirZ : target.z - hitZ;
    target.applyKnockback(kx, kz, cfg.knockback || 2.5);
    const tx = (target && target.x !== undefined) ? target.x : (hitX ?? 0), tz = (target && target.z !== undefined) ? target.z : (hitZ ?? 0);
    this.damageNumbers.spawn(tx, tz, dealt, cfg.color || 0xff5500);
    this.applyStatuses(target, cfg);
    if (target.isDead) this.handleKill(owner, target, cfg.id);
  }

  detonateAoE(x, z, cfg, owner, directTarget = null, targets = []) {
    const aoe = cfg.aoeRadius || 3.5;
    this.sound.playExplosion();
    const sc = cfg.tier === 3 ? 1.4 : 1.0;
    this.particleSys.spawnImpact(x, z, cfg.color || 0xff5500, (cfg.radius || 0.5) * sc, aoe * sc);
    if (cfg.hazardZone) this.spellEffects.spawnHazardZone(x, z, cfg, owner);
    if (cfg.onImpactSpawn) this.spawnSubMunitions(x, z, cfg, owner);
    targets.forEach((o) => {
      if (o !== directTarget && !o.isDead && o !== owner && Math.hypot(o.x - x, o.z - z) <= aoe) {
        this.applySpellHit(o, { ...cfg, damage: Math.round(cfg.damage * 0.7) }, owner, x, z);
      }
    });
  }

  applyStatuses(target, cfg) {
    if (cfg.freezeDuration || cfg.stunDuration) target.applyChill(1.0, cfg.freezeDuration || cfg.stunDuration);
    else if (cfg.slowFactor) target.applyChill(cfg.slowFactor, cfg.slowDuration || 1.5);
    if (cfg.burnDuration) target.applyBurn(cfg.burnDps || 8, cfg.burnDuration);
    if (cfg.id === 'VENOM' || cfg.id === 'F_W' || cfg.poison) target.applyPoison(cfg.dps || 10, cfg.duration || 3.5);
  }

  handleKill(killer, victim, sourceSpellId = null) {
    this.sound.playExplosion();
    this.particleSys.spawnImpact(victim.x, victim.z, 0xff0055, 2.2);
    this.spawnManager.dropLoot(victim.x, victim.z, 5, 0.6);
    if (!killer) return;
    killer.kills = (killer.kills || 0) + 1;
    if (killer.isPlayer && this.questManager) this.questManager.record('kill', 1);
    if (killer.isPlayer && this.spellbookManager && sourceSpellId) this.spellbookManager.recordKill(sourceSpellId, this.meta);
    if (killer.addXP) killer.addXP(60);
    const kName = killer.isPlayer ? 'Player' : (killer.name || 'Bot'), vName = victim.isPlayer ? 'Player' : (victim.name || 'Bot');
    this.killFeed.addKill(kName, vName, killer.isPlayer, victim.isPlayer);
    this.banners.onKill(kName, killer.isPlayer);
  }

  updateProjectiles(dt, allActors, chests, crystals, bots) {
    this.projectiles.forEach((p) => {
      if (!p.active) return;
      p.update(dt, allActors);
      const tgts = (p.owner === this.player || !!p.owner?.isPlayer) ? bots : [this.player, ...bots.filter((b) => b !== p.owner)];
      if (!p.active && p.reachedMaxRange && (p.lobHeight > 0 || p.spellConfig?.aoeRadius || p.spellConfig?.onImpactSpawn)) {
        return this.detonateAoE(p.x, p.z, p.spellConfig, p.owner, null, tgts);
      }
      if (!p.active) return;
      if (p.lobHeight <= 0 && this.sceneManager.obelisks.some((o) => CollisionSystem.checkCircle(p.x, p.z, p.radius, o.x, o.z, o.radius))) {
        this.particleSys.spawnImpact(p.x, p.z, 0x888899, 1.2); p.despawn(); return;
      }
      for (const c of chests) {
        if (!c.isDead && p.active && CollisionSystem.checkCircle(p.x, p.z, p.radius, c.x, c.z, c.radius)) {
          this.sound.playHit(); this.particleSys.spawnImpact(p.x, p.z, c.isMythic ? 0x9333ea : 0x8b5a2b, 1.5);
          if (c.takeDamage(p.damage)) { this.sound.playExplosion(); this.spawnManager.dropLoot(c.x, c.z, c.isMythic ? 8 : 3, c.isMythic ? 1 : 0.35); }
          p.despawn();
        }
      }
      for (const cr of crystals) {
        if (!cr.isDead && p.active && CollisionSystem.checkCircle(p.x, p.z, p.radius, cr.x, cr.z, cr.radius)) {
          this.sound.playHit(); p.despawn(); if (cr.takeDamage(p.damage)) this.triggerCrystalExplosion(cr, allActors, chests);
        }
      }
      for (const t of tgts) {
        if (!t.isDead && p.active && CollisionSystem.checkCircle(p.x, p.z, p.radius, t.x, t.z, t.radius)) {
          if (p.hitTargets?.has(t)) continue;
          p.hitTargets?.add(t);
          this.applySpellHit(t, p.spellConfig, p.owner, p.x, p.z, p.vx, p.vz);
          if (p.spellConfig?.aoeRadius || p.spellConfig?.onImpactSpawn || p.spellConfig?.hazardZone) this.detonateAoE(p.x, p.z, p.spellConfig, p.owner, t, tgts);
          const chains = p.spellConfig?.chainTargets || (p.spellConfig?.id === 'ELECTRO' ? 2 : 0);
          if (chains > 0) this.resolveChain(t.x, t.z, p.spellConfig, p.owner, t, tgts);
          if (!p.spellConfig?.pierce) { p.despawn(); break; }
        }
      }
    });
  }

  update(dt, allActors, chests, crystals, bots) {
    if (this.telegraphTimer > 0 && (this.telegraphTimer -= dt) <= 0) this.telegraphMesh.visible = false;
    for (let i = this.spellDashes.length - 1; i >= 0; i--) {
      const d = this.spellDashes[i];
      d.elapsed += dt; d.owner.x += d.dirX * d.speed * dt; d.owner.z += d.dirZ * d.speed * dt;
      this.particleSys.spawnBurst(d.owner.x, 0.4, d.owner.z, d.config.color || 0x854d0e, 2, 4);
      const tgts = d.owner?.isPlayer ? bots : [this.player, ...bots.filter((b) => b !== d.owner)];
      tgts.forEach((t) => {
        if (!t.isDead && !d.hitTargets.has(t) && CollisionSystem.checkCircle(d.owner.x, d.owner.z, d.owner.radius + 0.5, t.x, t.z, t.radius)) {
          d.hitTargets.add(t); this.applySpellHit(t, d.config, d.owner, d.owner.x, d.owner.z, d.dirX, d.dirZ);
        }
      });
      if (d.elapsed >= d.duration) { d.owner.isInvulnerable = false; this.spellDashes.splice(i, 1); }
    }
    for (let i = this.delayedStrikes.length - 1; i >= 0; i--) {
      const s = this.delayedStrikes[i];
      if ((s.timer -= dt) <= 0) {
        this.delayedStrikes.splice(i, 1);
        const tgts = s.owner?.isPlayer ? bots : [this.player, ...bots.filter((b) => b !== s.owner)];
        this.spellEffects.spawnLightningBeam(s.targetX, s.targetZ, s.color || 0xfef08a);
        this.detonateAoE(s.targetX, s.targetZ, s.config || s, s.owner, null, tgts);
        if (s.chainTargets > 0) this.resolveChain(s.targetX, s.targetZ, s, s.owner, null, tgts);
      }
    }
    this.spellEffects.update(dt, allActors, (target, cfg, owner, hx, hz, dx, dz) => this.applySpellHit(target, cfg, owner, hx, hz, dx, dz));
    this.updateProjectiles(dt, allActors, chests, crystals, bots);
  }

  resolveChain(originX, originZ, cfg, owner, directTarget, targets) {
    const chainTargets = cfg.chainTargets || 2, chainRange = cfg.chainRange || 6.0;
    const others = targets.filter((a) => a !== directTarget && !a.isDead && a !== owner);
    let count = 0;
    for (const other of others) {
      if (count >= chainTargets) break;
      if (Math.hypot(other.x - originX, other.z - originZ) <= chainRange) {
        this.applySpellHit(other, { ...cfg, damage: Math.round(cfg.damage * 0.5) }, owner, originX, originZ);
        count++;
      }
    }
  }

  reset() {
    this.telegraphMesh.visible = false; this.telegraphTimer = 0; this.delayedStrikes = []; this.spellDashes = [];
    if (this.spellEffects) this.spellEffects.reset();
    if (this.astraVisuals) this.astraVisuals.reset();
  }
}
