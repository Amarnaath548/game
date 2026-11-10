import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { InputManager } from './core/InputManager.js';
import { ObjectPool } from './core/ObjectPool.js';
import { SoundManager } from './core/SoundManager.js';
import { MetaProgression } from './core/MetaProgression.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { FloatingBarSystem } from './ui/FloatingBarSystem.js';
import { DamageNumbers } from './ui/DamageNumbers.js';
import { KillFeed } from './ui/KillFeed.js';
import { BannerManager } from './ui/Banners.js';
import { UIManager } from './ui/UIManager.js';
import { Player } from './entities/Player.js';
import { Projectile } from './entities/Projectile.js';
import { XPGem, HealthOrb } from './entities/Prop.js';
import { SpawnManager } from './core/SpawnManager.js';
import { CombatResolver } from './core/CombatResolver.js';
import { MatchManager } from './core/MatchManager.js';
import { QuestManager } from './core/QuestManager.js';
import { SpellbookManager } from './core/SpellbookManager.js';

// Core Systems
const sceneManager = new SceneManager();
const input = new InputManager(sceneManager.camera);
const sound = new SoundManager();
const meta = new MetaProgression();
const questManager = new QuestManager();
const spellbookManager = new SpellbookManager();
const particleSys = new ParticleSystem(sceneManager.scene, 400);
const floatingBars = new FloatingBarSystem(sceneManager.camera);
const damageNumbers = new DamageNumbers(sceneManager.camera);
const killFeed = new KillFeed();
const banners = new BannerManager();

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

// Managers
const spawnManager = new SpawnManager(sceneManager.scene, gems, healthOrbs);
const combatResolver = new CombatResolver({
  sceneManager, sound, particleSys, damageNumbers, killFeed, banners, spawnManager, player, projectiles, questManager, meta, spellbookManager
});
const matchManager = new MatchManager({
  sceneManager, sound, meta, ui: null, banners, floatingBars, damageNumbers, killFeed,
  particleSys, player, spawnManager, combatResolver, projectiles, projPool, gemPool, orbPool, questManager, spellbookManager
});

// UI
const ui = new UIManager(meta, {
  questManager,
  spellbookManager,
  sceneManager,
  onSpellChange: (spellKey) => player.setSpell(spellKey),
  onCastRequested: () => {
    input.fireReleased = true;
  },
  onHeroChange: (hero) => {
    player.hero = hero;
    if (player.bodyMat) player.bodyMat.color.setHex(hero.bodyColor);
    if (player.accentMat) player.accentMat.color.setHex(hero.accentColor);
  },
  onPerkSelected: (perk) => {
    player.applyPerk(perk);
    sound.playLevelUp();
  },
  onStartMatch: () => {
    sceneManager.onMatchStart();
    matchManager.startMatch();
    lastTime = performance.now();
  },
  onReturnToLobby: () => matchManager.resetToLobby()
});
matchManager.ui = ui;
combatResolver.ui = ui;

// Debug Overlay (?debug=1)
const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
const debugEl = document.getElementById('debug-overlay');
if (isDebug && debugEl) debugEl.style.display = 'block';
let debugTimer = 0;
let debugFrames = 0;

// Game Loop
let lastTime = performance.now();
let totalTime = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  totalTime += dt;

  if (isDebug && debugEl) {
    debugFrames++;
    debugTimer += dt;
    if (debugTimer >= 0.25) {
      const fps = Math.round(debugFrames / debugTimer);
      debugEl.textContent = `FPS: ${fps} | Calls: ${sceneManager.renderer.info.render.calls}`;
      debugFrames = 0;
      debugTimer = 0;
    }
  }

  if (matchManager.matchActive) {
    sceneManager.checkPerformanceFallback(dt, particleSys);
    input.update(player.group.position, spawnManager.bots, player.currentSpell.range);

    if (player.dashTimer > 0 && player.dashTimer - dt <= 0) {
      sound.playDash();
    }

    if (input.fireReleased || (input.isAiming && player.shootCooldown <= 0)) {
      input.fireReleased = false;
      combatResolver.playerShoot(input);
    }

    player.update(dt, spawnManager.bushes);
    combatResolver.resolveObeliskCollisions(player);

    const allActors = matchManager.getAllAliveActors();
    spawnManager.bots.forEach((bot) => {
      bot.think(
        dt,
        matchManager.zoneSys.currentRadius,
        allActors,
        spawnManager.chests,
        spawnManager.gems,
        spawnManager.healthOrbs,
        player.kills,
        projectiles,
        (b, ax, az) => combatResolver.botShoot(b, ax, az)
      );
      combatResolver.resolveObeliskCollisions(bot);
    });

    combatResolver.update(dt, allActors, spawnManager.chests, spawnManager.crystals, spawnManager.bots);
    spawnManager.updateProps(dt);
    matchManager.update(dt);
    sceneManager.updateCamera(player.group.position, input.aimDir, dt);
  } else {
    const time = totalTime * 0.2;
    sceneManager.camera.position.x = Math.sin(time) * 45;
    sceneManager.camera.position.z = Math.cos(time) * 45;
    sceneManager.camera.position.y = 35;
    sceneManager.camera.lookAt(0, 0, 0);
  }

  sceneManager.render();
}

animate();
