import * as THREE from 'three';
import { CollisionSystem } from '../systems/CollisionSystem.js';

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
    this.delayedStrikes = [];

    const telegraphGeo = new THREE.RingGeometry(5.0, 5.5, 32);
    telegraphGeo.rotateX(-Math.PI / 2);
    this.telegraphMesh = new THREE.Mesh(telegraphGeo, new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
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
    if (owner && owner.dmgBonus) config.damage += owner.dmgBonus;
    if (isPlayer && this.player.perks.includes('SNIPER_VELOCITY')) { config.speed = (config.speed || 28) * 1.35; config.range = (config.range || 24) * 1.35; }
    if (isPlayer && this.player.perks.includes('GIANT_ARCANA')) { config.radius = (config.radius || 0.5) * 1.4; if (config.aoeRadius) config.aoeRadius *= 1.4; }

    if (config.trajectory === 'INSTANT_STRIKE' || config.strikeDelay > 0) {
      const tx = config.targetX !== undefined ? config.targetX : (config.originX + (config.dirX || 0) * (config.range || 20));
      const tz = config.targetZ !== undefined ? config.targetZ : (config.originZ + (config.dirZ || 1) * (config.range || 20));
      const delay = config.strikeDelay || 0.45;
      this.showTelegraph(tx, tz, config.aoeRadius || 4.0, delay);
      this.delayedStrikes.push({ ...config, targetX: tx, targetZ: tz, timer: delay, owner });
      return;
    }

    const p = this.projectiles.find((proj) => !proj.active);
    if (!p) return;
    const spawnOffset = (owner.radius || 1.0) + 0.35;
    const sx = config.originX + config.dirX * spawnOffset;
    const sz = config.originZ + config.dirZ * spawnOffset;
    p.spawn(sx, sz, config.dirX, config.dirZ, config, owner);
  }

  playerShoot(input) {
    if (this.player.isDead) return;
    if (this.player.spellSlot) {
      if (!this.player.spellSlot.canCast()) return;
      this.player.spellSlot.startCooldown();
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
        const payload = { ...config, dirX: Math.sin(baseAngle + offset), dirZ: Math.cos(baseAngle + offset), originX, originZ };
        this.executeCastPayload(payload, owner);
      });
      return;
    }
    this.executeCastPayload({ ...config, dirX, dirZ, originX, originZ }, owner);
  }

  botShoot(bot, aimX, aimZ) {
    if (bot.isDead) return;
    this.spawnSpell(bot.x, bot.z, aimX, aimZ, bot.currentSpell, bot);
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
      if (dist < minDist && dist > 0.001) {
        actor.x = o.x + (dx / dist) * minDist;
        actor.z = o.z + (dz / dist) * minDist;
      }
    });
  }

  detonateAoE(x, z, cfg, owner, directTarget = null, targets = []) {
    const aoe = cfg.aoeRadius || 3.5;
    this.sound.playExplosion();
    this.particleSys.spawnImpact(x, z, cfg.color || 0xff5500, cfg.radius || 0.5, aoe);
    targets.forEach((other) => {
      if (other === directTarget || other.isDead || other === owner) return;
      if (Math.hypot(other.x - x, other.z - z) <= aoe) {
        const oDealt = other.takeDamage(Math.round(cfg.damage * 0.7));
        if (owner?.isPlayer && oDealt > 0 && this.questManager) this.questManager.record('damage', oDealt);
        if (cfg.lifesteal && oDealt > 0 && owner?.heal) owner.heal(oDealt * cfg.lifesteal);
        other.applyKnockback(other.x - x, other.z - z, cfg.knockback || 2.0);
        this.damageNumbers.spawn(other.x, other.z, oDealt, cfg.color || 0xff5500);
        this.applyStatuses(other, cfg);
        if (other.isDead) this.handleKill(owner, other);
      }
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

  handleKill(killer, victim) {
    this.sound.playExplosion();
    this.particleSys.spawnImpact(victim.x, victim.z, 0xff0055, 2.2);
    this.spawnManager.dropLoot(victim.x, victim.z, 5, 0.6);
    if (killer) {
      killer.kills = (killer.kills || 0) + 1;
      if (killer.isPlayer && this.questManager) this.questManager.record('kill', 1);
      if (killer.addXP) killer.addXP(60);
      const kName = killer.isPlayer ? 'Player' : (killer.name || 'Bot');
      const vName = victim.isPlayer ? 'Player' : (victim.name || 'Bot');
      this.killFeed.addKill(kName, vName, killer.isPlayer, victim.isPlayer);
      this.banners.onKill(kName, killer.isPlayer);
    }
  }

  update(dt, allActors, chests, crystals, bots) {
    if (this.telegraphTimer > 0 && (this.telegraphTimer -= dt) <= 0) this.telegraphMesh.visible = false;

    // Process delayed instant strikes
    for (let i = this.delayedStrikes.length - 1; i >= 0; i--) {
      const strike = this.delayedStrikes[i];
      strike.timer -= dt;
      if (strike.timer <= 0) {
        this.delayedStrikes.splice(i, 1);
        const tgts = strike.owner?.isPlayer ? bots : [this.player, ...bots.filter((b) => b !== strike.owner)];
        this.detonateAoE(strike.targetX, strike.targetZ, strike, strike.owner, null, tgts);
        if (strike.chainTargets > 0) this.resolveChain(strike.targetX, strike.targetZ, strike, strike.owner, null, tgts);
      }
    }

    this.projectiles.forEach((proj) => {
      if (!proj.active) return;
      proj.update(dt, allActors);
      const isPlayerProj = proj.owner === this.player || !!proj.owner?.isPlayer;
      const targets = isPlayerProj ? bots : [this.player, ...bots.filter((b) => b !== proj.owner)];

      if (!proj.active && proj.reachedMaxRange && (proj.lobHeight > 0 || proj.spellConfig?.aoeRadius)) {
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
          if (destroyed) {
            this.sound.playExplosion();
            this.spawnManager.dropLoot(chest.x, chest.z, chest.isMythic ? 8 : 3, chest.isMythic ? 1.0 : 0.35);
          }
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

          let dmg = proj.damage;
          if (isPlayerProj && this.player.perks.includes('EXECUTIONER') && target.hp < target.maxHp * 0.4) dmg = Math.round(dmg * 1.35);

          const dealt = target.takeDamage(dmg);
          if (isPlayerProj && dealt > 0 && this.questManager) this.questManager.record('damage', dealt);
          if (proj.spellConfig?.lifesteal && dealt > 0 && proj.owner?.heal) proj.owner.heal(dealt * proj.spellConfig.lifesteal);

          this.sound.playHit();
          target.applyKnockback(proj.vx, proj.vz, proj.spellConfig?.knockback || 2.5);
          this.damageNumbers.spawn(target.x, target.z, dealt, proj.spellConfig?.color || 0xff5500);
          this.sceneManager.addTrauma(proj.spellConfig?.aoeRadius || dealt >= 50 ? 0.35 : 0.12);
          this.particleSys.spawnImpact(proj.x, proj.z, proj.spellConfig?.color || 0xff5500, proj.radius, proj.spellConfig?.aoeRadius || 0);

          if (proj.spellConfig?.aoeRadius) this.detonateAoE(proj.x, proj.z, proj.spellConfig, proj.owner, target, targets);
          this.applyStatuses(target, proj.spellConfig);

          const chains = proj.spellConfig?.chainTargets || (proj.spellConfig?.id === 'ELECTRO' ? (proj.spellConfig?.chainCount || 2) : 0);
          if (chains > 0) this.resolveChain(target.x, target.z, proj.spellConfig, proj.owner, target, targets);

          if (target.isDead) this.handleKill(proj.owner, target);
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
        const cDealt = other.takeDamage(Math.round(cfg.damage * 0.5));
        if (owner?.isPlayer && cDealt > 0 && this.questManager) this.questManager.record('damage', cDealt);
        other.applyKnockback(other.x - originX, other.z - originZ, 1.5);
        this.damageNumbers.spawn(other.x, other.z, cDealt, 0xffe600);
        this.particleSys.spawnBurst(other.x, 1.2, other.z, 0xffe600, 8, 6);
        count++;
        if (other.isDead) this.handleKill(owner, other);
      }
    }
  }

  reset() {
    this.telegraphMesh.visible = false;
    this.telegraphTimer = 0;
    this.delayedStrikes = [];
  }
}
