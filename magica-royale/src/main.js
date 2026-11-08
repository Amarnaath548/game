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
import { SPELLS, ARENA, PLAYER_BASE } from './config/constants.js';

// Setup Core
const sceneManager = new SceneManager();
const input = new InputManager(sceneManager.camera);
const sound = new SoundManager();
const meta = new MetaProgression();
const particleSys = new ParticleSystem(sceneManager.scene, 400);
let zoneSys = new ZoneSystem(sceneManager.scene);
const floatingBars = new FloatingBarSystem(sceneManager.camera);

// Player Entity
const player = new Player(sceneManager.scene, input);

// Pools
const projPool = new ObjectPool(() => {
  const geo = new THREE.SphereGeometry(0.5, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: SPELLS.PYRO.color });
  const mesh = new THREE.Mesh(geo, mat);
  sceneManager.scene.add(mesh);
  return mesh;
}, 50);
const projectiles = projPool.pool.map((mesh) => new Projectile(mesh, projPool));

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
  chests.push(new Chest(0, 0, sceneManager.scene, true)); // Mythic Center
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

  // Spawn 11 Bots distributed across the expanded arena (radius 55 to 80 units)
  bots = [];
  const TOTAL_BOTS = 11;
  for (let i = 0; i < TOTAL_BOTS; i++) {
    const angle = (i / TOTAL_BOTS) * Math.PI * 2;
    const r = 55 + (i % 4) * 8;
    const bx = Math.cos(angle) * r;
    const bz = Math.sin(angle) * r;
    bots.push(new Bot(sceneManager.scene, bx, bz, i + 1));
  }

  isGameOver = false;
  matchActive = true;
}

function resetToLobby() {
  matchActive = false;
  chests.forEach((c) => c.destroy());
  crystals.forEach((c) => c.destroy());
  bots.forEach((b) => b.die());
  projPool.releaseAll();
  gemPool.releaseAll();
  orbPool.releaseAll();
  floatingBars.update([]);
}

const getAllAliveActors = () => [player, ...bots].filter((a) => !a.isDead);

// Spell Firing Helper
function spawnSpell(originX, originZ, dirX, dirZ, spellConfig, owner) {
  const isPlayer = owner === player;
  const config = { ...spellConfig };
  if (isPlayer && player.perks.includes('SNIPER_VELOCITY')) {
    config.speed *= 1.35;
    config.range *= 1.35;
  }
  if (isPlayer && player.perks.includes('GIANT_ARCANA')) {
    config.radius *= 1.4;
    if (config.aoeRadius) config.aoeRadius *= 1.4;
  }

  if (isPlayer) sound.playCast(config.id);

  // Cryo 3-shard spread
  if (config.id === 'CRYO') {
    const spread = config.spreadAngle || 0.35;
    const angles = [-spread, 0, spread];
    const baseAngle = Math.atan2(dirX, dirZ);
    angles.forEach((offset) => {
      const p = projectiles.find((proj) => !proj.active);
      if (p) {
        p.pool.acquire();
        const a = baseAngle + offset;
        p.spawn(originX, originZ, Math.sin(a), Math.cos(a), config, isPlayer ? 'player' : 'bot');
      }
    });
    return;
  }

  // Single or Twin Cast
  const count = (isPlayer && player.perks.includes('TWIN_CAST')) ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const p = projectiles.find((proj) => !proj.active);
    if (p) {
      p.pool.acquire();
      let dx = dirX;
      let dz = dirZ;
      if (count > 1) {
        const offset = (i === 0 ? -0.15 : 0.15);
        const a = Math.atan2(dirX, dirZ) + offset;
        dx = Math.sin(a);
        dz = Math.cos(a);
        config.damage = Math.round(config.damage * 0.85);
      }
      p.spawn(originX, originZ, dx, dz, config, isPlayer ? 'player' : 'bot');
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
  particleSys.spawnBurst(crystal.x, 1.2, crystal.z, 0xff0055, 30, 14, 1.6);
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
      actor.x = o.x + (dx / dist) * minDist;
      actor.z = o.z + (dz / dist) * minDist;
    }
  });
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  if (matchActive) {
    input.update(player.group.position);

    if (player.dashTimer > 0 && player.dashTimer - dt <= 0) {
      sound.playDash();
    }

    if (input.fireReleased) {
      input.fireReleased = false;
      playerShoot();
    }

    // Update Player & Collisions
    player.update(dt, bushes);
    resolveObeliskCollisions(player);

    // Update Bots AI
    const allActors = getAllAliveActors();
    bots.forEach((bot) => {
      bot.think(dt, zoneSys.currentRadius, allActors, chests, botShoot);
      resolveObeliskCollisions(bot);
    });

    // Update Projectiles & Hits
    projectiles.forEach((proj) => {
      if (!proj.active) return;
      proj.update(dt);

      const isPlayerProj = proj.owner === 'player';

      // Obelisk Collision (Venom lob jumps over!)
      if (proj.lobHeight <= 0) {
        for (const o of sceneManager.obelisks) {
          if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, o.x, o.z, o.radius)) {
            particleSys.spawnBurst(proj.x, proj.y, proj.z, 0x888899, 8, 6);
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
          particleSys.spawnBurst(proj.x, proj.y, proj.z, chest.isMythic ? 0x9333ea : 0x8b5a2b, 10, 8);
          proj.despawn();
          if (destroyed) {
            sound.playExplosion();
            dropLoot(chest.x, chest.z, chest.isMythic ? 8 : 3, chest.isMythic ? 1.0 : 0.35);
            particleSys.spawnBurst(chest.x, 1.0, chest.z, 0xffd700, 24, 12, 1.4);
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
          let dmg = proj.damage;
          // Bot vs Bot damage dampening: reduces bot-on-bot crossfire so they don't instakill each other
          if (!isPlayerProj && target !== player) {
            dmg = Math.round(dmg * 0.45);
          }

          if (isPlayerProj && player.perks.includes('EXECUTIONER') && target.hp < target.maxHp * 0.4) {
            dmg = Math.round(dmg * 1.35);
          }

          const dealt = target.takeDamage(dmg);
          sound.playHit();
          if (target === player) sceneManager.addTrauma(0.4);

          particleSys.spawnBurst(proj.x, proj.y, proj.z, proj.spellConfig.color, 14, 9);

          // Vampiric soul perk
          if (isPlayerProj && player.perks.includes('VAMPIRIC_SOUL') && dealt > 0) {
            player.heal(dealt * 0.2);
          }

          // Apply Spell Passives
          if (proj.spellConfig.id === 'CRYO') {
            target.applyChill(proj.spellConfig.slowFactor, 1.5);
          } else if (proj.spellConfig.id === 'VENOM') {
            target.applyPoison(proj.spellConfig.dps, proj.spellConfig.duration);
          } else if (proj.spellConfig.id === 'PYRO') {
            target.applyBurn(10, 2.0);
          }

          // Electro Chaining
          if (proj.spellConfig.id === 'ELECTRO') {
            const otherActors = possibleTargets.filter((a) => a !== target && !a.isDead);
            let chains = 0;
            for (const other of otherActors) {
              if (chains >= (proj.spellConfig.chainCount || 2)) break;
              const dist = Math.hypot(other.x - target.x, other.z - target.z);
              if (dist <= (proj.spellConfig.chainRadius || 6.0)) {
                other.takeDamage(dmg * 0.5);
                particleSys.spawnBurst(other.x, 1.2, other.z, 0xffe600, 8, 6);
                chains++;
              }
            }
          }

          // Actor Death Drop (Only drop loot/XP when killed by the player)
          if (target.isDead) {
            sound.playExplosion();
            particleSys.spawnBurst(target.x, 1.0, target.z, 0xff0055, 20, 10);
            if (isPlayerProj) {
              dropLoot(target.x, target.z, 5, 0.6);
            }
          }

          proj.despawn();
          break;
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

    // Update Storm Zone & Out-of-bounds damage
    zoneSys.update(dt, [player, ...bots]);

    // Update Overhead Floating Health Bars for bots
    floatingBars.update(bots);

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
