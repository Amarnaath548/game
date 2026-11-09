import { LEVEL_TABLE } from '../config/constants.js';
import { STAVES, UPGRADES } from '../core/MetaProgression.js';
import { HeroSelectView } from './HeroSelectView.js';
import { QuestView } from './QuestView.js';
import { triggerLockShake, renderPerkSelection } from '../core/SpellAccess.js';

export class UIManager {
  constructor(metaProgression, callbacks = {}) {
    this.meta = metaProgression;
    this.questManager = callbacks.questManager;
    this.sceneManager = callbacks.sceneManager;
    this.onSpellChange = callbacks.onSpellChange;
    this.onHeroChange = callbacks.onHeroChange;
    this.onPerkSelected = callbacks.onPerkSelected;
    this.onStartMatch = callbacks.onStartMatch;
    this.onReturnToLobby = callbacks.onReturnToLobby;

    const get = (id) => document.getElementById(id);
    this.lobbyScreen = get('lobby-screen'); this.lobbyTrophies = get('lobby-trophies'); this.lobbyGold = get('lobby-gold');
    this.lobbyRankTitle = get('lobby-rank-title'); this.lobbyArenaLabel = get('lobby-arena-label');
    this.stavesContainer = get('staves-container'); this.upgradesContainer = get('upgrades-container');
    this.heroesContainer = get('heroes-container'); this.questsContainer = get('quests-container');
    this.questsBadgeEl = get('quests-badge'); this.playMatchBtn = get('play-match-btn'); this.hud = get('hud');
    this.aliveCountEl = get('alive-count'); this.zoneStatusEl = get('zone-status');
    this.hpFillEl = get('hp-fill'); this.xpFillEl = get('xp-fill');
    this.lvlTextEl = get('player-lvl-text'); this.hpTextEl = get('player-hp-text');
    this.perkOverlay = get('perk-overlay'); this.endModal = get('end-modal');
    this.endTitle = get('end-title'); this.endSubtitle = get('end-subtitle');
    this.rewardTrophy = get('reward-trophy'); this.rewardGold = get('reward-gold');
    this.modalLobbyBtn = get('modal-lobby-btn'); this.modalPlayAgainBtn = get('modal-play-again-btn');

    this.heroSelectView = new HeroSelectView(this.heroesContainer, this.meta, (h) => this.onHeroChange && this.onHeroChange(h));
    if (this.questManager) {
      this.questView = new QuestView(this.questsContainer, this.questsBadgeEl, this.questManager, this.meta, () => this.lobbyGold.textContent = this.meta.data.gold);
    }

    this.initLobbyEvents();
    this.initSpellButtons();
    this.initKeyboardShortcuts();
    this.renderLobby();
  }

  initLobbyEvents() {
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
      if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) fsBtn.style.display = 'none';
      else {
        fsBtn.addEventListener('click', () => {
          if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const el = document.documentElement;
            if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
          } else {
            if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          }
        });
      }
    }

    this.playMatchBtn.addEventListener('click', () => {
      document.body.classList.add('in-match');
      this.lobbyScreen.style.display = 'none';
      this.hud.style.display = 'block';
      if (this.onStartMatch) this.onStartMatch();
    });

    this.modalLobbyBtn.addEventListener('click', () => {
      document.body.classList.remove('in-match');
      this.endModal.style.display = 'none';
      this.hud.style.display = 'none';
      this.lobbyScreen.style.display = 'flex';
      this.renderLobby();
      if (this.onReturnToLobby) this.onReturnToLobby();
    });

    this.modalPlayAgainBtn.addEventListener('click', () => {
      document.body.classList.add('in-match');
      this.endModal.style.display = 'none';
      if (this.onStartMatch) this.onStartMatch();
    });

    // Lobby Tabs switching
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

  renderLobby() {
    const rank = this.meta.getRank();
    this.lobbyTrophies.textContent = this.meta.data.trophies;
    this.lobbyGold.textContent = this.meta.data.gold;
    this.lobbyRankTitle.textContent = rank.title;
    this.lobbyRankTitle.style.color = rank.color;

    const currentHeroId = localStorage.getItem('magica_selected_hero') || 'ignis';
    this.heroSelectView.render(currentHeroId);
    if (this.questView) this.questView.render();
    if (this.lobbyArenaLabel && this.sceneManager) this.lobbyArenaLabel.textContent = `ARENA: ${this.sceneManager.getNextBiomeName()}`;

    // Staves Armory
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
        if (isUnlocked) {
          this.meta.selectStaff(staff.id);
          this.renderLobby();
        } else if (this.meta.unlockStaff(staff.id)) {
          this.renderLobby();
        }
      });
      this.stavesContainer.appendChild(card);
    });

    // Upgrades
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
    this.updateSpellBarLocks();
  }

  initSpellButtons() {
    const buttons = document.querySelectorAll('.spell-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const spell = btn.dataset.spell;
        if (!this.meta.ownsSpell(spell)) {
          triggerLockShake(btn);
          return;
        }
        this.setSpellActive(spell);
        if (this.onSpellChange) this.onSpellChange(spell);
      });
    });
    this.updateSpellBarLocks();
  }

  updateSpellBarLocks() {
    document.querySelectorAll('.spell-btn').forEach((btn) => {
      const isOwned = this.meta.ownsSpell(btn.dataset.spell);
      btn.classList.toggle('locked', !isOwned);
    });
  }

  setSpellActive(spellKey) {
    document.querySelectorAll('.spell-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.spell === spellKey);
    });
  }

  initKeyboardShortcuts() {
    const spellMap = {
      Digit1: 'PYRO', Digit2: 'CRYO', Digit3: 'ELECTRO', Digit4: 'VENOM',
      Digit5: 'PIERCE', Digit6: 'BLAST', Digit7: 'HOMING', Digit8: 'SHIELD'
    };
    window.addEventListener('keydown', (e) => {
      const spell = spellMap[e.code];
      if (spell) {
        if (this.perkOverlay.style.display === 'flex' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
          const index = parseInt(e.code.replace('Digit', ''), 10) - 1;
          const cards = this.perkOverlay.querySelectorAll('.perk-card');
          if (cards[index]) cards[index].click();
          return;
        }
        const btn = document.querySelector(`.spell-btn[data-spell="${spell}"]`);
        if (!this.meta.ownsSpell(spell)) {
          triggerLockShake(btn);
          return;
        }
        this.setSpellActive(spell);
        if (this.onSpellChange) this.onSpellChange(spell);
      }
    });
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
  }

  showPerkCards(level) {
    renderPerkSelection(this.perkOverlay, this.onPerkSelected);
  }

  showEndGame(isVictory, place, player = null, finishedQuests = []) {
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
    statsEl.innerHTML = `<div class="stat-pill">Hero: <b>${heroName}</b></div><div class="stat-pill">Placement: <b>#${place} of 12</b></div><div class="stat-pill">Kills: <b>${kills} ⚔️</b></div>${questHtml}`;
    const tSign = results.trophyChange >= 0 ? `+${results.trophyChange}` : `${results.trophyChange}`;
    this.rewardTrophy.textContent = `${tSign} 🏆 (${results.newTrophies})`; this.rewardGold.textContent = `+${results.goldEarned} 🪙 (${results.newGold})`;
  }
}
