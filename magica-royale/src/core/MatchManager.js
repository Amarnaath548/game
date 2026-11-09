import { ZoneSystem } from '../systems/ZoneSystem.js';
import { PLAYER_BASE, HEROES } from '../config/constants.js';

export class MatchManager {
  constructor(deps) {
    this.sceneManager = deps.sceneManager;
    this.sound = deps.sound;
    this.meta = deps.meta;
    this.ui = deps.ui;
    this.banners = deps.banners;
    this.floatingBars = deps.floatingBars;
    this.damageNumbers = deps.damageNumbers;
    this.killFeed = deps.killFeed;
    this.particleSys = deps.particleSys;
    this.player = deps.player;
    this.spawnManager = deps.spawnManager;
    this.combatResolver = deps.combatResolver;
    this.projectiles = deps.projectiles;
    this.projPool = deps.projPool;
    this.gemPool = deps.gemPool;
    this.orbPool = deps.orbPool;
    this.questManager = deps.questManager;

    this.zoneSys = new ZoneSystem(this.sceneManager.scene);
    this.matchActive = false;
    this.isGameOver = false;
    this.matchTime = 0;
  }

  applyLobbyLoadout() {
    const staff = this.meta.getSelectedStaff();
    const bonuses = this.meta.getMetaBonuses();

    const selectedHeroId = localStorage.getItem('magica_selected_hero') || 'ignis';
    const hero = HEROES.find((h) => h.id === selectedHeroId) || HEROES[0];
    this.player.hero = hero;
    if (this.player.bodyMat) this.player.bodyMat.color.setHex(hero.bodyColor);
    if (this.player.accentMat) this.player.accentMat.color.setHex(hero.accentColor);

    this.player.setSpell(staff.element);
    if (this.ui) {
      this.ui.updateSpellBarLocks();
      this.ui.setSpellActive(staff.element);
    }
    this.player.robeMat.color.setHex(staff.robeColor);

    this.player.maxHp = PLAYER_BASE.MAX_HP + bonuses.bonusHp;
    this.player.hp = this.player.maxHp;
    this.player.baseSpeed = PLAYER_BASE.MOVE_SPEED * bonuses.speedMultiplier;
    this.player.speed = this.player.baseSpeed;
    this.player.level = 1;
    this.player.xp = 0;
    this.player.kills = 0;
    this.player.perks = [];
    this.player.isDead = false;
    this.player.group.position.set(0, 0, 0);
    this.player.x = 0;
    this.player.z = 0;
    if (!this.sceneManager.scene.children.includes(this.player.group)) {
      this.sceneManager.scene.add(this.player.group);
    }
  }

  startMatch() {
    this.spawnManager.cleanup();
    this.projectiles.forEach((p) => p.despawn());
    this.spawnManager.gems.forEach((g) => g.despawn());
    this.spawnManager.healthOrbs.forEach((o) => o.despawn());
    this.projPool.releaseAll();
    this.gemPool.releaseAll();
    this.orbPool.releaseAll();

    this.sceneManager.scene.remove(this.zoneSys.forcefield);
    this.sceneManager.scene.remove(this.zoneSys.groundRing);
    this.zoneSys = new ZoneSystem(this.sceneManager.scene);

    this.applyLobbyLoadout();
    this.sceneManager.startMatchBiome(this.spawnManager.bushes);
    this.spawnManager.startMatch();

    this.matchTime = 0;
    if (this.questManager) this.questManager.onMatchStart();
    this.isGameOver = false;
    this.matchActive = true;
  }

  resetToLobby() {
    this.matchActive = false;
    this.spawnManager.cleanup();
    this.projectiles.forEach((p) => p.despawn());
    this.spawnManager.gems.forEach((g) => g.despawn());
    this.spawnManager.healthOrbs.forEach((o) => o.despawn());
    this.projPool.releaseAll();
    this.gemPool.releaseAll();
    this.orbPool.releaseAll();
    this.floatingBars.update([]);
    this.damageNumbers.reset();
    this.killFeed.reset();
    this.banners.reset();
    this.combatResolver.reset();
  }

  getAllAliveActors() {
    return [this.player, ...this.spawnManager.bots].filter((a) => !a.isDead);
  }

  update(dt) {
    if (!this.matchActive) return;
    this.matchTime = (this.matchTime || 0) + dt;

    // Gems & Orbs Player Collection
    this.spawnManager.gems.forEach((gem) => {
      const collected = gem.update(dt, this.player.x, this.player.z);
      if (collected) {
        this.sound.playPickup();
        if (this.questManager) this.questManager.record('gem', 1);
        this.particleSys.spawnBurst(gem.x, 0.6, gem.z, 0x00f2ff, 6, 4);
        this.player.addXP(gem.xpValue, (lvl) => {
          this.sound.playLevelUp();
          this.ui.showPerkCards(lvl);
        });
      }
    });

    this.spawnManager.healthOrbs.forEach((orb) => {
      const collected = orb.update(dt, this.player.x, this.player.z);
      if (collected) {
        this.sound.playPickup();
        this.particleSys.spawnBurst(orb.x, 0.6, orb.z, 0x10b981, 10, 5);
        this.player.heal(this.player.maxHp * orb.healPercent);
      }
    });

    // Bots consume gems & orbs
    this.spawnManager.bots.forEach((bot) => {
      if (bot.isDead) return;
      this.spawnManager.gems.forEach((gem) => {
        if (gem.active && Math.hypot(gem.x - bot.x, gem.z - bot.z) < 1.3) {
          gem.despawn();
          if (bot.addXP) bot.addXP(gem.xpValue || 25);
          this.particleSys.spawnBurst(gem.x, 0.6, gem.z, 0x00f2ff, 4, 3);
        }
      });
      this.spawnManager.healthOrbs.forEach((orb) => {
        if (orb.active && Math.hypot(orb.x - bot.x, orb.z - bot.z) < 1.3) {
          orb.despawn();
          bot.heal(bot.maxHp * orb.healPercent);
          this.particleSys.spawnBurst(orb.x, 0.6, orb.z, 0x10b981, 6, 4);
        }
      });
    });

    // Storm Zone & Out-of-bounds damage
    this.zoneSys.update(dt, [this.player, ...this.spawnManager.bots]);

    // Overhead Floating Health Bars for bots & damage numbers
    this.floatingBars.update(this.spawnManager.bots);
    this.damageNumbers.update(dt);
    this.particleSys.update(dt);

    // Alive Count & Win/Loss Condition
    const aliveActors = this.getAllAliveActors();
    const isSafe = this.zoneSys.getSafeDistance(this.player.x, this.player.z) > 0;
    this.ui.updateHUD(this.player, aliveActors.length, isSafe);
    this.banners.checkZoneStatus(isSafe);

    if (!this.isGameOver) {
      if (this.player.isDead) {
        this.isGameOver = true;
        this.matchActive = false;
        const place = aliveActors.length + 1;
        if (this.questManager) this.questManager.record('matchEnd', { placement: place, survivalTime: this.matchTime, level: this.player.level });
        const finished = this.questManager ? this.questManager.getQuestsCompletedThisMatch() : [];
        this.ui.showEndGame(false, place, this.player, finished);
      } else if (aliveActors.length === 1 && aliveActors[0] === this.player) {
        this.isGameOver = true;
        this.matchActive = false;
        if (this.questManager) this.questManager.record('matchEnd', { placement: 1, survivalTime: this.matchTime, level: this.player.level });
        const finished = this.questManager ? this.questManager.getQuestsCompletedThisMatch() : [];
        this.ui.showEndGame(true, 1, this.player, finished);
      }
    }
  }
}

