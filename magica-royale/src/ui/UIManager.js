import { LEVEL_TABLE } from '../config/constants.js';
import { STAVES, UPGRADES } from '../core/MetaProgression.js';
import { HeroSelectView } from './HeroSelectView.js';
import { QuestView } from './QuestView.js';
import { renderPerkSelection } from '../core/SpellAccess.js';
import { ELEMENT_NAMES, ELEMENT_COLORS } from '../config/spellRegistry.js';
import { ElementPicker } from './ElementPicker.js';
import { SpellbookView } from './SpellbookView.js';

export class UIManager {
  constructor(metaProgression, callbacks = {}) {
    this.meta = metaProgression;
    this.questManager = callbacks.questManager;
    this.spellbookManager = callbacks.spellbookManager;
    this.sceneManager = callbacks.sceneManager;
    this.onHeroChange = callbacks.onHeroChange;
    this.onPerkSelected = callbacks.onPerkSelected;
    this.onStartMatch = callbacks.onStartMatch;
    this.onReturnToLobby = callbacks.onReturnToLobby;
    this.onCastRequested = callbacks.onCastRequested;

    const get = (id) => document.getElementById(id);
    this.lobbyScreen = get('lobby-screen'); this.lobbyTrophies = get('lobby-trophies'); this.lobbyGold = get('lobby-gold');
    this.lobbyRankTitle = get('lobby-rank-title'); this.lobbyArenaLabel = get('lobby-arena-label');
    this.stavesContainer = get('staves-container'); this.upgradesContainer = get('upgrades-container');
    this.heroesContainer = get('heroes-container'); this.questsContainer = get('quests-container');
    this.spellbookContainer = get('spellbook-container'); this.questsBadgeEl = get('quests-badge');
    this.playMatchBtn = get('play-match-btn'); this.hud = get('hud');
    this.aliveCountEl = get('alive-count'); this.zoneStatusEl = get('zone-status');
    this.hpFillEl = get('hp-fill'); this.xpFillEl = get('xp-fill');
    this.lvlTextEl = get('player-lvl-text'); this.hpTextEl = get('player-hp-text');
    this.perkOverlay = get('perk-overlay'); this.endModal = get('end-modal');
    this.endTitle = get('end-title'); this.endSubtitle = get('end-subtitle');
    this.rewardTrophy = get('reward-trophy'); this.rewardGold = get('reward-gold');
    this.modalLobbyBtn = get('modal-lobby-btn'); this.modalPlayAgainBtn = get('modal-play-again-btn');

    this.elementPicker = new ElementPicker(this.perkOverlay);
    this.heroSelectView = new HeroSelectView(this.heroesContainer, this.meta, (h) => this.onHeroChange && this.onHeroChange(h));
    if (this.questManager) {
      this.questView = new QuestView(this.questsContainer, this.questsBadgeEl, this.questManager, this.meta, () => this.lobbyGold.textContent = this.meta.data.gold);
    }
    if (this.spellbookContainer && this.spellbookManager) {
      this.spellbookView = new SpellbookView(this.spellbookContainer, this.spellbookManager);
    }

    this.initLobbyEvents();
    this.initSpellPanel();
    this.initCastButton();
    this.initKeyboardShortcuts();
    this.renderLobby();
  }

  initLobbyEvents() {
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          const el = document.documentElement;
          if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        } else if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      });
    }

    const startMatchUI = () => {
      document.body.classList.add('in-match');
      this.lobbyScreen.style.display = 'none';
      this.hud.style.display = 'block';
      if (this.onStartMatch) this.onStartMatch();
    };
    this.playMatchBtn.addEventListener('click', startMatchUI);
    this.modalPlayAgainBtn.addEventListener('click', () => { this.endModal.style.display = 'none'; startMatchUI(); });

    this.modalLobbyBtn.addEventListener('click', () => {
      document.body.classList.remove('in-match');
      this.endModal.style.display = 'none';
      this.hud.style.display = 'none';
      this.lobbyScreen.style.display = 'flex';
      this.renderLobby();
      if (this.onReturnToLobby) this.onReturnToLobby();
    });

    const tabBtns = document.querySelectorAll('.lobby-tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        tabPanels.forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById(`tab-${btn.dataset.tab}`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  initSpellPanel() {
    const bar = document.getElementById('spell-bar');
    if (!bar) return;
    bar.innerHTML = `<div id="spell-panel" style="display:flex;align-items:center;gap:10px;background:rgba(15,23,42,0.92);border:2px solid #3b4262;padding:6px 14px;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.6);text-shadow:0 1px 2px #000;"><div style="display:flex;flex-direction:column;gap:2px;"><div style="display:flex;align-items:center;gap:6px;"><span id="spell-name-label" style="font-size:13px;font-weight:900;color:#fff;">Fire Ball</span><span id="spell-tier-label" style="font-size:10px;font-weight:800;background:#334155;color:#38bdf8;padding:1px 6px;border-radius:999px;">Tier 1</span></div><div id="spell-chips-box" style="display:flex;gap:4px;"></div></div></div>`;
    this.spellNameEl = document.getElementById('spell-name-label');
    this.spellTierEl = document.getElementById('spell-tier-label');
    this.spellChipsEl = document.getElementById('spell-chips-box');
  }

  initCastButton() {
    if (document.getElementById('cast-btn') || !this.hud) return;
    const castBtn = document.createElement('div');
    castBtn.id = 'cast-btn';
    castBtn.style.cssText = 'position:absolute;bottom:calc(24px + env(safe-area-inset-bottom,0px));right:calc(116px + env(safe-area-inset-right,0px));width:68px;height:68px;border-radius:50%;background:rgba(15,23,42,0.85);border:2px solid #38bdf8;box-shadow:0 0 16px rgba(0,242,255,0.4);display:flex;align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;z-index:25;user-select:none;';
    castBtn.innerHTML = `<svg viewBox="0 0 68 68" style="position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);"><circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4"></circle><circle id="cast-cd-ring" cx="34" cy="34" r="30" fill="none" stroke="#00f2ff" stroke-width="4" stroke-dasharray="188.5" stroke-dashoffset="0"></circle></svg><span style="font-size:12px;font-weight:900;color:#fff;text-shadow:0 1px 3px #000;z-index:2;">CAST</span>`;
    const trigger = (e) => { e.preventDefault(); e.stopPropagation(); if (this.onCastRequested) this.onCastRequested(); };
    castBtn.addEventListener('pointerdown', trigger);
    castBtn.addEventListener('touchstart', trigger, { passive: false });
    this.hud.appendChild(castBtn);
    this.castCdRing = document.getElementById('cast-cd-ring');
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (this.perkOverlay.style.display === 'flex' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
        const index = parseInt(e.code.replace('Digit', ''), 10) - 1;
        const cards = this.perkOverlay.querySelectorAll('.perk-card');
        if (cards[index]) cards[index].click();
      }
    });
  }

  renderLobby() {
    const rank = this.meta.getRank();
    this.lobbyTrophies.textContent = this.meta.data.trophies;
    this.lobbyGold.textContent = this.meta.data.gold;
    this.lobbyRankTitle.textContent = rank.title;
    this.lobbyRankTitle.style.color = rank.color;

    const currentHeroId = localStorage.getItem('magica_selected_hero') || 'ignis';
    this.heroSelectView.render(currentHeroId);
    if (this.questView) this.questView.render();
    if (this.spellbookView) this.spellbookView.render();
    if (this.lobbyArenaLabel && this.sceneManager) this.lobbyArenaLabel.textContent = `ARENA: ${this.sceneManager.getNextBiomeName()}`;

    this.stavesContainer.innerHTML = '';
    STAVES.forEach((staff) => {
      const isUnlocked = this.meta.data.unlockedStaves.includes(staff.id);
      const isSelected = this.meta.data.selectedStaffId === staff.id;
      const card = document.createElement('div');
      card.className = `staff-card ${isSelected ? 'selected' : ''}`;
      const btnHtml = isSelected
        ? `<button class="staff-action-btn btn-equipped">EQUIPPED</button>`
        : isUnlocked
          ? `<button class="staff-action-btn btn-select">EQUIP</button>`
          : `<button class="staff-action-btn btn-unlock" ${this.meta.data.gold >= staff.cost ? '' : 'disabled'}>UNLOCK (${staff.cost} 🪙)</button>`;

      card.innerHTML = `<div><div class="staff-name" style="color: #${staff.colorHex.toString(16).padStart(6, '0')}">${staff.name}</div><div class="staff-desc">${staff.perkDesc}</div></div>${btnHtml}`;
      card.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        if (isSelected) return;
        if (isUnlocked) { this.meta.selectStaff(staff.id); this.renderLobby(); }
        else if (this.meta.unlockStaff(staff.id)) { this.renderLobby(); }
      });
      this.stavesContainer.appendChild(card);
    });

    this.upgradesContainer.innerHTML = '';
    UPGRADES.forEach((upg) => {
      const currentLevel = this.meta.data.upgradeLevels[upg.id] || 0;
      const cost = this.meta.getUpgradeCost(upg.id);
      const isMax = currentLevel >= upg.maxLevel;
      const row = document.createElement('div');
      row.className = 'upgrade-row';
      row.innerHTML = `<div class="upg-info"><div class="upg-name">${upg.name} (Lv ${currentLevel}/${upg.maxLevel})</div><div class="upg-desc">${upg.desc}</div></div><button class="upg-btn" ${(!isMax && this.meta.data.gold >= cost) ? '' : 'disabled'}>${isMax ? 'MAX' : `${cost} 🪙`}</button>`;
      if (!isMax) {
        row.querySelector('.upg-btn').addEventListener('click', () => {
          if (this.meta.buyUpgrade(upg.id)) this.renderLobby();
        });
      }
      this.upgradesContainer.appendChild(row);
    });
  }

  updateSpellBarLocks() {}
  setSpellActive() {}

  updateSpellPanel(player) {
    if (!this.spellNameEl) return;
    const spell = player.currentSpell;
    const elements = player.spellSlot?.elements?.length ? player.spellSlot.elements : (spell.elements || ['F']);
    this.spellNameEl.textContent = spell.name || 'Fire Ball';
    this.spellTierEl.textContent = `Tier ${spell.tier || 1}`;
    this.spellTierEl.style.color = `#${(spell.color || 0x38bdf8).toString(16).padStart(6, '0')}`;

    const icons = { E: '🪨', F: '🔥', W: '💧' };
    this.spellChipsEl.innerHTML = elements.map((e) => {
      const color = ELEMENT_COLORS[e] ? `#${ELEMENT_COLORS[e].toString(16).padStart(6, '0')}` : '#888';
      return `<span style="font-size:10px;font-weight:800;background:rgba(255,255,255,0.08);border:1px solid ${color};color:${color};padding:1px 6px;border-radius:4px;">${icons[e] || ''} ${ELEMENT_NAMES[e] || e}</span>`;
    }).join('');
  }

  updateHUD(player, aliveCount, isSafe) {
    if (this.aliveCountEl) this.aliveCountEl.textContent = aliveCount;
    if (this.zoneStatusEl) {
      this.zoneStatusEl.textContent = isSafe ? 'Safe' : 'DANGER';
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

    if (this.castCdRing) {
      const cd = player.spellSlot ? player.spellSlot.getCooldownProgress() : Math.max(0, (player.shootCooldown || 0) / (player.currentSpell?.cooldown || 1));
      this.castCdRing.style.strokeDashoffset = `${188.5 * cd}`;
      this.castCdRing.style.stroke = cd > 0 ? '#f59e0b' : '#00f2ff';
    }
  }

  showLevelUp(player, level) {
    if (player.spellSlot && player.spellSlot.elements.length < 3) {
      this.elementPicker.show(player, (element) => {
        player.spellSlot.addElement(element);
        player.setSpell(player.spellSlot.currentSpell.id);
        this.updateSpellPanel(player);
        if (this.spellbookManager) this.spellbookManager.recordSpellReached(player.currentSpell.id, this.meta);
        if (player.currentSpell.tier === 3 && this.questManager) this.questManager.record('reachT3', 1);
      });
    } else {
      this.showPerkCards(level);
    }
  }

  showPerkCards() {
    renderPerkSelection(this.perkOverlay, this.onPerkSelected);
  }

  showEndGame(isVictory, place, player = null, finishedQuests = [], spellbookSummary = null) {
    const results = this.meta.applyMatchResults(place);
    this.endModal.style.display = 'flex';
    const heroName = player?.hero?.name || 'Archmage', kills = player?.kills || 0;
    this.endTitle.innerHTML = isVictory ? `<span class="title-win">#1 VICTORY ROYALE!</span>` : `<span class="title-loss">DEFEAT - #${place} of 12</span>`;
    this.endSubtitle.textContent = isVictory ? `Glory to ${heroName}! Sanctum Champion.` : `${heroName} eliminated at rank #${place}.`;

    let statsEl = document.getElementById('match-hero-stats');
    if (!statsEl) {
      statsEl = document.createElement('div');
      statsEl.id = 'match-hero-stats';
      this.endModal.insertBefore(statsEl, document.querySelector('.match-rewards-box'));
    }
    const questHtml = finishedQuests?.length ? `<div class="quest-done-pill">✨ Quest completed!</div>` : '';
    const newSpellHtml = spellbookSummary?.newSpells?.length ? `<div class="quest-done-pill" style="background:#0284c7;border-color:#38bdf8;">📖 New spell unlocked: ${spellbookSummary.newSpells.join(', ')}!</div>` : '';
    const starHtml = spellbookSummary?.starsEarned ? `<div class="quest-done-pill" style="background:#ca8a04;border-color:#facc15;">⭐ ${spellbookSummary.starsEarned} Star${spellbookSummary.starsEarned > 1 ? 's' : ''} earned!</div>` : '';

    statsEl.innerHTML = `<div class="stat-pill">Hero: <b>${heroName}</b></div><div class="stat-pill">Placement: <b>#${place} of 12</b></div><div class="stat-pill">Kills: <b>${kills} ⚔️</b></div>${questHtml}${newSpellHtml}${starHtml}`;
    const tSign = results.trophyChange >= 0 ? `+${results.trophyChange}` : `${results.trophyChange}`;
    this.rewardTrophy.textContent = `${tSign} 🏆 (${results.newTrophies})`; this.rewardGold.textContent = `+${results.goldEarned} 🪙 (${results.newGold})`;
  }
}
