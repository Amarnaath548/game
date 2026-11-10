import * as THREE from 'three';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { SpellEffects } from '../systems/SpellEffects.js';

export class CombatResolver {
  constructor(deps) {
    this.sceneManager = deps.sceneManager;
    this.sound = deps.sound;
    this.particleSys = deps.particleSys;
    this.damageNumbers = deps.damageNumbers;
    this.killFeed = deps.killFeed;
    this.banners = deps.banners;
    this.spawnManager = deps.spawnManager;
    this.player = deps.player;
    this.projectiles = deps.projectiles;
    this.questManager = deps.questManager;
    this.meta = deps.meta;
    this.spellbookManager = deps.spellbookManager;
    this.spellEffects = deps.spellEffects || new SpellEffects(this.sceneManager.scene, this.particleSys);
    this.delayedStrikes = [];
    this.spellDashes = [];

    const telegraphGeo = new THREE.RingGeometry(5.0, 5.5, 32);
    telegraphGeo.rotateX(-Math.PI / 2);
    this.telegraphMesh = new THREE.Mesh(telegraphGeo, new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    this.telegraphMesh.position.y = 0.05;
    this.telegraphMesh.visible = false;
    this.sceneManager.scene.add(this.telegraphMesh);
    this.telegraphTimer = 0;
  }

  showTelegraph(x, z, radius = 5.5, duration = 0.4) {
    this.telegraphMesh.position.set(x, 0.05, z);
    this.telegraphMesh.scale.setScalar(radius / 5.5);
    this.telegraphMesh.visible = true;
    this.telegraphTimer = duration;
  }

  executeCastPayload(payload, owner) {
    const isPlayer = owner === this.player;
    const config = { ...payload };
    if (owner?.dmgBonus) config.damage += owner.dmgBonus;
    if (isPlayer && this.player.staffElement && config.elements?.includes(this.player.staffElement)) {
      config.damage = Math.round(config.damage * 1.12);
    }
    if (isPlayer && this.spellbookManager) {
      const starMult = this.spellbookManager.getDamageMultiplier(config.id);
      if (starMult > 1.0) config.damage = Math.round(config.damage * starMult);
    }
    if (isPlayer && this.player.perks.includes('SNIPER_VELOCITY')) { config.speed = (config.speed || 28) * 1.35; config.range = (config.range || 24) * 1.35; }
    if (isPlayer && this.player.perks.includes('GIANT_ARCANA')) { config.radius = (config.radius || 0.5) * 1.4; if (config.aoeRadius) config.aoeRadius *= 1.4; }

    const sx = config.originX !== undefined ? config.originX : owner.x;
    const sz = config.originZ !== undefined ? config.originZ : owner.z;

    if (config.trajectory === 'SELF_DASH') {
      const spd = config.speed || 42, rng = config.range || 14;
      owner.isInvulnerable = true;
      this.spellDashes.push({ owner, dirX: config.dirX, dirZ: config.dirZ, speed: spd, duration: rng / spd, elapsed: 0, config, hitTargets: new Set() });
      if (this.sound) this.sound.playDash();
      return;
    }
    if (config.trajectory === 'RADIAL') { this.spellEffects.spawnRadial(sx, sz, config, owner); return; }
    if (config.trajectory === 'WAVE') { this.spellEffects.spawnWave(sx, sz, config.dirX, config.dirZ, config, owner); return; }
    if (config.trajectory === 'INSTANT_STRIKE' || config.strikeDelay > 0) {
      const tx = config.targetX !== undefined ? config.targetX : (sx + (config.dirX || 0) * (config.range || 20));
      const tz = config.targetZ !== undefined ? config.targetZ : (sz + (config.dirZ || 1) * (config.range || 20));
      const delay = config.strikeDelay || 0.45;
      this.showTelegraph(tx, tz, config.aoeRadius || 4.0, delay);
      this.delayedStrikes.push({ ...config, targetX: tx, targetZ: tz, timer: delay, owner });
      return;
    }

    const p = this.projectiles.find((proj) => !proj.active);
    if (!p) return;
    const spawnOffset = (owner.radius || 1.0) + 0.35;
    p.spawn(sx + config.dirX * spawnOffset, sz + config.dirZ * spawnOffset, config.dirX, config.dirZ, config, owner);
  }

  playerShoot(input) {
    if (this.player.isDead) return;
    if (this.player.spellSlot) {
      if (!this.player.spellSlot.canCast()) return;
      this.player.spellSlot.startCooldown();
      if (this.player.cooldownMult) this.player.spellSlot.cooldownTimer *= this.player.cooldownMult;
      this.player.shootCooldown = this.player.spellSlot.cooldownTimer;
      const payloads = this.player.spellSlot.buildCastPayloads(this.player.x, this.player.z, input.aimDir, input.dragRatio || 1.0);
      if (this.questManager) this.questManager.record('cast', 1);
      this.sound.playCast(this.player.currentSpell.id);
      payloads.forEach((payload) => this.executeCastPayload(payload, this.player));
    } else {
      if (this.player.shootCooldown > 0) return;
      this.player.shootCooldown = this.player.currentSpell.cooldown;
      this.spawnSpell(this.player.x, this.player.z, input.aimDir.x, input.aimDir.z, this.player.currentSpell, this.player);
    }
  }

  spawnSpell(originX, originZ, dirX, dirZ, spellConfig, owner) {
    const config = { ...spellConfig };
    if (config.id === 'SHIELD' || config.isSelfCast) {
      owner.applyShield(config.shieldAmount || 80, config.shieldDuration || 3.0);
      if (owner === this.player) this.sound.playCast('SHIELD');
      this.particleSys.spawnBurst(owner.x, 1.2, owner.z, config.color, 16, 6);
      return;
    }
    if (config.id === 'CRYO') {
      const spread = config.spreadAngle || 0.35, baseAngle = Math.atan2(dirX, dirZ);
      [-spread, 0, spread].forEach((offset) => {
        this.executeCastPayload({ ...config, dirX: Math.sin(baseAngle + offset), dirZ: Math.cos(baseAngle + offset), originX, originZ }, owner);
      });
      return;
    }
    this.executeCastPayload({ ...config, dirX, dirZ, originX, originZ }, owner);
  }

  botShoot(bot, aimX, aimZ) {
    if (bot.isDead) return;
    if (bot.spellSlot) {
      bot.spellSlot.startCooldown();
      bot.shootCooldown = bot.spellSlot.cooldownTimer;
      const payloads = bot.spellSlot.buildCastPayloads(bot.x, bot.z, { x: aimX, z: aimZ }, 1.0);
      payloads.forEach((payload) => this.executeCastPayload(payload, bot));
    } else {
      this.spawnSpell(bot.x, bot.z, aimX, aimZ, bot.currentSpell, bot);
    }
  }

  triggerCrystalExplosion(crystal, allActors, chests) {
    this.sound.playExplosion();
    this.sceneManager.addTrauma(0.5);
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
      const subConfig = { id: cfg.id || 'E_F_F', color: cfg.color || 0xf43f5e, damage: Math.round((cfg.damage || 50) * 0.45), speed: 18, range: 4.5 + Math.random() * 2.0, radius: 0.35, aoeRadius: 2.2, lobArcHeight: 1.8, burnDuration: 1.5, burnDps: 6 };
      p.spawn(x, z, Math.sin(angle), Math.cos(angle), subConfig, owner);
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
    this.damageNumbers.spawn(target.x, target.z, dealt, cfg.color || 0xff5500);
    this.applyStatuses(target, cfg);
    if (target.isDead) this.handleKill(owner, target, cfg.id);
  }

  detonateAoE(x, z, cfg, owner, directTarget = null, targets = []) {
    const aoe = cfg.aoeRadius || 3.5;
    this.sound.playExplosion();
    this.particleSys.spawnImpact(x, z, cfg.color || 0xff5500, cfg.radius || 0.5, aoe);
    if (cfg.hazardZone) this.spellEffects.spawnHazardZone(x, z, cfg, owner);
    if (cfg.onImpactSpawn) this.spawnSubMunitions(x, z, cfg, owner);
    targets.forEach((other) => {
      if (other === directTarget || other.isDead || other === owner) return;
      if (Math.hypot(other.x - x, other.z - z) <= aoe) this.applySpellHit(other, { ...cfg, damage: Math.round(cfg.damage * 0.7) }, owner, x, z);
    });
  }

  applyStatuses(target, cfg) {
    if (cfg.freezeDuration) target.applyChill(1.0, cfg.freezeDuration);
    else if (cfg.stunDuration) target.applyChill(1.0, cfg.stunDuration);
    else if (cfg.slowFactor) target.applyChill(cfg.slowFactor, cfg.slowDuration || 1.5);
    else if (cfg.id === 'CRYO') target.applyChill(cfg.slowFactor || 0.3, 1.5);

    if (cfg.burnDuration) target.applyBurn(cfg.burnDps || 8, cfg.burnDuration);
    else if (cfg.id === 'PYRO') target.applyBurn(10, 2.0);
    if (cfg.id === 'VENOM') target.applyPoison(cfg.dps || 8, cfg.duration || 4.0);
  }

  handleKill(killer, victim, sourceSpellId = null) {
    this.sound.playExplosion();
    this.particleSys.spawnImpact(victim.x, victim.z, 0xff0055, 2.2);
    this.spawnManager.dropLoot(victim.x, victim.z, 5, 0.6);
    if (killer) {
      killer.kills = (killer.kills || 0) + 1;
      if (killer.isPlayer && this.questManager) this.questManager.record('kill', 1);
      if (killer.isPlayer && this.spellbookManager && sourceSpellId) {
        this.spellbookManager.recordKill(sourceSpellId, this.meta);
      }
      if (killer.addXP) killer.addXP(60);
      const kName = killer.isPlayer ? 'Player' : (killer.name || 'Bot');
      const vName = victim.isPlayer ? 'Player' : (victim.name || 'Bot');
      this.killFeed.addKill(kName, vName, killer.isPlayer, victim.isPlayer);
      this.banners.onKill(kName, killer.isPlayer);
    }
  }

  update(dt, allActors, chests, crystals, bots) {
    if (this.telegraphTimer > 0 && (this.telegraphTimer -= dt) <= 0) this.telegraphMesh.visible = false;

    // Self Dash (Stone Ram)
    for (let i = this.spellDashes.length - 1; i >= 0; i--) {
      const d = this.spellDashes[i];
      d.elapsed += dt;
      d.owner.x += d.dirX * d.speed * dt;
      d.owner.z += d.dirZ * d.speed * dt;
      this.particleSys.spawnBurst(d.owner.x, 0.4, d.owner.z, d.config.color || 0x854d0e, 2, 4);
      const targets = d.owner?.isPlayer ? bots : [this.player, ...bots.filter((b) => b !== d.owner)];
      targets.forEach((t) => {
        if (!t.isDead && !d.hitTargets.has(t) && CollisionSystem.checkCircle(d.owner.x, d.owner.z, d.owner.radius + 0.5, t.x, t.z, t.radius)) {
          d.hitTargets.add(t);
          this.applySpellHit(t, d.config, d.owner, d.owner.x, d.owner.z, d.dirX, d.dirZ);
        }
      });
      if (d.elapsed >= d.duration) { d.owner.isInvulnerable = false; this.spellDashes.splice(i, 1); }
    }

    // Delayed Instant Strikes (Thunderbolt)
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

    // SpellEffects (Radials, Waves, Hazards)
    this.spellEffects.update(dt, allActors, (target, cfg, owner, hx, hz, dx, dz) => {
      this.applySpellHit(target, cfg, owner, hx, hz, dx, dz);
    });

    this.projectiles.forEach((proj) => {
      if (!proj.active) return;
      proj.update(dt, allActors);
      const isPlayerProj = proj.owner === this.player || !!proj.owner?.isPlayer;
      const targets = isPlayerProj ? bots : [this.player, ...bots.filter((b) => b !== proj.owner)];

      if (!proj.active && proj.reachedMaxRange && (proj.lobHeight > 0 || proj.spellConfig?.aoeRadius || proj.spellConfig?.onImpactSpawn)) {
        this.detonateAoE(proj.x, proj.z, proj.spellConfig, proj.owner, null, targets);
        return;
      }
      if (!proj.active) return;

      if (proj.lobHeight <= 0) {
        for (const o of this.sceneManager.obelisks) {
          if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, o.x, o.z, o.radius)) {
            this.particleSys.spawnImpact(proj.x, proj.z, 0x888899, 1.2);
            proj.despawn();
            return;
          }
        }
      }

      chests.forEach((chest) => {
        if (chest.isDead || !proj.active) return;
        if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, chest.x, chest.z, chest.radius)) {
          const destroyed = chest.takeDamage(proj.damage);
          this.sound.playHit();
          this.particleSys.spawnImpact(proj.x, proj.z, chest.isMythic ? 0x9333ea : 0x8b5a2b, 1.5);
          proj.despawn();
          if (destroyed) { this.sound.playExplosion(); this.spawnManager.dropLoot(chest.x, chest.z, chest.isMythic ? 8 : 3, chest.isMythic ? 1.0 : 0.35); }
        }
      });
      if (!proj.active) return;

      crystals.forEach((c) => {
        if (c.isDead || !proj.active) return;
        if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, c.x, c.z, c.radius)) {
          const exploded = c.takeDamage(proj.damage);
          this.sound.playHit();
          proj.despawn();
          if (exploded) this.triggerCrystalExplosion(c, allActors, chests);
        }
      });
      if (!proj.active) return;

      for (const target of targets) {
        if (target.isDead) continue;
        if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, target.x, target.z, target.radius)) {
          if (proj.hitTargets && proj.hitTargets.has(target)) continue;
          if (proj.hitTargets) proj.hitTargets.add(target);

          this.applySpellHit(target, proj.spellConfig, proj.owner, proj.x, proj.z, proj.vx, proj.vz);
          if (proj.spellConfig?.aoeRadius || proj.spellConfig?.onImpactSpawn || proj.spellConfig?.hazardZone) {
            this.detonateAoE(proj.x, proj.z, proj.spellConfig, proj.owner, target, targets);
          }

          const chains = proj.spellConfig?.chainTargets || (proj.spellConfig?.id === 'ELECTRO' ? (proj.spellConfig?.chainCount || 2) : 0);
          if (chains > 0) this.resolveChain(target.x, target.z, proj.spellConfig, proj.owner, target, targets);

          if (!proj.spellConfig?.pierce) { proj.despawn(); break; }
        }
      }
    });
  }

  resolveChain(originX, originZ, cfg, owner, directTarget, targets) {
    const chainTargets = cfg.chainTargets || cfg.chainCount || 2;
    const chainRange = cfg.chainRange || cfg.chainRadius || 6.0;
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
    this.telegraphMesh.visible = false;
    this.telegraphTimer = 0;
    this.delayedStrikes = [];
    this.spellDashes = [];
    if (this.spellEffects) this.spellEffects.reset();
  }
}
