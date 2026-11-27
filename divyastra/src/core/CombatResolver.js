import * as THREE from 'three';
import { KILL_XP, KILL_GEM_DROP, BOT_DAMAGE_MULT, AOE_SPLASH_DAMAGE_MULT } from '../config/constants.js';
import { getDifficulty } from '../config/difficulty.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { SpellEffects } from '../systems/SpellEffects.js';
import { HitFeedback } from '../systems/HitFeedback.js';
import { projectileDeflect, destroyProjectilesInCircle } from '../systems/ProjectileDeflect.js';
import { damageObjectsInCircle } from './EnvironmentDamage.js';
import { resolveChain, spawnSubMunitions, resolveObeliskCollisions, executeMeleeHit } from './CombatChain.js';
import { applySpellHit, detonateAoE, applyStatuses } from './SpellOnHit.js';
import { SideEffectZones } from '../systems/SideEffectZones.js';
import { CastWindup } from './CastWindup.js';
import { prepareTipPayloads } from '../entities/StaffTip.js';

export class CombatResolver {
  constructor(deps) {
    Object.assign(this, deps);
    this.astraVisuals = deps.astraVisuals || null;
    this.arenaInteractables = deps.arenaInteractables || null;
    this.hitFeedback = new HitFeedback({ sceneManager: deps.sceneManager, player: deps.player });
    this.castWindup = new CastWindup(deps.player, deps.sceneManager.scene, deps.particleSys);
    this.spellEffects = deps.spellEffects || new SpellEffects(deps.sceneManager.scene, deps.particleSys, this.astraVisuals);
    this.spellEffects.resolver = this;
    this.sideEffectZones = new SideEffectZones(deps.sceneManager.scene, deps.particleSys);
    this.delayedStrikes = [];
    this.spellDashes = [];
    const tgGeo = new THREE.RingGeometry(5.0, 5.5, 32);
    tgGeo.rotateX(-Math.PI / 2);
    this.telegraphMesh = new THREE.Mesh(tgGeo, new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    this.telegraphMesh.position.y = 0.05;
    this.telegraphMesh.visible = false;
    this.sceneManager.scene.add(this.telegraphMesh);
    this.telegraphTimer = 0;
  }

  showTelegraph(x, z, radius = 5.5, duration = 0.4, spellId = null) {
    this.telegraphMesh.position.set(x, 0.05, z);
    this.telegraphMesh.scale.setScalar(radius / 5.5);
    this.telegraphMesh.visible = true;
    this.telegraphTimer = duration;
  }

  executeCastPayload(payload, owner) {
    const isP = owner === this.player, cfg = { ...payload };
    if (owner?.dmgBonus) cfg.damage += owner.dmgBonus;
    if (!isP && owner && !owner.isPlayer) cfg.damage = Math.round(cfg.damage * BOT_DAMAGE_MULT * (getDifficulty()?.botDamageMult ?? 1.0));
    if (isP && this.player.staffElement && cfg.elements?.includes(this.player.staffElement)) cfg.damage = Math.round(cfg.damage * 1.12);
    if (isP && this.spellbookManager) {
      const sm = this.spellbookManager.getDamageMultiplier(cfg.id);
      if (sm > 1.0) cfg.damage = Math.round(cfg.damage * sm);
    }
    if (isP && this.player.perks.includes('SNIPER_VELOCITY')) {
      cfg.speed = (cfg.speed || 28) * 1.35; cfg.range = (cfg.range || 24) * 1.35;
    }
    if (isP && this.player.perks.includes('GIANT_ARCANA')) {
      cfg.radius = (cfg.radius || (cfg.trajectory === 'RADIAL' ? 6.0 : 0.5)) * 1.4;
      if (cfg.aoeRadius) cfg.aoeRadius *= 1.4;
    }
    if (cfg.damageReduction && owner?.applyDamageReduction) owner.applyDamageReduction(cfg.damageTakenMult ?? 0.7, cfg.damageTakenDuration ?? 4.0);
    if (cfg.selfShield && owner?.applyShield) owner.applyShield(cfg.selfShield, cfg.selfShieldDuration || 4.0);
    const sx = cfg.originX ?? owner.x, sz = cfg.originZ ?? owner.z;

    if (cfg.trajectory === 'MELEE') return this.executeMelee(cfg, owner);
    if (cfg.trajectory === 'SELF_DASH') {
      const spd = cfg.speed || 42, rng = cfg.range || 14;
      owner.isInvulnerable = true; owner.spellDash = true;
      this.spellDashes.push({ owner, dirX: cfg.dirX, dirZ: cfg.dirZ, speed: spd, duration: rng / spd, elapsed: 0, config: cfg, hitTargets: new Set() });
      if (this.sound) this.sound.playDash();
      return;
    }
    if (cfg.trajectory === 'RADIAL') {
      if (cfg.sideEffect) this.sideEffectZones.spawnZone(sx, sz, cfg.sideEffect, owner, cfg.id, 1.5);
      return this.spellEffects.spawnRadial(sx, sz, cfg, owner);
    }
    if (cfg.trajectory === 'WAVE') return this.spellEffects.spawnWave(sx, sz, cfg.dirX, cfg.dirZ, cfg, owner);
    if (cfg.trajectory === 'INSTANT_STRIKE' || cfg.strikeDelay > 0) {
      const tx = cfg.targetX ?? (sx + (cfg.dirX || 0) * (cfg.range || 20)), tz = cfg.targetZ ?? (sz + (cfg.dirZ || 1) * (cfg.range || 20)), delay = cfg.strikeDelay || 0.45;
      this.showTelegraph(tx, tz, cfg.aoeRadius || 4.0, delay, cfg.id);
      this.delayedStrikes.push({ ...cfg, targetX: tx, targetZ: tz, timer: delay, owner });
      return;
    }
    if (isP && this.player.perks.includes('TWIN_CAST') && (cfg.trajectory === 'LINEAR' || cfg.trajectory === 'LOBBED')) {
      const px = -cfg.dirZ, pz = cfg.dirX, twinDmg = Math.max(1, Math.round(cfg.damage * 0.85));
      const baseX = cfg.tipX !== undefined ? cfg.tipX : sx + cfg.dirX * ((owner.radius || 1) + 0.35);
      const baseZ = cfg.tipZ !== undefined ? cfg.tipZ : sz + cfg.dirZ * ((owner.radius || 1) + 0.35);
      const baseY = cfg.tipY ?? 1.2;
      [-0.8, 0.8].forEach((off) => {
        const p = this.projectiles.find((proj) => !proj.active);
        if (!p) return;
        const pCfg = { ...cfg, damage: twinDmg };
        if (cfg.trajectory === 'LOBBED') {
          pCfg.targetX = (cfg.targetX ?? (sx + cfg.dirX * (cfg.range || 20))) + px * off;
          pCfg.targetZ = (cfg.targetZ ?? (sz + cfg.dirZ * (cfg.range || 20))) + pz * off;
        }
        p.spawn(baseX + px * off, baseZ + pz * off, cfg.dirX, cfg.dirZ, pCfg, owner, baseY);
      });
      return;
    }
    const p = this.projectiles.find((proj) => !proj.active);
    if (p) {
      const ox = cfg.tipX !== undefined ? cfg.tipX : sx + cfg.dirX * ((owner.radius || 1) + 0.35);
      const oz = cfg.tipZ !== undefined ? cfg.tipZ : sz + cfg.dirZ * ((owner.radius || 1) + 0.35);
      p.spawn(ox, oz, cfg.dirX, cfg.dirZ, cfg, owner, cfg.tipY ?? 1.2);
    }
  }

  executeMelee(cfg, owner) { executeMeleeHit(this, cfg, owner); }

  playerShoot(input) {
    if (this.player.isDead || !this.player.spellSlot?.canCast() || this.player.status?.stunTimer > 0) return;
    if (this.castWindup?.isWindingUp()) return;
    this.player.spellSlot.startCooldown();
    if (this.player.cooldownMult) this.player.spellSlot.cooldownTimer *= this.player.cooldownMult;
    this.player.shootCooldown = this.player.spellSlot.cooldownTimer;
    const lockedAimDir = { x: input?.aimDir?.x ?? 0, z: input?.aimDir?.z ?? 1 };
    const lockedDragRatio = input?.dragRatio || 1.0;
    const tapasBonus = this.player.consumeTapasBonus ? this.player.consumeTapasBonus() : 0;
    const lockedMultiplier = 1.0 + tapasBonus;
    const lockedSpell = this.player.currentSpell;
    const payloads = this.player.spellSlot.buildCastPayloads(this.player.x, this.player.z, lockedAimDir, lockedDragRatio, lockedMultiplier, lockedSpell);
    if (tapasBonus > 0) this.particleSys?.spawnBurst(this.player.x, 0.8, this.player.z, 0xfacc15, 16, 6, 1.2, 'EMBER');

    // 0.1s wind-up (0.25s for Tier 3 Astra) anticipation, leans back & staff glows, then snaps forward
    this.castWindup.start(payloads, lockedAimDir, lockedSpell, () => {
      this.player.faceYaw = Math.atan2(lockedAimDir.x, lockedAimDir.z);
      this.player.visualMesh.rotation.y = this.player.faceYaw;
      this.player.postCastTimer = 0.4;
      if (this.questManager && lockedSpell?.id !== 'fist') this.questManager.record('cast', 1);
      this.sound.playCast(lockedSpell?.id || lockedSpell);
      const freshPayloads = this.player.spellSlot.buildCastPayloads(this.player.x, this.player.z, lockedAimDir, lockedDragRatio, lockedMultiplier, lockedSpell);
      if (this.astraVisuals && freshPayloads[0]?.tier === 3) this.astraVisuals.spawnAstraRing(this.player.x, this.player.z);
      prepareTipPayloads(this.player, freshPayloads, lockedAimDir, this.castWindup, this.particleSys);
      freshPayloads.forEach((payload) => this.executeCastPayload(payload, this.player));
    });
  }

  botShoot(bot, aimX, aimZ) {
    if (bot.isDead || !bot.spellSlot || bot.status?.stunTimer > 0) return;
    bot.spellSlot.startCooldown(); bot.shootCooldown = bot.spellSlot.cooldownTimer;
    const lockedAimDir = { x: aimX, z: aimZ };
    const lockedSpell = bot.currentSpell;
    const tapasBonus = bot.consumeTapasBonus ? bot.consumeTapasBonus() : 0;
    const payloads = bot.spellSlot.buildCastPayloads(bot.x, bot.z, lockedAimDir, 1.0, 1.0 + tapasBonus, lockedSpell);
    bot.faceYaw = Math.atan2(lockedAimDir.x, lockedAimDir.z); bot.visualMesh.rotation.y = bot.faceYaw; bot.postCastTimer = 0.4;
    bot.triggerCastAnim?.(payloads[0]?.tier === 3);
    if (tapasBonus > 0) this.particleSys?.spawnBurst(bot.x, 0.8, bot.z, 0xfacc15, 16, 6, 1.2, 'EMBER');
    if (this.astraVisuals && payloads[0]?.tier === 3 && Math.hypot(bot.x - this.player.x, bot.z - this.player.z) <= 30) this.astraVisuals.spawnAstraRing(bot.x, bot.z);
    prepareTipPayloads(bot, payloads, lockedAimDir, this.castWindup, this.particleSys);
    payloads.forEach((payload) => this.executeCastPayload(payload, bot));
  }

  triggerCrystalExplosion(crystal, allActors, chests) {
    this.sound.playExplosion(); this.sceneManager.addTrauma(0.5);
    this.particleSys.spawnImpact(crystal.x, crystal.z, 0xff0055, 3.0, crystal.explosionRadius);
    [...allActors, ...chests.filter((c) => !c.isDead)].forEach((t) => { if (Math.hypot(t.x - crystal.x, t.z - crystal.z) <= crystal.explosionRadius) t.takeDamage(crystal.explosionDamage); });
  }

  spawnSubMunitions(x, z, cfg, owner) { spawnSubMunitions(this, x, z, cfg, owner); }
  applySpellHit(target, cfg, owner, hitX, hitZ, dirX = null, dirZ = null) { applySpellHit(this, target, cfg, owner, hitX, hitZ, dirX, dirZ); }
  detonateAoE(x, z, cfg, owner, directTarget = null, targets = [], hitObjects = null) { detonateAoE(this, x, z, cfg, owner, directTarget, targets, hitObjects); }
  applyStatuses(target, cfg) { applyStatuses(target, cfg, this.particleSys); }

  handleKill(killer, victim, sourceSpellId = null) {
    if (killer?.isPlayer) {
      this.sound.playKillSting();
      this.hitFeedback.triggerHitStop(true);
    } else {
      this.sound.playExplosion();
    }
    if (Math.hypot(victim.x - this.player.x, victim.z - this.player.z) <= 30) {
      this.particleSys.spawnBurst(victim.x, 0.8, victim.z, victim.hero?.bodyColor || 0xff0055, 14, 6, 1.2, victim.currentSpell?.elements || null);
    }
    this.spawnManager.dropLoot(victim.x, victim.z, KILL_GEM_DROP, 0.6);
    if (!killer) return;
    killer.kills = (killer.kills || 0) + 1;
    if (killer.isPlayer && this.questManager) this.questManager.record('kill', 1);
    if (killer.isPlayer && this.spellbookManager && sourceSpellId) this.spellbookManager.recordKill(sourceSpellId, this.meta);
    if (killer.addXP) killer.addXP(KILL_XP);
    const kName = killer.isPlayer ? 'Player' : (killer.name || 'Bot'), vName = victim.isPlayer ? 'Player' : (victim.name || 'Bot');
    this.killFeed.addKill(kName, vName, killer.isPlayer, victim.isPlayer);
    this.banners.onKill(kName, killer.isPlayer);
  }

  updateProjectiles(dt, allActors, chests, crystals, bots) {
    this.projectiles.forEach((p) => {
      if (!p.active) return;
      p.update(dt, allActors);
      if (p.active && p.spellConfig?.deflectsProjectiles) destroyProjectilesInCircle(p.x, p.z, p.radius, p.owner, p.spellConfig, this.projectiles, this.particleSys, this.sound);
      const tgts = (p.owner === this.player || !!p.owner?.isPlayer) ? bots : [this.player, ...bots.filter((b) => b !== p.owner)];
      if (!p.active && p.reachedMaxRange) {
        if (p.spellConfig?.sideEffect) this.sideEffectZones?.spawnZone(p.x, p.z, p.spellConfig.sideEffect, p.owner, p.spellConfig.id);
        if (p.lobHeight > 0 || p.spellConfig?.aoeRadius || p.spellConfig?.onImpactSpawn) return this.detonateAoE(p.x, p.z, p.spellConfig, p.owner, null, tgts);
      }
      if (!p.active) return;
      if (p.lobHeight <= 0 && this.arenaInteractables && this.arenaInteractables.reflectProjectile(p)) return;
      if (p.lobHeight <= 0 && this.sceneManager.obelisks.some((o) => CollisionSystem.checkCircle(p.x, p.z, p.radius, o.x, o.z, o.radius))) {
        this.particleSys.spawnImpact(p.x, p.z, 0x888899, 1.2); p.despawn(); return;
      }
      for (const c of chests) {
        if (!c.isDead && p.active && CollisionSystem.checkCircle(p.x, p.z, p.radius, c.x, c.z, c.radius)) {
          this.sound.playHit(); this.particleSys.spawnImpact(p.x, p.z, c.isMythic ? 0xf5b82e : 0x8b5a2b, 1.5);
          if (c.takeDamage(p.damage)) { this.sound.playExplosion(); this.spawnManager.dropLoot(c.x, c.z, c.isMythic ? 8 : 3, c.isMythic ? 1 : 0.35); }
          if (p.spellConfig?.sideEffect) this.sideEffectZones?.spawnZone(p.x, p.z, p.spellConfig.sideEffect, p.owner, p.spellConfig.id);
          if (p.spellConfig?.aoeRadius || p.spellConfig?.onImpactSpawn || p.spellConfig?.hazardZone) this.detonateAoE(p.x, p.z, p.spellConfig, p.owner, c, tgts);
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
          if (p.spellConfig?.sideEffect) this.sideEffectZones?.spawnZone(p.x, p.z, p.spellConfig.sideEffect, p.owner, p.spellConfig.id);
          if (p.spellConfig?.aoeRadius || p.spellConfig?.onImpactSpawn || p.spellConfig?.hazardZone) this.detonateAoE(p.x, p.z, p.spellConfig, p.owner, t, tgts);
          const chains = p.spellConfig?.chainTargets || (p.spellConfig?.id === 'ELECTRO' ? 2 : 0);
          if (chains > 0) this.resolveChain(t.x, t.z, p.spellConfig, p.owner, t, tgts);
          if (!p.spellConfig?.pierce) { p.despawn(); break; }
        }
      }
    });
  }

  update(dt, allActors, chests, crystals, bots) {
    if (this.castWindup) this.castWindup.update(dt);
    if (this.telegraphTimer > 0 && (this.telegraphTimer -= dt) <= 0) this.telegraphMesh.visible = false;
    for (let i = this.spellDashes.length - 1; i >= 0; i--) {
      const d = this.spellDashes[i];
      d.elapsed += dt; d.owner.x += d.dirX * d.speed * dt; d.owner.z += d.dirZ * d.speed * dt;
      this.particleSys.spawnBurst(d.owner.x, 0.4, d.owner.z, d.config.color || 0x854d0e, 2, 4, 1.0, d.config.elements);
      if (d.config?.deflectsProjectiles) destroyProjectilesInCircle(d.owner.x, d.owner.z, (d.owner.radius || 1.0) + 1.2, d.owner, d.config, this.projectiles, this.particleSys, this.sound);
      const tgts = d.owner?.isPlayer ? bots : [this.player, ...bots.filter((b) => b !== d.owner)];
      tgts.forEach((t) => { if (!t.isDead && !d.hitTargets.has(t) && CollisionSystem.checkCircle(d.owner.x, d.owner.z, d.owner.radius + 0.5, t.x, t.z, t.radius)) { d.hitTargets.add(t); this.applySpellHit(t, d.config, d.owner, d.owner.x, d.owner.z, d.dirX, d.dirZ); } });
      damageObjectsInCircle(this, d.owner.x, d.owner.z, (d.owner.radius || 1.0) + 0.5, d.config.damage, d.hitTargets);
      if (d.elapsed >= d.duration) { d.owner.isInvulnerable = false; d.owner.spellDash = false; this.spellDashes.splice(i, 1); }
    }
    for (let i = this.delayedStrikes.length - 1; i >= 0; i--) {
      const s = this.delayedStrikes[i];
      if ((s.timer -= dt) <= 0) {
        this.delayedStrikes.splice(i, 1);
        const tgts = s.owner?.isPlayer ? bots : [this.player, ...bots.filter((b) => b !== s.owner)];
        this.spellEffects.spawnLightningBeam(s.targetX, s.targetZ, s.color || 0xfef08a);
        if (s.deflectsProjectiles || s.config?.deflectsProjectiles) destroyProjectilesInCircle(s.targetX, s.targetZ, s.aoeRadius || 4.0, s.owner, s.config || s, this.projectiles, this.particleSys, this.sound);
        const strikeHit = new Set();
        damageObjectsInCircle(this, s.targetX, s.targetZ, s.aoeRadius || 4.0, s.damage, strikeHit);
        this.detonateAoE(s.targetX, s.targetZ, s.config || s, s.owner, null, tgts, strikeHit);
        if (s.chainTargets > 0) this.resolveChain(s.targetX, s.targetZ, s, s.owner, null, tgts);
      }
    }
    if (this.sideEffectZones) this.sideEffectZones.update(dt, allActors, this);
    this.spellEffects.update(dt, allActors, (target, cfg, owner, hx, hz, dx, dz) => this.applySpellHit(target, cfg, owner, hx, hz, dx, dz));
    projectileDeflect.update(dt, this.projectiles, this.particleSys, this.sound);
    this.updateProjectiles(dt, allActors, chests, crystals, bots);
  }

  resolveChain(originX, originZ, cfg, owner, directTarget, targets) { resolveChain(this, originX, originZ, cfg, owner, directTarget, targets); }
  resolveObeliskCollisions(actor) { resolveObeliskCollisions(this, actor); }
  reset() {
    this.telegraphMesh.visible = false; this.telegraphTimer = 0; this.delayedStrikes = [];
    this.spellDashes.forEach((d) => { if (d.owner) { d.owner.isInvulnerable = false; d.owner.spellDash = false; } }); this.spellDashes = [];
    if (this.castWindup) this.castWindup.cancel();
    if (this.sideEffectZones) this.sideEffectZones.reset();
    if (this.spellEffects) this.spellEffects.reset(); if (this.astraVisuals) this.astraVisuals.reset();
    projectileDeflect.reset();
  }
}
