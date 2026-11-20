import { LEVEL_TABLE, GAME_TITLE, VALID_HERO_IDS } from '../config/constants.js';
import { STAVES, UPGRADES } from '../core/MetaProgression.js';
import { HeroSelectView } from './HeroSelectView.js';
import { QuestView } from './QuestView.js';
import { renderPerkSelection } from '../core/SpellAccess.js';
import { ELEMENT_NAMES, ELEMENT_COLORS } from '../config/spellRegistry.js';
import { ElementPicker } from './ElementPicker.js';
import { UpgradePicker } from './UpgradePicker.js';
import { SpellbookView } from './SpellbookView.js';
import { Leaderboard } from './Leaderboard.js';
import { TopRightHUD } from './TopRightHUD.js';
import { SpellIndicator } from './SpellIndicator.js';

export class UIManager {
  constructor(metaProgression, callbacks = {}) {
    this.meta = metaProgression;
    this.questManager = callbacks.questManager; this.spellbookManager = callbacks.spellbookManager; this.sceneManager = callbacks.sceneManager; this.banners = callbacks.banners;
    this.onHeroChange = callbacks.onHeroChange; this.onPerkSelected = callbacks.onPerkSelected; this.onStartMatch = callbacks.onStartMatch; this.onReturnToLobby = callbacks.onReturnToLobby;
    this.onCastRequested = callbacks.onCastRequested; this.onElementPicked = callbacks.onElementPicked;

    const get = (id) => document.getElementById(id);
    this.lobbyScreen = get('lobby-screen'); this.lobbyTrophies = get('lobby-trophies'); this.lobbyGold = get('lobby-gold'); this.lobbyRankTitle = get('lobby-rank-title'); this.lobbyArenaLabel = get('lobby-arena-label');
    this.stavesContainer = get('staves-container'); this.upgradesContainer = get('upgrades-container'); this.heroesContainer = get('heroes-container'); this.questsContainer = get('quests-container');
    this.spellbookContainer = get('spellbook-container'); this.questsBadgeEl = get('quests-badge'); this.playMatchBtn = get('play-match-btn'); this.hud = get('hud');
    this.aliveCountEl = get('alive-count'); this.zoneStatusEl = get('zone-status'); this.hpFillEl = get('hp-fill'); this.xpFillEl = get('xp-fill'); this.lvlTextEl = get('player-lvl-text'); this.hpTextEl = get('player-hp-text');
    this.perkOverlay = get('perk-overlay'); this.endModal = get('end-modal'); this.endTitle = get('end-title'); this.endSubtitle = get('end-subtitle'); this.rewardTrophy = get('reward-trophy'); this.rewardGold = get('reward-gold'); this.modalLobbyBtn = get('modal-lobby-btn'); this.modalPlayAgainBtn = get('modal-play-again-btn');

    this.elementPicker = new ElementPicker(this.perkOverlay);
    this.upgradePicker = new UpgradePicker(this.perkOverlay);
    this.pendingPicks = 0;
    this.leaderboard = new Leaderboard(get('leaderboard')); this.topRightHUD = new TopRightHUD(get('top-right-hud'));
    this.spellIndicator = new SpellIndicator(get('spell-indicator'));
    this.heroSelectView = new HeroSelectView(this.heroesContainer, this.meta, (h) => this.onHeroChange?.(h));
    if (this.questManager) this.questView = new QuestView(this.questsContainer, this.questsBadgeEl, this.questManager, this.meta, () => this.lobbyGold.textContent = this.meta.data.gold);
    if (this.spellbookContainer && this.spellbookManager) this.spellbookView = new SpellbookView(this.spellbookContainer, this.spellbookManager);

    const logoEl = document.querySelector('.game-logo');
    if (logoEl) logoEl.textContent = GAME_TITLE;
    document.title = GAME_TITLE;

    this.initLobbyEvents(); this.initSpellPanel(); this.initCastButton(); this.initKeyboardShortcuts(); this.renderLobby();
  }

  initLobbyEvents() {
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.().catch(() => {}); }
      else { document.exitFullscreen?.().catch(() => {}); }
    });

    const startMatchUI = () => {
      document.body.classList.add('in-match'); this.lobbyScreen.style.display = 'none'; this.hud.style.display = 'block';
      this.onStartMatch?.();
    };
    this.playMatchBtn.addEventListener('click', startMatchUI);
    this.modalPlayAgainBtn.addEventListener('click', () => { this.endModal.style.display = 'none'; startMatchUI(); });
    this.modalLobbyBtn.addEventListener('click', () => {
      this.elementPicker.hide(); this.upgradePicker?.hide(); this.pendingPicks = 0; this.leaderboard?.reset(); this.topRightHUD?.reset(); this.spellIndicator?.reset();
      document.body.classList.remove('in-match'); this.endModal.style.display = 'none'; this.hud.style.display = 'none';
      this.lobbyScreen.style.display = 'flex'; this.renderLobby(); this.onReturnToLobby?.();
    });

    const tabBtns = document.querySelectorAll('.lobby-tab-btn'), tabPanels = document.querySelectorAll('.tab-panel');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active')); tabPanels.forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add('active');
      });
    });
  }

  initSpellPanel() {
    const bar = document.getElementById('spell-bar');
    if (!bar) return;
    bar.innerHTML = `<div id="spell-panel" style="display:flex;align-items:center;gap:10px;background:rgba(15,23,42,0.92);border:2px solid #3b4262;padding:6px 14px;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.6);text-shadow:0 1px 2px #000;"><div style="display:flex;flex-direction:column;gap:2px;"><div style="display:flex;align-items:center;gap:6px;"><span id="spell-name-label" style="font-size:13px;font-weight:900;color:#fff;">Agni Bana</span><span id="spell-side-tag" style="display:none;font-size:9px;font-weight:900;padding:1px 5px;border-radius:4px;letter-spacing:0.5px;"></span><span id="spell-tier-label" style="display:none;font-size:10px;font-weight:800;background:#334155;color:#38bdf8;padding:1px 6px;border-radius:999px;">Astra</span><span id="tapas-indicator" style="display:none;font-size:9px;font-weight:900;background:#f59e0b;color:#0f172a;padding:1px 5px;border-radius:4px;box-shadow:0 0 8px #f59e0b;">TAPAS +40%</span></div><div id="spell-chips-box" style="display:flex;gap:4px;"></div></div></div>`;
    this.spellNameEl = document.getElementById('spell-name-label');
    this.spellSideTagEl = document.getElementById('spell-side-tag');
    this.spellTierEl = document.getElementById('spell-tier-label');
    this.spellChipsEl = document.getElementById('spell-chips-box');
    this.tapasIndicatorEl = document.getElementById('tapas-indicator');
  }

  initCastButton() {
    if (document.getElementById('cast-btn') || !this.hud) return;
    const castBtn = document.createElement('div');
    castBtn.id = 'cast-btn'; castBtn.style.display = 'none';
    castBtn.innerHTML = `<svg viewBox="0 0 68 68"><circle id="cast-cd-ring" cx="34" cy="34" r="30"></circle></svg>`;
    this.hud.appendChild(castBtn); this.castCdRing = document.getElementById('cast-cd-ring');
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (this.perkOverlay.style.display === 'flex' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
        this.perkOverlay.querySelectorAll('.perk-card')[parseInt(e.code.replace('Digit', ''), 10) - 1]?.click();
      }
    });
  }

  renderLobby() {
    const rank = this.meta.getRank();
    this.lobbyTrophies.textContent = this.meta.data.trophies;
    this.lobbyGold.textContent = this.meta.data.gold;
    this.lobbyRankTitle.textContent = rank.title;
    this.lobbyRankTitle.style.color = rank.color;

    const rawHeroId = localStorage.getItem('magica_selected_hero') || 'tapasvi';
    const currentHeroId = VALID_HERO_IDS.includes(rawHeroId) ? rawHeroId : 'tapasvi';
    this.heroSelectView.render(currentHeroId);
    if (this.questView) this.questView.render();
    if (this.spellbookView) this.spellbookView.render();
    if (this.lobbyArenaLabel && this.sceneManager) this.lobbyArenaLabel.textContent = `ARENA: ${this.sceneManager.getNextBiomeName()}`;

    this.stavesContainer.innerHTML = '';
    STAVES.forEach((staff) => {
      const isUnlocked = this.meta.data.unlockedStaves.includes(staff.id), isSelected = this.meta.data.selectedStaffId === staff.id;
      const card = document.createElement('div'); card.className = `staff-card ${isSelected ? 'selected' : ''}`;
      const btnHtml = isSelected ? `<button class="staff-action-btn btn-equipped">EQUIPPED</button>` : isUnlocked ? `<button class="staff-action-btn btn-select">EQUIP</button>` : `<button class="staff-action-btn btn-unlock" ${this.meta.data.gold >= staff.cost ? '' : 'disabled'}>UNLOCK (${staff.cost} 🪙)</button>`;
      card.innerHTML = `<div><div class="staff-name" style="color: #${staff.colorHex.toString(16).padStart(6, '0')}">${staff.name}</div><div class="staff-desc">${staff.perkDesc}</div></div>${btnHtml}`;
      card.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation(); if (isSelected) return;
        if (isUnlocked) { this.meta.selectStaff(staff.id); this.renderLobby(); } else if (this.meta.unlockStaff(staff.id)) { this.renderLobby(); }
      });
      this.stavesContainer.appendChild(card);
    });

    this.upgradesContainer.innerHTML = '';
    UPGRADES.forEach((upg) => {
      const currentLevel = this.meta.data.upgradeLevels[upg.id] || 0, cost = this.meta.getUpgradeCost(upg.id), isMax = currentLevel >= upg.maxLevel;
      const row = document.createElement('div'); row.className = 'upgrade-row';
      row.innerHTML = `<div class="upg-info"><div class="upg-name">${upg.name} (Lv ${currentLevel}/${upg.maxLevel})</div><div class="upg-desc">${upg.desc}</div></div><button class="upg-btn" ${(!isMax && this.meta.data.gold >= cost) ? '' : 'disabled'}>${isMax ? 'MAX' : `${cost} 🪙`}</button>`;
      if (!isMax) row.querySelector('.upg-btn').addEventListener('click', () => { if (this.meta.buyUpgrade(upg.id)) this.renderLobby(); });
      this.upgradesContainer.appendChild(row);
    });
  }

  updateSpellPanel(player) {
    if (!this.spellNameEl) return;
    const spell = player.currentSpell || {};
    const elements = player.spellSlot ? player.spellSlot.elements : (spell.elements || []);
    const tier = spell.tier ?? 0;
    this.spellNameEl.textContent = spell.name || (spell.id === 'fist' ? 'Mushti' : 'Agni Bana');
    const schoolColor = spell.school && ELEMENT_COLORS[spell.school] ? ELEMENT_COLORS[spell.school] : (spell.color || 0x38bdf8);
    const colorHex = `#${schoolColor.toString(16).padStart(6, '0')}`;
    this.spellNameEl.style.color = colorHex;

    if (this.spellTierEl) {
      this.spellTierEl.textContent = 'Astra';
      this.spellTierEl.style.display = tier === 3 ? 'inline-block' : 'none';
      this.spellTierEl.style.color = colorHex;
    }

    if (this.spellSideTagEl) {
      const side = spell.sideEffect;
      if (side && side.id) {
        const sideId = side.id.toUpperCase();
        const sideColors = { LAVA: { bg: '#c2410c', text: '#ffedd5', border: '#f97316' }, STEAM: { bg: '#e2e8f0', text: '#0f172a', border: '#ffffff' }, MUD: { bg: '#5c3a21', text: '#fef3c7', border: '#8b5a2b' } };
        const cfg = sideColors[sideId] || { bg: '#334155', text: '#fff', border: '#64748b' };
        this.spellSideTagEl.textContent = sideId; this.spellSideTagEl.style.background = cfg.bg;
        this.spellSideTagEl.style.color = cfg.text; this.spellSideTagEl.style.border = `1px solid ${cfg.border}`;
        this.spellSideTagEl.style.display = 'inline-block';
      } else {
        this.spellSideTagEl.style.display = 'none';
      }
    }

    if (!elements || elements.length === 0) { this.spellChipsEl.innerHTML = ''; return; }
    const icons = { E: '🪨', F: '🔥', W: '💧' };
    this.spellChipsEl.innerHTML = elements.map((e) => {
      const color = ELEMENT_COLORS[e] ? `#${ELEMENT_COLORS[e].toString(16).padStart(6, '0')}` : '#888';
      return `<span style="font-size:10px;font-weight:800;background:rgba(255,255,255,0.08);border:1px solid ${color};color:${color};padding:1px 6px;border-radius:4px;">${icons[e] || ''} ${ELEMENT_NAMES[e] || e}</span>`;
    }).join('');
  }

  updateHUD(player, aliveCountOrActors, isSafe, dt = 0.5) {
    const isList = Array.isArray(aliveCountOrActors);
    const aliveCount = isList ? aliveCountOrActors.length : aliveCountOrActors;
    if (this.aliveCountEl) this.aliveCountEl.textContent = aliveCount;
    if (this.leaderboard && isList) this.leaderboard.update(aliveCountOrActors, player, dt);
    if (this.topRightHUD) this.topRightHUD.update(player, isSafe);
    else if (this.zoneStatusEl) {
      this.zoneStatusEl.textContent = isSafe ? 'Safe' : 'STORM';
      this.zoneStatusEl.style.color = isSafe ? '#b700ff' : '#ef4444';
    }
    const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
    this.hpFillEl.style.width = `${hpPct}%`;
    this.hpTextEl.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

    const currentLvlConfig = LEVEL_TABLE.find((lvl) => lvl.level === player.level) || { xpReq: 0 };
    const nextLvlConfig = LEVEL_TABLE.find((lvl) => lvl.level === player.level + 1) || { xpReq: 999 };
    const range = nextLvlConfig.xpReq - currentLvlConfig.xpReq;
    const progress = Math.max(0, player.xp - currentLvlConfig.xpReq);
    this.xpFillEl.style.width = `${Math.min(100, (progress / range) * 100)}%`;
    this.lvlTextEl.textContent = `Lv ${player.level} ${player.hero?.name || ''}`;

    this.updateSpellPanel(player);
    if (this.spellIndicator) this.spellIndicator.update(player);
    if (this.tapasIndicatorEl) this.tapasIndicatorEl.style.display = player.tapasActive ? 'inline-block' : 'none';

    if (this.castCdRing) {
      const cd = player.spellSlot ? player.spellSlot.getCooldownProgress() : Math.max(0, (player.shootCooldown || 0) / (player.currentSpell?.cooldown || 1));
      this.castCdRing.style.strokeDashoffset = `${188.5 * cd}`;
      this.castCdRing.style.stroke = cd > 0 ? '#f59e0b' : '#00f2ff';
    }
  }

  showLevelUp(player, level) {
    if (this.banners) this.banners.showLevelUp(level);
    if (player.spellSlot && (player.spellSlot.elements.length + this.pendingPicks) < 3) {
      this.pendingPicks++; this.elementPicker.pendingPicks = this.pendingPicks;
      if (!this.elementPicker.active && !this.elementPicker.timer) this.openNextElementPick(player);
    } else { this.showPerkCards(level, player); }
  }

  openNextElementPick(player) {
    if (this.pendingPicks <= 0 || !player.spellSlot || player.spellSlot.elements.length >= 3) {
      this.pendingPicks = 0; this.elementPicker.pendingPicks = 0; return;
    }
    this.elementPicker.show(player, (element) => {
      this.onElementPicked?.(element);
      const commitPick = (upgradeId = null) => {
        this.pendingPicks = Math.max(0, this.pendingPicks - 1);
        this.elementPicker.pendingPicks = this.pendingPicks;
        player.spellSlot.addElement(element, upgradeId);
        player.setSpell(player.spellSlot.currentSpell.id);
        this.updateSpellPanel(player);
        if (this.spellbookManager) this.spellbookManager.recordSpellReached(player.currentSpell.id, this.meta);
        if (player.currentSpell.tier === 3 && this.questManager) this.questManager.record('reachT3', 1);
        if (this.pendingPicks > 0 && player.spellSlot.elements.length < 3) {
          this.elementPicker.clearDelay();
          this.elementPicker.timer = setTimeout(() => {
            this.elementPicker.timer = null;
            if (this.pendingPicks > 0 && player.spellSlot?.elements.length < 3) this.openNextElementPick(player);
          }, 1500);
        } else { this.pendingPicks = 0; this.elementPicker.pendingPicks = 0; }
      };

      if (player.spellSlot?.needsUpgradeChoice(element)) {
        this.upgradePicker.show(element, (upgradeId) => commitPick(upgradeId));
      } else {
        commitPick(null);
      }
    });
  }

  reset() {
    this.elementPicker?.hide(); this.upgradePicker?.hide(); this.pendingPicks = 0;
  }

  showPerkCards(level, player = null) {
    renderPerkSelection(this.perkOverlay, this.onPerkSelected, player);
  }

  showEndGame(isVictory, place, player = null, finishedQuests = [], spellbookSummary = null, devCheated = false) {
    this.elementPicker.hide(); this.upgradePicker?.hide(); this.pendingPicks = 0;
    const results = devCheated ? { trophyChange: 0, newTrophies: this.meta.data.trophies, goldEarned: 0, newGold: this.meta.data.gold } : this.meta.applyMatchResults(place);
    this.endModal.style.display = 'flex';
    const heroName = player?.hero?.name || 'Archmage', kills = player?.kills || 0;
    this.endTitle.innerHTML = isVictory ? `<span class="title-win">#1 VICTORY ROYALE!</span>` : `<span class="title-loss">DEFEAT - #${place} of 12</span>`;
    this.endSubtitle.textContent = isVictory ? `Glory to ${heroName}! Sanctum Champion.` : `${heroName} eliminated at rank #${place}.`;
    let statsEl = document.getElementById('match-hero-stats');
    if (!statsEl) { statsEl = document.createElement('div'); statsEl.id = 'match-hero-stats'; this.endModal.insertBefore(statsEl, document.querySelector('.match-rewards-box')); }
    const questHtml = finishedQuests?.length ? `<div class="quest-done-pill">✨ Quest completed!</div>` : '';
    const newSpellHtml = spellbookSummary?.newSpells?.length ? `<div class="quest-done-pill new-astra-pill" style="background:#0284c7;border-color:#38bdf8;">📖 New astra unlocked! (${spellbookSummary.newSpells.join(', ')})</div>` : '';
    const starHtml = spellbookSummary?.starsEarned ? `<div class="quest-done-pill" style="background:#ca8a04;border-color:#facc15;">⭐ Siddhi earned! (+${spellbookSummary.starsEarned})</div>` : '';
    const devHtml = devCheated ? `<div class="quest-done-pill" style="background:#ef4444;border-color:#f87171;color:#fff;font-weight:900;">DEV MATCH - no rewards</div>` : '';
    statsEl.innerHTML = `${devHtml}<div class="stat-pill">Hero: <b>${heroName}</b></div><div class="stat-pill">Placement: <b>#${place} of 12</b></div><div class="stat-pill">Kills: <b>${kills} ⚔️</b></div>${questHtml}${newSpellHtml}${starHtml}`;
    const tSign = results.trophyChange >= 0 ? `+${results.trophyChange}` : `${results.trophyChange}`;
    this.rewardTrophy.textContent = `${tSign} 🏆 (${results.newTrophies})`;
    this.rewardGold.textContent = `+${results.goldEarned} 🪙 (${results.newGold})`;
  }
}
