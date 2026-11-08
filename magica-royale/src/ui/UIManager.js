import { LEVEL_TABLE } from '../config/constants.js';

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
  constructor(onSpellChange, onPerkSelected) {
    this.aliveCountEl = document.getElementById('alive-count');
    this.zoneStatusEl = document.getElementById('zone-status');
    this.hpFillEl = document.getElementById('hp-fill');
    this.xpFillEl = document.getElementById('xp-fill');
    this.lvlTextEl = document.getElementById('player-lvl-text');
    this.hpTextEl = document.getElementById('player-hp-text');
    this.perkOverlay = document.getElementById('perk-overlay');
    this.endModal = document.getElementById('end-modal');
    this.endTitle = document.getElementById('end-title');
    this.endSubtitle = document.getElementById('end-subtitle');

    this.onSpellChange = onSpellChange;
    this.onPerkSelected = onPerkSelected;

    this.initSpellButtons();
    this.initKeyboardShortcuts();
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

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        // If perks are showing, 1,2,3 choose perk
        if (this.perkOverlay.style.display === 'flex' && e.code !== 'Digit4') {
          const index = parseInt(e.code.replace('Digit', ''), 10) - 1;
          const cards = this.perkOverlay.querySelectorAll('.perk-card');
          if (cards[index]) cards[index].click();
          return;
        }

        // Otherwise switch spell
        const spellMap = { Digit1: 'PYRO', Digit2: 'CRYO', Digit3: 'ELECTRO', Digit4: 'VENOM' };
        const spellKey = spellMap[e.code];
        if (spellKey) {
          const buttons = document.querySelectorAll('.spell-btn');
          buttons.forEach((b) => {
            b.classList.toggle('active', b.dataset.spell === spellKey);
          });
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

    // Health
    const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
    this.hpFillEl.style.width = `${hpPct}%`;
    this.hpTextEl.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

    // XP
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
    // Shuffle and pick 3 perks
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
    this.endModal.style.display = 'flex';
    if (isVictory) {
      this.endTitle.textContent = '#1 VICTORY ROYALE!';
      this.endTitle.style.color = '#fbbf24';
      this.endSubtitle.textContent = 'You conquered the Sanctum!';
    } else {
      this.endTitle.textContent = `DEFEAT - #${place}`;
      this.endTitle.style.color = '#ef4444';
      this.endSubtitle.textContent = 'Fallen in combat. Better luck next match!';
    }
  }
}

