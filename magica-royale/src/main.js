import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { InputManager } from './core/InputManager.js';
import { ObjectPool } from './core/ObjectPool.js';
import { SoundManager } from './core/SoundManager.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { ZoneSystem } from './systems/ZoneSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { Player } from './entities/Player.js';
import { Bot } from './entities/Bot.js';
import { Projectile } from './entities/Projectile.js';
import { Chest, ArcaneCrystal, ShadowBush, XPGem, HealthOrb } from './entities/Prop.js';
import { UIManager } from './ui/UIManager.js';
import { FloatingBarSystem } from './ui/FloatingBarSystem.js';
import { SPELLS, ARENA } from './config/constants.js';

// Setup Core
const sceneManager = new SceneManager();
const input = new InputManager(sceneManager.camera);
const sound = new SoundManager();
const particleSys = new ParticleSystem(sceneManager.scene, 400);
const zoneSys = new ZoneSystem(sceneManager.scene);
const floatingBars = new FloatingBarSystem(sceneManager.camera);

// Player Entity
const player = new Player(sceneManager.scene, input);

// UI Manager
const ui = new UIManager(
  (spellKey) => player.setSpell(spellKey),
  (perk) => {
    player.applyPerk(perk);
    sound.playLevelUp();
  }
);

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

// Spawn Interactive Props (Chests, Mythic, Crystals, Bushes)
const chests = [];
// 1 Mythic Chest in center (0,0)
chests.push(new Chest(0, 0, sceneManager.scene, true));

// Wooden Chests in Outer and Mid rings
const chestCoords = [
  [-16, -16], [16, -16], [-16, 16], [16, 16],
  [-32, -18], [32, -18], [-32, 18], [32, 18],
  [0, 36], [0, -36], [-36, 0], [36, 0],
  [-52, -26], [52, -26], [-52, 26], [52, 26],
  [28, 48], [-28, -48], [48, 28], [-48, -28]
];
chestCoords.forEach(([x, z]) => chests.push(new Chest(x, z, sceneManager.scene, false)));

// Arcane Crystals (Explosive Barrels)
const crystals = [
  new ArcaneCrystal(-24, 0, sceneManager.scene),
  new ArcaneCrystal(24, 0, sceneManager.scene),
  new ArcaneCrystal(0, -24, sceneManager.scene),
  new ArcaneCrystal(0, 24, sceneManager.scene),
  new ArcaneCrystal(-38, -38, sceneManager.scene),
  new ArcaneCrystal(38, 38, sceneManager.scene)
];

// Shadow Bushes for stealth
const bushes = [
  new ShadowBush(-20, -12, sceneManager.scene),
  new ShadowBush(20, 12, sceneManager.scene),
  new ShadowBush(-15, 28, sceneManager.scene),
  new ShadowBush(15, -28, sceneManager.scene),
  new ShadowBush(-42, 15, sceneManager.scene),
  new ShadowBush(42, -15, sceneManager.scene)
];

// Spawn 11 Bots along the Outer Ring (Radius ~62)
const bots = [];
const TOTAL_BOTS = 11;
for (let i = 0; i < TOTAL_BOTS; i++) {
  const angle = (i / TOTAL_BOTS) * Math.PI * 2;
  const bx = Math.cos(angle) * 62;
  const bz = Math.sin(angle) * 62;
  bots.push(new Bot(sceneManager.scene, bx, bz, i + 1));
}

// All actors list
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

// Player Cast Trigger
function playerShoot() {
  if (player.shootCooldown > 0 || player.isDead) return;
  player.shootCooldown = player.currentSpell.cooldown;
  spawnSpell(player.x, player.z, input.aimDir.x, input.aimDir.z, player.currentSpell, player);
}

// Bot Cast Trigger
function botShoot(bot, aimX, aimZ) {
  if (bot.isDead) return;
  spawnSpell(bot.x, bot.z, aimX, aimZ, bot.currentSpell, bot);
}

// Drop Loot helper
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

// Crystal Explosion
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

// Solid Obelisk Collisions helper
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

// Game Loop
const clock = new THREE.Clock();
let isGameOver = false;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  input.update(player.group.position);

  // Player Dash Sound
  if (player.dashTimer > 0 && player.dashTimer - dt <= 0) {
    sound.playDash();
  }

  // Player Shoot
  if (input.fireReleased) {
    input.fireReleased = false;
    playerShoot();
  }

  // Update Player
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

    // 1. Hit Chests
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

    // 2. Hit Crystals (Explosive Barrels)
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

    // 3. Hit Actors (Bots or Player)
    const possibleTargets = isPlayerProj ? bots : [player, ...bots.filter((b) => b !== proj.owner)];
    for (const target of possibleTargets) {
      if (target.isDead) continue;
      if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, target.x, target.z, target.radius)) {
        let dmg = proj.damage;
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

        // Actor Death Drop
        if (target.isDead) {
          sound.playExplosion();
          particleSys.spawnBurst(target.x, 1.0, target.z, 0xff0055, 20, 10);
          dropLoot(target.x, target.z, 5, 0.6);
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
      ui.showEndGame(false, aliveActors.length + 1);
    } else if (aliveActors.length === 1 && aliveActors[0] === player) {
      isGameOver = true;
      ui.showEndGame(true, 1);
    }
  }

  // Camera & Render
  sceneManager.updateCamera(player.group.position, input.aimDir, dt);
  sceneManager.render();
}

animate();
