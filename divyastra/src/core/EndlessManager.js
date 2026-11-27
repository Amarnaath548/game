import { ENDLESS_STORAGE_KEY, ENDLESS_CONFIG, getEndlessTierConfig, computeEndlessScore } from '../config/endless.js';
import { setDifficulty } from '../config/difficulty.js';

export class EndlessManager {
  constructor(deps = {}) {
    this.deps = deps; // { matchManager, spawnManager, banners, player, campaignManager }
    this.stats = this.loadStats();
    this.resetRunState();
  }

  setDeps(deps) {
    this.deps = Object.assign(this.deps || {}, deps);
  }

  loadStats() {
    const defaults = { bestScore: 0, bestTime: 0, bestKills: 0, bestTier: 1, runsPlayed: 0 };
    try {
      const raw = localStorage.getItem(ENDLESS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load endless stats:', e);
    }
    return defaults;
  }

  saveStats() {
    try {
      localStorage.setItem(ENDLESS_STORAGE_KEY, JSON.stringify(this.stats));
    } catch (e) {
      console.warn('Failed to save endless stats:', e);
    }
  }

  resetRunState() {
    this.elapsed = 0;
    this.currentTier = 1;
    this.respawnTimers = [];
    this.propRefreshTimer = 0;
  }

  startRun() {
    this.resetRunState();
    if (this.deps.campaignManager) this.deps.campaignManager.currentLevelId = null;
    setDifficulty(getEndlessTierConfig(1));
    if (this.deps.matchManager) {
      this.deps.matchManager.startMatch(null, ENDLESS_CONFIG.INITIAL_BOTS, 'endless');
    }
    if (this.deps.banners) {
      this.deps.banners.showMatchStartBanner('Endless Arena', 'Survive the onslaught');
    }
  }

  update(dt) {
    this.elapsed += dt;
    this.propRefreshTimer += dt;

    const newTier = Math.floor(this.elapsed / ENDLESS_CONFIG.TIER_INTERVAL_SEC) + 1;
    if (newTier > this.currentTier) {
      this.currentTier = newTier;
      const tierCfg = getEndlessTierConfig(newTier);
      setDifficulty(tierCfg);
      this.deps.banners?.showMatchStartBanner(`Endless Tier ${newTier}`, 'Rivals grow stronger!');
    }

    const spawnManager = this.deps.spawnManager;
    if (!spawnManager) return;

    spawnManager.cleanupDeadBots();

    const tierCfg = getEndlessTierConfig(this.currentTier);
    const activeBots = spawnManager.bots.filter((b) => !b.isDead).length;
    const needed = tierCfg.targetBots - (activeBots + this.respawnTimers.length);
    for (let i = 0; i < needed; i++) {
      this.respawnTimers.push(ENDLESS_CONFIG.RESPAWN_DELAY_SEC);
    }

    const remainingTimers = [];
    for (let i = 0; i < this.respawnTimers.length; i++) {
      const t = this.respawnTimers[i] - dt;
      if (t <= 0) {
        const spawnR = Math.max(30, (this.deps.matchManager?.zoneSys?.currentRadius || ENDLESS_CONFIG.STEADY_ZONE_RADIUS) - 6);
        spawnManager.spawnEndlessBot(tierCfg.botStartLevel, this.deps.player, spawnR);
      } else {
        remainingTimers.push(t);
      }
    }
    this.respawnTimers = remainingTimers;

    if (this.propRefreshTimer >= ENDLESS_CONFIG.PROP_REFRESH_INTERVAL) {
      this.propRefreshTimer = 0;
      const maxR = Math.max(24, (this.deps.matchManager?.zoneSys?.currentRadius || ENDLESS_CONFIG.STEADY_ZONE_RADIUS) - 8);
      spawnManager.replenishProps(maxR, ENDLESS_CONFIG.MIN_CHESTS, ENDLESS_CONFIG.MIN_CRYSTALS);
    }
  }

  finishRun(survivalTime, kills) {
    const score = computeEndlessScore(survivalTime, kills);
    const isNewBest = score > this.stats.bestScore;
    this.stats.runsPlayed += 1;
    if (isNewBest) this.stats.bestScore = score;
    if (survivalTime > this.stats.bestTime) this.stats.bestTime = Math.floor(survivalTime);
    if (kills > this.stats.bestKills) this.stats.bestKills = kills;
    if (this.currentTier > this.stats.bestTier) this.stats.bestTier = this.currentTier;
    this.saveStats();

    return {
      score,
      survivalTime,
      kills,
      tier: this.currentTier,
      isNewBest,
      bestScore: this.stats.bestScore,
      bestTime: this.stats.bestTime,
      bestKills: this.stats.bestKills
    };
  }
}
