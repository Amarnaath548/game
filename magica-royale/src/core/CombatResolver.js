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

    // Blast Ground Telegraph Ring
    const telegraphGeo = new THREE.RingGeometry(5.0, 5.5, 32);
    telegraphGeo.rotateX(-Math.PI / 2);
    const telegraphMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.telegraphMesh = new THREE.Mesh(telegraphGeo, telegraphMat);
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

  spawnSpell(originX, originZ, dirX, dirZ, spellConfig, owner) {
    const isPlayer = owner === this.player;
    const config = { ...spellConfig };
    if (owner && owner.dmgBonus) config.damage += owner.dmgBonus;

    if (config.id === 'SHIELD' || config.isSelfCast) {
      owner.applyShield(config.shieldAmount || 80, config.shieldDuration || 3.0);
      if (isPlayer) this.sound.playCast('SHIELD');
      this.particleSys.spawnBurst(owner.x, 1.2, owner.z, config.color, 16, 6);
      return;
    }

    if (isPlayer && this.player.perks.includes('SNIPER_VELOCITY')) {
      config.speed *= 1.35;
      config.range *= 1.35;
    }
    if (isPlayer && this.player.perks.includes('GIANT_ARCANA')) {
      config.radius *= 1.4;
      if (config.aoeRadius) config.aoeRadius *= 1.4;
    }

    if (config.id === 'BLAST') {
      const tx = originX + dirX * config.range;
      const tz = originZ + dirZ * config.range;
      this.showTelegraph(tx, tz, config.aoeRadius || 5.5, config.telegraph || 0.4);
    }

    if (isPlayer) this.sound.playCast(config.id);

    const spawnOffset = (owner.radius || 1.0) + 0.35;
    const sx = originX + dirX * spawnOffset;
    const sz = originZ + dirZ * spawnOffset;

    if (config.id === 'CRYO') {
      const spread = config.spreadAngle || 0.35;
      const angles = [-spread, 0, spread];
      const baseAngle = Math.atan2(dirX, dirZ);
      angles.forEach((offset) => {
        const p = this.projectiles.find((proj) => !proj.active);
        if (p) {
          const a = baseAngle + offset;
          p.spawn(sx, sz, Math.sin(a), Math.cos(a), config, owner);
        }
      });
      return;
    }

    const count = (isPlayer && this.player.perks.includes('TWIN_CAST')) ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const p = this.projectiles.find((proj) => !proj.active);
      if (p) {
        let dx = dirX;
        let dz = dirZ;
        if (count > 1) {
          const offset = i === 0 ? -0.15 : 0.15;
          const a = Math.atan2(dirX, dirZ) + offset;
          dx = Math.sin(a);
          dz = Math.cos(a);
          config.damage = Math.round(config.damage * 0.85);
        }
        p.spawn(sx, sz, dx, dz, config, owner);
      }
    }
  }

  playerShoot(input) {
    if (this.player.shootCooldown > 0 || this.player.isDead) return;
    this.player.shootCooldown = this.player.currentSpell.cooldown;
    this.spawnSpell(this.player.x, this.player.z, input.aimDir.x, input.aimDir.z, this.player.currentSpell, this.player);
  }

  botShoot(bot, aimX, aimZ) {
    if (bot.isDead) return;
    this.spawnSpell(bot.x, bot.z, aimX, aimZ, bot.currentSpell, bot);
  }

  triggerCrystalExplosion(crystal, allActors, chests) {
    this.sound.playExplosion();
    this.sceneManager.addTrauma(0.5);
    this.particleSys.spawnImpact(crystal.x, crystal.z, 0xff0055, 3.0, crystal.explosionRadius);
    const targets = [...allActors, ...chests.filter((c) => !c.isDead)];
    targets.forEach((t) => {
      const d = Math.hypot(t.x - crystal.x, t.z - crystal.z);
      if (d <= crystal.explosionRadius) t.takeDamage(crystal.explosionDamage);
    });
  }

  resolveObeliskCollisions(actor) {
    this.sceneManager.obelisks.forEach((o) => {
      const dx = actor.x - o.x;
      const dz = actor.z - o.z;
      const dist = Math.hypot(dx, dz);
      const minDist = actor.radius + o.radius;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        actor.x = o.x + nx * minDist;
        actor.z = o.z + nz * minDist;
        if (!actor.isPlayer) {
          const strafe = actor.strafeDir || 1;
          actor.x += -nz * strafe * 0.12;
          actor.z += nx * strafe * 0.12;
        }
      }
    });
  }

  update(dt, allActors, chests, crystals, bots) {
    if (this.telegraphTimer > 0) {
      this.telegraphTimer -= dt;
      if (this.telegraphTimer <= 0) this.telegraphMesh.visible = false;
    }

    this.projectiles.forEach((proj) => {
      if (!proj.active) return;
      proj.update(dt, allActors);
      const isPlayerProj = proj.owner === this.player || !!proj.owner?.isPlayer;

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
            this.particleSys.spawnImpact(chest.x, chest.z, 0xffd700, 2.5);
          }
        }
      });
      if (!proj.active) return;

      crystals.forEach((crystal) => {
        if (crystal.isDead || !proj.active) return;
        if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, crystal.x, crystal.z, crystal.radius)) {
          const exploded = crystal.takeDamage(proj.damage);
          this.sound.playHit();
          proj.despawn();
          if (exploded) this.triggerCrystalExplosion(crystal, allActors, chests);
        }
      });
      if (!proj.active) return;

      const targets = isPlayerProj ? bots : [this.player, ...bots.filter((b) => b !== proj.owner)];
      for (const target of targets) {
        if (target.isDead) continue;
        if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, target.x, target.z, target.radius)) {
          if (proj.hitTargets && proj.hitTargets.has(target)) continue;
          if (proj.hitTargets) proj.hitTargets.add(target);

          let dmg = proj.damage;
          if (isPlayerProj && this.player.perks.includes('EXECUTIONER') && target.hp < target.maxHp * 0.4) {
            dmg = Math.round(dmg * 1.35);
          }

          const dealt = target.takeDamage(dmg);
          this.sound.playHit();
          target.applyKnockback(proj.vx, proj.vz, 2.5);
          this.damageNumbers.spawn(target.x, target.z, dealt, proj.spellConfig.color);

          const isBig = !!proj.spellConfig.aoeRadius || target === this.player || dealt >= 50;
          this.sceneManager.addTrauma(isBig ? 0.35 : 0.12);
          this.particleSys.spawnImpact(proj.x, proj.z, proj.spellConfig.color, proj.radius, proj.spellConfig.aoeRadius || 0);

          if (proj.spellConfig.aoeRadius) {
            this.sound.playExplosion();
            this.particleSys.spawnImpact(proj.x, proj.z, proj.spellConfig.color, proj.radius, proj.spellConfig.aoeRadius);
            targets.forEach((other) => {
              if (other !== target && !other.isDead && Math.hypot(other.x - proj.x, other.z - proj.z) <= proj.spellConfig.aoeRadius) {
                const oDealt = other.takeDamage(Math.round(dmg * 0.7));
                other.applyKnockback(other.x - proj.x, other.z - proj.z, 2.0);
                this.damageNumbers.spawn(other.x, other.z, oDealt, proj.spellConfig.color);
              }
            });
          }

          if (isPlayerProj && this.player.perks.includes('VAMPIRIC_SOUL') && dealt > 0) {
            this.player.heal(dealt * 0.2);
          }

          if (proj.spellConfig.id === 'CRYO') target.applyChill(proj.spellConfig.slowFactor, 1.5);
          else if (proj.spellConfig.id === 'VENOM') target.applyPoison(proj.spellConfig.dps, proj.spellConfig.duration);
          else if (proj.spellConfig.id === 'PYRO') target.applyBurn(10, 2.0);

          if (proj.spellConfig.id === 'ELECTRO') {
            const others = targets.filter((a) => a !== target && !a.isDead);
            let chains = 0;
            for (const other of others) {
              if (chains >= (proj.spellConfig.chainCount || 2)) break;
              if (Math.hypot(other.x - target.x, other.z - target.z) <= (proj.spellConfig.chainRadius || 6.0)) {
                const cDealt = other.takeDamage(dmg * 0.5);
                other.applyKnockback(other.x - target.x, other.z - target.z, 1.5);
                this.damageNumbers.spawn(other.x, other.z, cDealt, 0xffe600);
                this.particleSys.spawnBurst(other.x, 1.2, other.z, 0xffe600, 8, 6);
                chains++;
              }
            }
          }

          if (target.isDead) {
            this.sound.playExplosion();
            this.particleSys.spawnImpact(target.x, target.z, 0xff0055, 2.2);
            this.spawnManager.dropLoot(target.x, target.z, 5, 0.6);
            if (proj.owner) {
              proj.owner.kills = (proj.owner.kills || 0) + 1;
              if (proj.owner.addXP) proj.owner.addXP(60);
              const killer = proj.owner.isPlayer ? 'Player' : (proj.owner.name || 'Bot');
              const victim = target.isPlayer ? 'Player' : (target.name || 'Bot');
              this.killFeed.addKill(killer, victim, proj.owner.isPlayer, target.isPlayer);
              this.banners.onKill(killer, proj.owner.isPlayer);
            }
          }

          if (!proj.spellConfig.pierce) {
            proj.despawn();
            break;
          }
        }
      }
    });
  }

  reset() {
    this.telegraphMesh.visible = false;
    this.telegraphTimer = 0;
  }
}

