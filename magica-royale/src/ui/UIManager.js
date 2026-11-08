import { LEVEL_TABLE } from '../config/constants.js';
import { STAVES, UPGRADES } from '../core/MetaProgression.js';

const PERK_POOL = [
  { id: 'TWIN_CAST', title: 'Twin Cast', desc: '+1 Projectile per shot (-15% damage)' },
  { id: 'GIANT_ARCANA', title: 'Giant Arcana', desc: '+40% Projectile AoE and blast size' },
  { id: 'SNIPER_VELOCITY', title: 'Sniper Velocity', desc: '+35% Projectile speed and range' },
  { id: 'VAMPIRIC_SOUL', title: 'Vampiric Soul', desc: 'Heal for 20% of damage dealt' },
  { id: 'WINDWALKER', title: 'Windwalker', desc: '+20% Move Speed, -1s Dash CD' },
  { id: 'ARCANE_SHIELD', title: 'Arcane Shield', desc: 'Absorbs next incoming hit' },
  { id: 'EXECUTIONER', title: 'Executioner', desc: '+35% Damage to enemies below 40% HP' }
];

export class UIManager {
  constructor(metaProgression, callbacks = {}) {
    this.meta = metaProgression;
    this.onSpellChange = callbacks.onSpellChange;
    this.onPerkSelected = callbacks.onPerkSelected;
    this.onStartMatch = callbacks.onStartMatch;
    this.onReturnToLobby = callbacks.onReturnToLobby;

    // Lobby Elements
    this.lobbyScreen = document.getElementById('lobby-screen');
    this.lobbyTrophies = document.getElementById('lobby-trophies');
    this.lobbyGold = document.getElementById('lobby-gold');
    this.lobbyRankTitle = document.getElementById('lobby-rank-title');
    this.stavesContainer = document.getElementById('staves-container');
    this.upgradesContainer = document.getElementById('upgrades-container');
    this.playMatchBtn = document.getElementById('play-match-btn');

    // HUD Elements
    this.hud = document.getElementById('hud');
    this.aliveCountEl = document.getElementById('alive-count');
    this.zoneStatusEl = document.getElementById('zone-status');
    this.hpFillEl = document.getElementById('hp-fill');
    this.xpFillEl = document.getElementById('xp-fill');
    this.lvlTextEl = document.getElementById('player-lvl-text');
    this.hpTextEl = document.getElementById('player-hp-text');
    this.perkOverlay = document.getElementById('perk-overlay');

    // End Modal Elements
    this.endModal = document.getElementById('end-modal');
    this.endTitle = document.getElementById('end-title');
    this.endSubtitle = document.getElementById('end-subtitle');
    this.rewardTrophy = document.getElementById('reward-trophy');
    this.rewardGold = document.getElementById('reward-gold');
    this.modalLobbyBtn = document.getElementById('modal-lobby-btn');
    this.modalPlayAgainBtn = document.getElementById('modal-play-again-btn');

    this.initLobbyEvents();
    this.initSpellButtons();
    this.initKeyboardShortcuts();
    this.renderLobby();
  }

  initLobbyEvents() {
    this.playMatchBtn.addEventListener('click', () => {
      this.lobbyScreen.style.display = 'none';
      this.hud.style.display = 'block';
      if (this.onStartMatch) this.onStartMatch();
    });

    this.modalLobbyBtn.addEventListener('click', () => {
      this.endModal.style.display = 'none';
      this.hud.style.display = 'none';
      this.lobbyScreen.style.display = 'flex';
      this.renderLobby();
      if (this.onReturnToLobby) this.onReturnToLobby();
    });

    this.modalPlayAgainBtn.addEventListener('click', () => {
      this.endModal.style.display = 'none';
      if (this.onStartMatch) this.onStartMatch();
    });
  }

  renderLobby() {
    const rank = this.meta.getRank();
    this.lobbyTrophies.textContent = this.meta.data.trophies;
    this.lobbyGold.textContent = this.meta.data.gold;
    this.lobbyRankTitle.textContent = rank.title;
    this.lobbyRankTitle.style.color = rank.color;

    // Render Staves Armory
    this.stavesContainer.innerHTML = '';
    STAVES.forEach((staff) => {
      const isUnlocked = this.meta.data.unlockedStaves.includes(staff.id);
      const isSelected = this.meta.data.selectedStaffId === staff.id;

      const card = document.createElement('div');
      card.className = `staff-card ${isSelected ? 'selected' : ''}`;

      let btnHtml = '';
      if (isSelected) {
        btnHtml = `<button class="staff-action-btn btn-equipped">EQUIPPED</button>`;
      } else if (isUnlocked) {
        btnHtml = `<button class="staff-action-btn btn-select">EQUIP</button>`;
      } else {
        const canAfford = this.meta.data.gold >= staff.cost;
        btnHtml = `<button class="staff-action-btn btn-unlock" ${canAfford ? '' : 'disabled'}>UNLOCK (${staff.cost} 🪙)</button>`;
      }

      card.innerHTML = `
        <div>
          <div class="staff-name" style="color: #${staff.colorHex.toString(16).padStart(6, '0')}">${staff.name}</div>
          <div class="staff-desc">${staff.perkDesc}</div>
        </div>
        ${btnHtml}
      `;

      const actionBtn = card.querySelector('button');
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isSelected) return;
        if (isUnlocked) {
          this.meta.selectStaff(staff.id);
          this.renderLobby();
        } else {
          if (this.meta.unlockStaff(staff.id)) {
            this.renderLobby();
          }
        }
      });

      this.stavesContainer.appendChild(card);
    });

    // Render Meta Upgrades
    this.upgradesContainer.innerHTML = '';
    UPGRADES.forEach((upg) => {
      const currentLevel = this.meta.data.upgradeLevels[upg.id] || 0;
      const cost = this.meta.getUpgradeCost(upg.id);
      const isMax = currentLevel >= upg.maxLevel;
      const canAfford = this.meta.data.gold >= cost;

      const row = document.createElement('div');
      row.className = 'upgrade-row';
      row.innerHTML = `
        <div class="upg-info">
          <div class="upg-name">${upg.name} (Lv ${currentLevel}/${upg.maxLevel})</div>
          <div class="upg-desc">${upg.desc}</div>
        </div>
        <button class="upg-btn" ${(!isMax && canAfford) ? '' : 'disabled'}>
          ${isMax ? 'MAX' : `${cost} 🪙`}
        </button>
      `;

      const btn = row.querySelector('.upg-btn');
      if (!isMax) {
        btn.addEventListener('click', () => {
          if (this.meta.buyUpgrade(upg.id)) {
            this.renderLobby();
          }
        });
      }

      this.upgradesContainer.appendChild(row);
    });
  }

  initSpellButtons() {
    const buttons = document.querySelectorAll('.spell-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.onSpellChange) this.onSpellChange(btn.dataset.spell);
      });
    });
  }

  setSpellActive(spellKey) {
    const buttons = document.querySelectorAll('.spell-btn');
    buttons.forEach((b) => {
      b.classList.toggle('active', b.dataset.spell === spellKey);
    });
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        if (this.perkOverlay.style.display === 'flex' && e.code !== 'Digit4') {
          const index = parseInt(e.code.replace('Digit', ''), 10) - 1;
          const cards = this.perkOverlay.querySelectorAll('.perk-card');
          if (cards[index]) cards[index].click();
          return;
        }

        const spellMap = { Digit1: 'PYRO', Digit2: 'CRYO', Digit3: 'ELECTRO', Digit4: 'VENOM' };
        const spellKey = spellMap[e.code];
        if (spellKey) {
          this.setSpellActive(spellKey);
          if (this.onSpellChange) this.onSpellChange(spellKey);
        }
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
    const xpPct = Math.min(100, (progress / range) * 100);
    this.xpFillEl.style.width = `${xpPct}%`;
    this.lvlTextEl.textContent = `Lv ${player.level} ${player.currentSpell.name}`;
  }

  showPerkCards(level) {
    this.perkOverlay.innerHTML = '';
    const shuffled = [...PERK_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);

    shuffled.forEach((perk, idx) => {
      const card = document.createElement('div');
      card.className = 'perk-card';
      card.innerHTML = `
        <div class="perk-title">(${idx + 1}) ${perk.title}</div>
        <div class="perk-desc">${perk.desc}</div>
      `;
      card.addEventListener('click', () => {
        this.perkOverlay.style.display = 'none';
        if (this.onPerkSelected) this.onPerkSelected(perk);
      });
      this.perkOverlay.appendChild(card);
    });

    this.perkOverlay.style.display = 'flex';
  }

  showEndGame(isVictory, place) {
    const results = this.meta.applyMatchResults(place);

    this.endModal.style.display = 'flex';
    if (isVictory) {
      this.endTitle.textContent = '#1 VICTORY ROYALE!';
      this.endTitle.style.color = '#fbbf24';
      this.endSubtitle.textContent = `You conquered the Sanctum! New Rank: ${results.rank.title}`;
    } else {
      this.endTitle.textContent = `DEFEAT - #${place}`;
      this.endTitle.style.color = '#ef4444';
      this.endSubtitle.textContent = `Fallen in combat. Current Rank: ${results.rank.title}`;
    }

    const tSign = results.trophyChange >= 0 ? `+${results.trophyChange}` : `${results.trophyChange}`;
    this.rewardTrophy.textContent = `${tSign} 🏆 (${results.newTrophies})`;
    this.rewardGold.textContent = `+${results.goldEarned} 🪙 (${results.newGold})`;
  }
}
