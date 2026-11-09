import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { InputManager } from './core/InputManager.js';
import { ObjectPool } from './core/ObjectPool.js';
import { SoundManager } from './core/SoundManager.js';
import { MetaProgression } from './core/MetaProgression.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { ZoneSystem } from './systems/ZoneSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { Player } from './entities/Player.js';
import { Bot } from './entities/Bot.js';
import { Projectile } from './entities/Projectile.js';
import { Chest, ArcaneCrystal, ShadowBush, XPGem, HealthOrb } from './entities/Prop.js';
import { UIManager } from './ui/UIManager.js';
import { FloatingBarSystem } from './ui/FloatingBarSystem.js';
import { DamageNumbers } from './ui/DamageNumbers.js';
import { KillFeed } from './ui/KillFeed.js';
import { SPELLS, ARENA, PLAYER_BASE } from './config/constants.js';

// Setup Core
const sceneManager = new SceneManager();
const input = new InputManager(sceneManager.camera);
const sound = new SoundManager();
const meta = new MetaProgression();
const particleSys = new ParticleSystem(sceneManager.scene, 400);
let zoneSys = new ZoneSystem(sceneManager.scene);
const floatingBars = new FloatingBarSystem(sceneManager.camera);
const damageNumbers = new DamageNumbers(sceneManager.camera);
const killFeed = new KillFeed();

// Player Entity
const player = new Player(sceneManager.scene, input);

// Pools
const projPool = new ObjectPool(() => {
  const group = new THREE.Group();
  sceneManager.scene.add(group);
  return group;
}, 50);
const projectiles = projPool.pool.map((group) => new Projectile(group, projPool));

const gemPool = new ObjectPool(() => {
  const geo = new THREE.OctahedronGeometry(0.35);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
  const mesh = new THREE.Mesh(geo, mat);
  sceneManager.scene.add(mesh);
  return mesh;
}, 60);
const gems = gemPool.pool.map((mesh) => new XPGem(mesh, gemPool));

const orbPool = new ObjectPool(() => {
  const geo = new THREE.DodecahedronGeometry(0.35);
  const mat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  const mesh = new THREE.Mesh(geo, mat);
  sceneManager.scene.add(mesh);
  return mesh;
}, 15);
const healthOrbs = orbPool.pool.map((mesh) => new HealthOrb(mesh, orbPool));

// Static Bushes
const bushes = [
  new ShadowBush(-20, -12, sceneManager.scene),
  new ShadowBush(20, 12, sceneManager.scene),
  new ShadowBush(-15, 28, sceneManager.scene),
  new ShadowBush(15, -28, sceneManager.scene),
  new ShadowBush(-42, 15, sceneManager.scene),
  new ShadowBush(42, -15, sceneManager.scene)
];

// Dynamic Match Entities
let chests = [];
let crystals = [];
let bots = [];
let matchActive = false;
let isGameOver = false;

// UI Manager
const ui = new UIManager(meta, {
  onSpellChange: (spellKey) => player.setSpell(spellKey),
  onPerkSelected: (perk) => {
    player.applyPerk(perk);
    sound.playLevelUp();
  },
  onStartMatch: () => startMatch(),
  onReturnToLobby: () => resetToLobby()
});

function applyLobbyLoadout() {
  const staff = meta.getSelectedStaff();
  const bonuses = meta.getMetaBonuses();

  // Apply staff element and cosmetic robe color
  player.setSpell(staff.element);
  ui.setSpellActive(staff.element);
  player.robeMat.color.setHex(staff.robeColor);

  // Apply meta upgrades
  player.maxHp = PLAYER_BASE.MAX_HP + bonuses.bonusHp;
  player.hp = player.maxHp;
  player.baseSpeed = PLAYER_BASE.MOVE_SPEED * bonuses.speedMultiplier;
  player.speed = player.baseSpeed;
  player.level = 1;
  player.xp = 0;
  player.kills = 0;
  player.perks = [];
  player.isDead = false;
  player.group.position.set(0, 0, 0);
  player.x = 0;
  player.z = 0;
  if (!sceneManager.scene.children.includes(player.group)) {
    sceneManager.scene.add(player.group);
  }
}

function startMatch() {
  // Clean up previous match
  chests.forEach((c) => c.destroy());
  crystals.forEach((c) => c.destroy());
  bots.forEach((b) => b.die());
  projectiles.forEach((p) => p.despawn());
  gems.forEach((g) => g.despawn());
  healthOrbs.forEach((o) => o.despawn());
  projPool.releaseAll();
  gemPool.releaseAll();
  orbPool.releaseAll();

  // Reset Zone Forcefield
  sceneManager.scene.remove(zoneSys.forcefield);
  sceneManager.scene.remove(zoneSys.groundRing);
  zoneSys = new ZoneSystem(sceneManager.scene);

  // Apply player loadout
  applyLobbyLoadout();

  // Spawn Chests across expanded 120u arena
  chests = [];
  chests.push(new Chest(0, -12, sceneManager.scene, true)); // Mythic Center (offset from player spawn)
  const chestCoords = [
    [-20, -20], [20, -20], [-20, 20], [20, 20],
    [-45, -25], [45, -25], [-45, 25], [45, 25],
    [0, 50], [0, -50], [-50, 0], [50, 0],
    [-75, -40], [75, -40], [-75, 40], [75, 40],
    [40, 70], [-40, -70], [70, 40], [-70, -40],
    [-90, 0], [90, 0], [0, -90], [0, 90]
  ];
  chestCoords.forEach(([x, z]) => chests.push(new Chest(x, z, sceneManager.scene, false)));

  // Spawn Crystals
  crystals = [
    new ArcaneCrystal(-35, 0, sceneManager.scene),
    new ArcaneCrystal(35, 0, sceneManager.scene),
    new ArcaneCrystal(0, -35, sceneManager.scene),
    new ArcaneCrystal(0, 35, sceneManager.scene),
    new ArcaneCrystal(-60, -60, sceneManager.scene),
    new ArcaneCrystal(60, 60, sceneManager.scene),
    new ArcaneCrystal(-60, 60, sceneManager.scene),
    new ArcaneCrystal(60, -60, sceneManager.scene)
  ];

  // Spawn 11 Bots distributed across the arena:
  // - 3 bots in Sanctum/Ruins inner ring (24-32 units) for immediate action
  // - 4 bots in mid ring (45-55 units)
  // - 4 bots in outer ring (65-80 units)
  bots = [];
  const TOTAL_BOTS = 11;
  const botSpawns = [
    { r: 26, angle: 0.5 },
    { r: 28, angle: 2.6 },
    { r: 30, angle: 4.7 },
    { r: 48, angle: 1.2 },
    { r: 50, angle: 2.8 },
    { r: 52, angle: 4.4 },
    { r: 46, angle: 5.9 },
    { r: 68, angle: 0.8 },
    { r: 72, angle: 2.3 },
    { r: 75, angle: 3.9 },
    { r: 78, angle: 5.4 }
  ];
  for (let i = 0; i < TOTAL_BOTS; i++) {
    const s = botSpawns[i];
    const bx = Math.cos(s.angle) * s.r;
    const bz = Math.sin(s.angle) * s.r;
    bots.push(new Bot(sceneManager.scene, bx, bz, i + 1));
  }

  isGameOver = false;
  matchActive = true;
  clock.getDelta(); // Clear accumulated delta time from lobby so dt doesn't jump
}

function resetToLobby() {
  matchActive = false;
  chests.forEach((c) => c.destroy());
  crystals.forEach((c) => c.destroy());
  bots.forEach((b) => b.die());
  projectiles.forEach((p) => p.despawn());
  gems.forEach((g) => g.despawn());
  healthOrbs.forEach((o) => o.despawn());
  projPool.releaseAll();
  gemPool.releaseAll();
  orbPool.releaseAll();
  floatingBars.update([]);
  damageNumbers.reset();
  killFeed.reset();
  telegraphMesh.visible = false;
  telegraphTimer = 0;
}

const getAllAliveActors = () => [player, ...bots].filter((a) => !a.isDead);

// Blast Ground Telegraph Ring
const telegraphGeo = new THREE.RingGeometry(5.0, 5.5, 32);
telegraphGeo.rotateX(-Math.PI / 2);
const telegraphMat = new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
const telegraphMesh = new THREE.Mesh(telegraphGeo, telegraphMat);
telegraphMesh.position.y = 0.05;
telegraphMesh.visible = false;
sceneManager.scene.add(telegraphMesh);
let telegraphTimer = 0;

function showTelegraph(x, z, radius = 5.5, duration = 0.4) {
  telegraphMesh.position.set(x, 0.05, z);
  telegraphMesh.scale.setScalar(radius / 5.5);
  telegraphMesh.visible = true;
  telegraphTimer = duration;
}

// Spell Firing Helper
function spawnSpell(originX, originZ, dirX, dirZ, spellConfig, owner) {
  const isPlayer = owner === player;
  const config = { ...spellConfig };
  if (owner && owner.dmgBonus) {
    config.damage += owner.dmgBonus;
  }

  // Shield self-cast
  if (config.id === 'SHIELD' || config.isSelfCast) {
    owner.applyShield(config.shieldAmount || 80, config.shieldDuration || 3.0);
    if (isPlayer) sound.playCast('SHIELD');
    particleSys.spawnBurst(owner.x, 1.2, owner.z, config.color, 16, 6);
    return;
  }

  if (isPlayer && player.perks.includes('SNIPER_VELOCITY')) {
    config.speed *= 1.35;
    config.range *= 1.35;
  }
  if (isPlayer && player.perks.includes('GIANT_ARCANA')) {
    config.radius *= 1.4;
    if (config.aoeRadius) config.aoeRadius *= 1.4;
  }

  // Solar Blast ground telegraph
  if (config.id === 'BLAST') {
    const tx = originX + dirX * config.range;
    const tz = originZ + dirZ * config.range;
    showTelegraph(tx, tz, config.aoeRadius || 5.5, config.telegraph || 0.4);
  }

  if (isPlayer) sound.playCast(config.id);

  // Spawn slightly ahead so projectile emerges in front of the caster
  const spawnOffset = (owner.radius || 1.0) + 0.35;
  const sx = originX + dirX * spawnOffset;
  const sz = originZ + dirZ * spawnOffset;

  // Cryo 3-shard spread
  if (config.id === 'CRYO') {
    const spread = config.spreadAngle || 0.35;
    const angles = [-spread, 0, spread];
    const baseAngle = Math.atan2(dirX, dirZ);
    angles.forEach((offset) => {
      const p = projectiles.find((proj) => !proj.active);
      if (p) {
        const a = baseAngle + offset;
        p.spawn(sx, sz, Math.sin(a), Math.cos(a), config, owner);
      }
    });
    return;
  }

  // Single or Twin Cast
  const count = (isPlayer && player.perks.includes('TWIN_CAST')) ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const p = projectiles.find((proj) => !proj.active);
    if (p) {
      let dx = dirX;
      let dz = dirZ;
      if (count > 1) {
        const offset = (i === 0 ? -0.15 : 0.15);
        const a = Math.atan2(dirX, dirZ) + offset;
        dx = Math.sin(a);
        dz = Math.cos(a);
        config.damage = Math.round(config.damage * 0.85);
      }
      p.spawn(sx, sz, dx, dz, config, owner);
    }
  }
}

function playerShoot() {
  if (player.shootCooldown > 0 || player.isDead || !matchActive) return;
  player.shootCooldown = player.currentSpell.cooldown;
  spawnSpell(player.x, player.z, input.aimDir.x, input.aimDir.z, player.currentSpell, player);
}

function botShoot(bot, aimX, aimZ) {
  if (bot.isDead || !matchActive) return;
  spawnSpell(bot.x, bot.z, aimX, aimZ, bot.currentSpell, bot);
}

function dropLoot(x, z, gemCount = 3, healthOrbChance = 0.35) {
  for (let i = 0; i < gemCount; i++) {
    const gem = gems.find((g) => !g.active);
    if (gem) {
      gem.pool.acquire();
      const ox = (Math.random() - 0.5) * 2;
      const oz = (Math.random() - 0.5) * 2;
      gem.spawn(x + ox, z + oz, 30);
    }
  }
  if (Math.random() < healthOrbChance) {
    const orb = healthOrbs.find((o) => !o.active);
    if (orb) {
      orb.pool.acquire();
      orb.spawn(x, z, 0.25);
    }
  }
}

function triggerCrystalExplosion(crystal) {
  sound.playExplosion();
  sceneManager.addTrauma(0.5);
  particleSys.spawnImpact(crystal.x, crystal.z, 0xff0055, 3.0, crystal.explosionRadius);
  const targets = [...getAllAliveActors(), ...chests.filter((c) => !c.isDead)];
  targets.forEach((t) => {
    const d = Math.hypot(t.x - crystal.x, t.z - crystal.z);
    if (d <= crystal.explosionRadius) {
      t.takeDamage(crystal.explosionDamage);
    }
  });
}

function resolveObeliskCollisions(actor) {
  sceneManager.obelisks.forEach((o) => {
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

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  if (matchActive) {
    if (telegraphTimer > 0) {
      telegraphTimer -= dt;
      if (telegraphTimer <= 0) telegraphMesh.visible = false;
    }

    input.update(player.group.position, bots, player.currentSpell.range);

    if (player.dashTimer > 0 && player.dashTimer - dt <= 0) {
      sound.playDash();
    }

    // Auto-repeat fire when aiming or on fire release
    if (input.fireReleased || (input.isAiming && player.shootCooldown <= 0)) {
      input.fireReleased = false;
      playerShoot();
    }

    // Update Player & Collisions
    player.update(dt, bushes);
    resolveObeliskCollisions(player);

    // Update Bots AI
    const allActors = getAllAliveActors();
    bots.forEach((bot) => {
      bot.think(dt, zoneSys.currentRadius, allActors, chests, gems, healthOrbs, player.kills, projectiles, botShoot);
      resolveObeliskCollisions(bot);
    });

    // Update Projectiles & Hits
    projectiles.forEach((proj) => {
      if (!proj.active) return;
      proj.update(dt, allActors);

      const isPlayerProj = proj.owner === player || !!proj.owner?.isPlayer;

      // Obelisk Collision (Venom lob jumps over!)
      if (proj.lobHeight <= 0) {
        for (const o of sceneManager.obelisks) {
          if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, o.x, o.z, o.radius)) {
            particleSys.spawnImpact(proj.x, proj.z, 0x888899, 1.2);
            proj.despawn();
            return;
          }
        }
      }

      // Hit Chests
      chests.forEach((chest) => {
        if (chest.isDead || !proj.active) return;
        if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, chest.x, chest.z, chest.radius)) {
          const destroyed = chest.takeDamage(proj.damage);
          sound.playHit();
          particleSys.spawnImpact(proj.x, proj.z, chest.isMythic ? 0x9333ea : 0x8b5a2b, 1.5);
          proj.despawn();
          if (destroyed) {
            sound.playExplosion();
            dropLoot(chest.x, chest.z, chest.isMythic ? 8 : 3, chest.isMythic ? 1.0 : 0.35);
            particleSys.spawnImpact(chest.x, chest.z, 0xffd700, 2.5);
          }
        }
      });

      if (!proj.active) return;

      // Hit Crystals (Explosive Barrels)
      crystals.forEach((crystal) => {
        if (crystal.isDead || !proj.active) return;
        if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, crystal.x, crystal.z, crystal.radius)) {
          const exploded = crystal.takeDamage(proj.damage);
          sound.playHit();
          proj.despawn();
          if (exploded) {
            triggerCrystalExplosion(crystal);
          }
        }
      });

      if (!proj.active) return;

      // Hit Actors (Bots or Player)
      const possibleTargets = isPlayerProj ? bots : [player, ...bots.filter((b) => b !== proj.owner)];
      for (const target of possibleTargets) {
        if (target.isDead) continue;
        if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, target.x, target.z, target.radius)) {
          if (proj.hitTargets && proj.hitTargets.has(target)) continue;
          if (proj.hitTargets) proj.hitTargets.add(target);

          let dmg = proj.damage;

          if (isPlayerProj && player.perks.includes('EXECUTIONER') && target.hp < target.maxHp * 0.4) {
            dmg = Math.round(dmg * 1.35);
          }

          const dealt = target.takeDamage(dmg);
          sound.playHit();
          target.applyKnockback(proj.vx, proj.vz, 2.5);
          damageNumbers.spawn(target.x, target.z, dealt, proj.spellConfig.color);

          const isBigHit = !!proj.spellConfig.aoeRadius || target === player || dealt >= 50;
          sceneManager.addTrauma(isBigHit ? 0.35 : 0.12);
          particleSys.spawnImpact(proj.x, proj.z, proj.spellConfig.color, proj.radius, proj.spellConfig.aoeRadius || 0);

          // Solar Blast / AoE Detonation
          if (proj.spellConfig.aoeRadius) {
            sound.playExplosion();
            particleSys.spawnImpact(proj.x, proj.z, proj.spellConfig.color, proj.radius, proj.spellConfig.aoeRadius);
            possibleTargets.forEach((other) => {
              if (other !== target && !other.isDead) {
                const od = Math.hypot(other.x - proj.x, other.z - proj.z);
                if (od <= proj.spellConfig.aoeRadius) {
                  const oDealt = other.takeDamage(Math.round(dmg * 0.7));
                  other.applyKnockback(other.x - proj.x, other.z - proj.z, 2.0);
                  damageNumbers.spawn(other.x, other.z, oDealt, proj.spellConfig.color);
                }
              }
            });
          }

          // Vampiric soul perk
          if (isPlayerProj && player.perks.includes('VAMPIRIC_SOUL') && dealt > 0) {
            player.heal(dealt * 0.2);
          }

          // Apply Spell Passives (works for any projectile)
          if (proj.spellConfig.id === 'CRYO') {
            target.applyChill(proj.spellConfig.slowFactor, 1.5);
          } else if (proj.spellConfig.id === 'VENOM') {
            target.applyPoison(proj.spellConfig.dps, proj.spellConfig.duration);
          } else if (proj.spellConfig.id === 'PYRO') {
            target.applyBurn(10, 2.0);
          }

          // Electro Chaining (works for any projectile)
          if (proj.spellConfig.id === 'ELECTRO') {
            const otherActors = possibleTargets.filter((a) => a !== target && !a.isDead);
            let chains = 0;
            for (const other of otherActors) {
              if (chains >= (proj.spellConfig.chainCount || 2)) break;
              const dist = Math.hypot(other.x - target.x, other.z - target.z);
              if (dist <= (proj.spellConfig.chainRadius || 6.0)) {
                const chainDmg = dmg * 0.5;
                const cDealt = other.takeDamage(chainDmg);
                other.applyKnockback(other.x - target.x, other.z - target.z, 1.5);
                damageNumbers.spawn(other.x, other.z, cDealt, 0xffe600);
                particleSys.spawnBurst(other.x, 1.2, other.z, 0xffe600, 8, 6);
                chains++;
              }
            }
          }

          // Actor Death Drop & Kill Feed (drop loot for ANY kill!)
          if (target.isDead) {
            sound.playExplosion();
            particleSys.spawnImpact(target.x, target.z, 0xff0055, 2.2);
            dropLoot(target.x, target.z, 5, 0.6);
            if (proj.owner) {
              proj.owner.kills = (proj.owner.kills || 0) + 1;
              if (proj.owner.addXP) proj.owner.addXP(60);
              const killerName = proj.owner.isPlayer ? 'Player' : (proj.owner.name || 'Bot');
              const victimName = target.isPlayer ? 'Player' : (target.name || 'Bot');
              killFeed.addKill(killerName, victimName, proj.owner.isPlayer, target.isPlayer);
            }
          }

          if (!proj.spellConfig.pierce) {
            proj.despawn();
            break;
          }
        }
      }
    });

    // Update Props
    chests.forEach((c) => c.update(dt));
    crystals.forEach((c) => c.update(dt));

    // Collect Gems & Orbs
    gems.forEach((gem) => {
      const collected = gem.update(dt, player.x, player.z);
      if (collected) {
        sound.playPickup();
        particleSys.spawnBurst(gem.x, 0.6, gem.z, 0x00f2ff, 6, 4);
        player.addXP(gem.xpValue, (lvl) => {
          sound.playLevelUp();
          ui.showPerkCards(lvl);
        });
      }
    });

    healthOrbs.forEach((orb) => {
      const collected = orb.update(dt, player.x, player.z);
      if (collected) {
        sound.playPickup();
        particleSys.spawnBurst(orb.x, 0.6, orb.z, 0x10b981, 10, 5);
        player.heal(player.maxHp * orb.healPercent);
      }
    });

    // Bots consume gems & orbs on contact
    bots.forEach((bot) => {
      if (bot.isDead) return;
      gems.forEach((gem) => {
        if (gem.active && Math.hypot(gem.x - bot.x, gem.z - bot.z) < 1.3) {
          gem.despawn();
          if (bot.addXP) bot.addXP(gem.xpValue || 25);
          particleSys.spawnBurst(gem.x, 0.6, gem.z, 0x00f2ff, 4, 3);
        }
      });
      healthOrbs.forEach((orb) => {
        if (orb.active && Math.hypot(orb.x - bot.x, orb.z - bot.z) < 1.3) {
          orb.despawn();
          bot.heal(bot.maxHp * orb.healPercent);
          particleSys.spawnBurst(orb.x, 0.6, orb.z, 0x10b981, 6, 4);
        }
      });
    });

    // Update Storm Zone & Out-of-bounds damage
    zoneSys.update(dt, [player, ...bots]);

    // Update Overhead Floating Health Bars for bots & damage numbers
    floatingBars.update(bots);
    damageNumbers.update(dt);

    // Update Particles
    particleSys.update(dt);

    // Check Alive Count & End Game
    const aliveActors = getAllAliveActors();
    const isSafe = zoneSys.getSafeDistance(player.x, player.z) > 0;
    ui.updateHUD(player, aliveActors.length, isSafe);

    if (!isGameOver) {
      if (player.isDead) {
        isGameOver = true;
        matchActive = false;
        ui.showEndGame(false, aliveActors.length + 1);
      } else if (aliveActors.length === 1 && aliveActors[0] === player) {
        isGameOver = true;
        matchActive = false;
        ui.showEndGame(true, 1);
      }
    }

    sceneManager.updateCamera(player.group.position, input.aimDir, dt);
  } else {
    // In Lobby: gently rotate camera around center
    const time = clock.getElapsedTime() * 0.2;
    sceneManager.camera.position.x = Math.sin(time) * 45;
    sceneManager.camera.position.z = Math.cos(time) * 45;
    sceneManager.camera.position.y = 35;
    sceneManager.camera.lookAt(0, 0, 0);
  }

  sceneManager.render();
}

animate();
