import * as THREE from 'three';
import './hud.css';
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
import { AstraVisuals } from './systems/AstraVisuals.js';
import { TutorialHints } from './ui/TutorialHints.js';
import { separateActors } from './systems/ActorSeparation.js';
import { ArenaInteractables } from './systems/ArenaInteractables.js';
import { getDevTools } from './core/DevTools.js';
import { DevInspectView } from './ui/DevInspectView.js';
import { CampaignManager } from './core/CampaignManager.js';
import { setDifficulty } from './config/difficulty.js';
import { SettingsView } from './ui/SettingsView.js';
import { updateVisibilityCulling } from './systems/VisibilityCulling.js';

// Core Systems
const sceneManager = new SceneManager();
const input = new InputManager(sceneManager.camera);
const sound = new SoundManager();
const meta = new MetaProgression();
const questManager = new QuestManager();
const spellbookManager = new SpellbookManager();
const campaignManager = new CampaignManager();
const tutorialHints = new TutorialHints();
const particleSys = new ParticleSystem(sceneManager.scene, 400);
sceneManager.particleSys = particleSys;
sceneManager.applyQuality(sceneManager.qualityTier, particleSys);
const floatingBars = new FloatingBarSystem(sceneManager.camera);
const damageNumbers = new DamageNumbers(sceneManager.camera);
const killFeed = new KillFeed();
const banners = new BannerManager();
const astraVisuals = new AstraVisuals(sceneManager.scene);
const arenaInteractables = new ArenaInteractables(sceneManager.scene, sceneManager.obelisks, particleSys, sound);

// Player Entity
const player = new Player(sceneManager.scene, input);
floatingBars.setPlayer(player);
player.onTapasReadyCallback = () => { sound.playTapasReady(); tutorialHints.onTapasReady(); };
player.onDamage = () => sound.playPlayerDamage();

// Pools
const projPool = new ObjectPool(() => {
  const group = new THREE.Group(); sceneManager.scene.add(group); return group;
}, 50);
const projectiles = projPool.pool.map((group) => new Projectile(group, projPool));

const gemPool = new ObjectPool(() => {
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0x00f2ff }));
  sceneManager.scene.add(mesh); return mesh;
}, 60);
const gems = gemPool.pool.map((mesh) => new XPGem(mesh, gemPool));

const orbPool = new ObjectPool(() => {
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
  sceneManager.scene.add(mesh); return mesh;
}, 15);
const healthOrbs = orbPool.pool.map((mesh) => new HealthOrb(mesh, orbPool));

// Managers
const spawnManager = new SpawnManager(sceneManager.scene, gems, healthOrbs);
const combatResolver = new CombatResolver({
  sceneManager, sound, particleSys, damageNumbers, killFeed, banners, spawnManager, player, projectiles, questManager, meta, spellbookManager, astraVisuals, arenaInteractables
});
const matchManager = new MatchManager({
  sceneManager, sound, meta, ui: null, banners, floatingBars, damageNumbers, killFeed,
  particleSys, player, spawnManager, combatResolver, projectiles, projPool, gemPool, orbPool, questManager, spellbookManager, arenaInteractables, campaignManager
});

// UI
const ui = new UIManager(meta, {
  questManager, spellbookManager, sceneManager, banners, campaignManager,
  onSpellChange: (spellKey) => player.setSpell(spellKey),
  onCastRequested: () => { input.fireReleased = true; },
  onHeroChange: (hero) => {
    if (player.rebuildHeroVisual) player.rebuildHeroVisual(hero);
    else { player.hero = hero; if (player.bodyMat) player.bodyMat.color.setHex(hero.bodyColor); if (player.accentMat) player.accentMat.color.setHex(hero.accentColor); }
  },
  onPerkSelected: (perk) => { player.applyPerk(perk); sound.playLevelUp(); },
  onStartMatch: () => { sceneManager.onMatchStart(); sound.startMatchDrone(); matchManager.startMatch(); tutorialHints.onMatchStart(); lastTime = performance.now(); },
  onReturnToLobby: () => { sound.stopMatchDrone(); matchManager.resetToLobby(); tutorialHints.onMatchEnd(); },
  onElementPicked: () => { tutorialHints.onElementPicked(); }
});
matchManager.ui = ui; combatResolver.ui = ui;
campaignManager.setDeps({ matchManager, ui, banners });

const origShowLevelUp = ui.showLevelUp.bind(ui);
ui.showLevelUp = (p, lvl) => { origShowLevelUp(p, lvl); tutorialHints.onLevelUp(lvl); };
const origShowEndGame = ui.showEndGame.bind(ui);
ui.showEndGame = (...args) => { sound.stopMatchDrone(); tutorialHints.onMatchEnd(); origShowEndGame(...args); };
const settingsView = new SettingsView(sceneManager, sound);

// Dev & Inspect mode integration
const devInspectView = new DevInspectView({ sceneManager, matchManager, spawnManager, arenaInteractables, player });
const devTools = getDevTools();
let devPanel = null;
if (devTools.enabled) {
  setDifficulty('NORMAL');
  import('./ui/DevPanel.js').then(({ DevPanel }) => {
    devPanel = new DevPanel({ player, spawnManager, matchManager, sceneManager, ui, devInspectView, campaignManager });
  });
}

// Hook god mode & no-cooldown
const origPlayerTakeDamage = player.takeDamage.bind(player);
player.takeDamage = (amount) => { const a = devTools.onPlayerDamage(amount); return a <= 0 ? 0 : origPlayerTakeDamage(a); };
const origPlayerShoot = combatResolver.playerShoot.bind(combatResolver);
combatResolver.playerShoot = (input) => { origPlayerShoot(input); devTools.onPlayerCast(player); };

// Debug Overlay (?debug=1)
const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
const debugEl = document.getElementById('debug-overlay');
if (isDebug && debugEl) debugEl.style.display = 'block';
let debugTimer = 0, debugFrames = 0;

// Game Loop
let lastTime = performance.now(), totalTime = 0, frameCount = 0;

function animate() {
  requestAnimationFrame(animate);
  frameCount++;
  const now = performance.now();
  const rawDt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  const dt = devTools.enabled ? devTools.scaleDt(rawDt) : rawDt;
  totalTime += dt;

  if (isDebug && debugEl) {
    debugFrames++; debugTimer += dt;
    if (debugTimer >= 0.25) {
      debugEl.textContent = `FPS: ${Math.round(debugFrames / debugTimer)} | Calls: ${sceneManager.renderer.info.render.calls}`;
      debugFrames = 0; debugTimer = 0;
    }
  }

  if (devInspectView.isOpen) {
    devInspectView.update(dt); sceneManager.render(); return;
  }

  if (matchManager.matchActive) {
    sound.updateHeartbeat(dt, player.hp, player.maxHp, true);

    // Hit-stop: freeze actor animation & projectiles, keep camera & HUD running
    if (combatResolver.hitFeedback.update(dt)) {
      damageNumbers.update(dt);
      sceneManager.updateCamera(player.group.position, input.aimDir, dt);
      sceneManager.render();
      return;
    }

    sceneManager.checkPerformanceFallback(dt, particleSys);
    const effectiveRange = (player.currentSpell?.range || 24) * (player.perks.includes('SNIPER_VELOCITY') ? 1.35 : 1.0);
    input.update(player.group.position, spawnManager.bots, effectiveRange);
    if (input.moveDir.x !== 0 || input.moveDir.z !== 0) tutorialHints.onMove();
    if (player.dashTimer > 0 && player.dashTimer - dt <= 0) {
      sound.playDash(); tutorialHints.onDash();
    }
    if (input.fireReleased || (input.isAiming && player.shootCooldown <= 0)) {
      input.fireReleased = false; combatResolver.playerShoot(input); tutorialHints.onCast();
    }

    player.update(dt, spawnManager.bushes);
    const allActors = matchManager.getAllAliveActors();
    if (!devTools.freezeBots) {
      spawnManager.bots.forEach((bot) => {
        bot.think(dt, matchManager.zoneSys.currentRadius, allActors, spawnManager.chests, spawnManager.gems, spawnManager.healthOrbs, player.kills, projectiles, (b, ax, az) => combatResolver.botShoot(b, ax, az));
      });
    }

    separateActors(matchManager.getAllAliveActors());
    arenaInteractables.update(dt, matchManager.getAllAliveActors());
    combatResolver.resolveObeliskCollisions(player);
    spawnManager.bots.forEach((bot) => combatResolver.resolveObeliskCollisions(bot));
    combatResolver.update(dt, allActors, spawnManager.chests, spawnManager.crystals, spawnManager.bots);
    if (astraVisuals) astraVisuals.update(dt);
    spawnManager.updateProps(dt);
    matchManager.update(dt);
    if (devPanel) devPanel.updateCircles(matchManager.getAllAliveActors());
    sceneManager.updateCamera(player.group.position, input.aimDir, dt);
    if (frameCount % 3 === 0) updateVisibilityCulling(sceneManager, spawnManager, arenaInteractables, player);
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
