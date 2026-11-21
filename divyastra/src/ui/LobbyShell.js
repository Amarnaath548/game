import { HEROES, VALID_HERO_IDS, DEFAULT_UNLOCKED_HEROES } from '../config/constants.js';
import { LEVELS } from '../config/levels.js';
import { getSilhouetteClass } from './HeroSelectView.js';

export class LobbyShell {
  constructor(uiManager, campaignManager, meta) {
    this.ui = uiManager;
    this.campaign = campaignManager;
    this.meta = meta;
    this.toastTimer = null;
    this.sheetOverlay = document.getElementById('lobby-sheet-overlay');
    this.sheetTitle = document.getElementById('lobby-sheet-title');
    this.avatarBox = document.getElementById('lobby-hero-avatar-box');
    this.heroNameEl = document.getElementById('lobby-hero-name');
    this.heroSchoolEl = document.getElementById('lobby-hero-school');
    this.nextLevelNameEl = document.getElementById('lobby-next-level-name');
    this.nextBiomeChipEl = document.getElementById('lobby-next-biome-chip');
    this.toastEl = document.getElementById('lobby-toast');
    this.settingsPopover = document.getElementById('settings-popover');
    this._bindEvents();
  }

  _bindEvents() {
    const gearBtn = document.getElementById('settings-gear-btn');
    if (gearBtn && this.settingsPopover) {
      gearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = this.settingsPopover.style.display === 'none';
        this.settingsPopover.style.display = isHidden ? 'flex' : 'none';
      });
      document.addEventListener('click', (e) => {
        if (!this.settingsPopover.contains(e.target) && e.target !== gearBtn) {
          this.settingsPopover.style.display = 'none';
        }
      });
    }

    document.querySelectorAll('[data-panel]').forEach((btn) => {
      btn.addEventListener('click', () => this.openPanel(btn.dataset.panel));
    });

    const closeBtn = document.getElementById('lobby-sheet-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closePanel());

    if (this.sheetOverlay) {
      this.sheetOverlay.addEventListener('click', (e) => {
        if (e.target === this.sheetOverlay) this.closePanel();
      });
    }

    const prevBtn = document.getElementById('hero-cycle-prev');
    const nextBtn = document.getElementById('hero-cycle-next');
    if (prevBtn) prevBtn.addEventListener('click', () => this.cycleHero(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.cycleHero(1));

    document.querySelectorAll('.lobby-mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        if (mode === 'campaign') {
          if (this.ui?.levelSelectView) this.ui.levelSelectView.show();
        } else {
          this.showToast('Coming soon');
        }
      });
    });
  }

  getUnlockedHeroes() {
    const saved = localStorage.getItem('magica_unlocked_heroes');
    const raw = saved ? JSON.parse(saved) : DEFAULT_UNLOCKED_HEROES;
    const unlocked = raw.filter((id) => VALID_HERO_IDS.includes(id));
    if (!unlocked.includes('tapasvi')) unlocked.push('tapasvi');
    return unlocked;
  }

  getSelectedHeroId() {
    const raw = localStorage.getItem('magica_selected_hero') || 'tapasvi';
    const unlocked = this.getUnlockedHeroes();
    return (VALID_HERO_IDS.includes(raw) && unlocked.includes(raw)) ? raw : unlocked[0];
  }

  cycleHero(dir) {
    const unlocked = this.getUnlockedHeroes();
    if (!unlocked.length) return;
    const cur = this.getSelectedHeroId();
    let idx = unlocked.indexOf(cur);
    if (idx === -1) idx = 0;
    idx = (idx + dir + unlocked.length) % unlocked.length;
    const nextId = unlocked[idx];
    localStorage.setItem('magica_selected_hero', nextId);

    const hero = HEROES.find((h) => h.id === nextId);
    if (hero) {
      this.updateHeroDisplay();
      if (this.ui?.onHeroChange) this.ui.onHeroChange(hero);
      if (this.ui?.heroSelectView) this.ui.heroSelectView.render(nextId);
    }
  }

  updateHeroDisplay() {
    const curId = this.getSelectedHeroId();
    const hero = HEROES.find((h) => h.id === curId) || HEROES[0];
    if (!hero || !this.avatarBox) return;

    const bodyHex = '#' + hero.bodyColor.toString(16).padStart(6, '0');
    const accentHex = '#' + hero.accentColor.toString(16).padStart(6, '0');
    const silClass = getSilhouetteClass(hero);

    this.avatarBox.innerHTML = `
      <div class="hero-avatar ${silClass} center-hero-scale" style="--accent: ${accentHex}; --body: ${bodyHex};">
        <div class="avatar-headgear"></div>
        <div class="hero-head"><div class="hero-nose"></div></div>
        <div class="hero-body" style="background: ${bodyHex}; border-color: ${accentHex};"></div>
        <div class="avatar-orb" style="background: ${accentHex};"></div>
      </div>
    `;

    if (this.heroNameEl) this.heroNameEl.textContent = hero.name;
    if (this.heroSchoolEl) this.heroSchoolEl.textContent = (hero.archetype || 'SEEKER').toUpperCase();
  }

  updateNextLevelDisplay() {
    if (!this.nextLevelNameEl) return;
    let nextLvl = LEVELS[0];
    if (this.campaign) {
      const found = LEVELS.find((l) => this.campaign.isUnlocked(l.id) && this.campaign.getStars(l.id) < 3);
      if (found) nextLvl = found;
    }
    this.nextLevelNameEl.textContent = nextLvl.name;
    if (this.nextBiomeChipEl) {
      const isSnow = nextLvl.biome === 'SNOW';
      this.nextBiomeChipEl.textContent = isSnow ? 'Snow' : 'Grass';
      this.nextBiomeChipEl.className = `biome-chip ${isSnow ? 'snow' : 'grass'}`;
    }
  }

  openPanel(panelKey) {
    const titleMap = {
      heroes: 'HEROES',
      staves: 'STAVES',
      upgrades: 'UPGRADES',
      quests: 'DAILY QUESTS',
      spellbook: 'THE GRANTH'
    };
    if (this.sheetTitle) this.sheetTitle.textContent = titleMap[panelKey] || 'MENU';
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    const target = document.getElementById(`tab-${panelKey}`);
    if (target) target.classList.add('active');
    if (this.sheetOverlay) this.sheetOverlay.style.display = 'flex';
    this.ui?.renderLobby();
  }

  closePanel() {
    if (this.sheetOverlay) this.sheetOverlay.style.display = 'none';
    this.render();
  }

  showToast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 1600);
  }

  render() {
    this.updateHeroDisplay();
    this.updateNextLevelDisplay();
  }
}
