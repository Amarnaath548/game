import { HEROES, VALID_HERO_IDS, DEFAULT_UNLOCKED_HEROES } from '../config/constants.js';
import { LEVELS } from '../config/levels.js';

const HERO_IMG = {
  tapasvi: 'hero_tapasvi.webp',
  jala: 'hero_jala.webp',
  prithvi: 'hero_prithvi.webp',
  agni: 'hero_agni.png'
};

export class LobbyShell {
  constructor(uiManager, campaignManager, meta) {
    this.ui = uiManager;
    this.campaign = campaignManager;
    this.meta = meta;
    this.toastTimer = null;

    this.stage = document.getElementById('lobby-stage');
    this.preloader = document.getElementById('lobby-preloader');
    this.heroImg = document.getElementById('lobby-hero-img');
    this.heroLockBadge = document.getElementById('lobby-hero-lock');
    this.sheetOverlay = document.getElementById('lobby-sheet-overlay');
    this.sheetTitle = document.getElementById('lobby-sheet-title');
    this.nextLevelNameEl = document.getElementById('lobby-next-level-name');
    this.nextMapThumb = document.getElementById('lobby-next-map-thumb');
    this.settingsPopover = document.getElementById('settings-popover');
    this.toastEl = document.getElementById('lobby-toast');

    this.displayedHeroId = this.getSelectedHeroId();
    this.lastUnlockedHeroId = this.displayedHeroId;

    this.initScaling();
    this.preloadImages();
    this.bindEvents();
    this.render();
  }

  initScaling() {
    const scale = () => {
      if (!this.stage) return;
      const s = Math.min(window.innerWidth / 1024, window.innerHeight / 572);
      this.stage.style.transform = `translate(-50%, -50%) scale(${s})`;
    };
    scale();
    window.addEventListener('resize', scale);
    window.addEventListener('orientationchange', scale);
  }

  preloadImages() {
    const images = [
      './lobby/bg_lobby.webp', './lobby/pedestal.png',
      './lobby/icon_trophy.png', './lobby/icon_gold.png', './lobby/icon_gem.png',
      './lobby/icon_quests.png', './lobby/icon_granth.png', './lobby/icon_settings.png',
      './lobby/icon_heroes.png', './lobby/icon_staves.png', './lobby/icon_upgrades.png',
      './lobby/map_grass.png', './lobby/map_snow.png'
    ];
    let loadedCritical = 0;
    const onCriticalLoad = () => {
      loadedCritical++;
      if (loadedCritical >= 2 && this.preloader) {
        this.preloader.classList.add('hidden');
      }
    };
    const bg = new Image();
    bg.onload = onCriticalLoad;
    bg.onerror = onCriticalLoad;
    bg.src = './lobby/bg_lobby.webp';

    const initialHero = HERO_IMG[this.displayedHeroId] || HERO_IMG.tapasvi;
    const hero = new Image();
    hero.onload = onCriticalLoad;
    hero.onerror = onCriticalLoad;
    hero.src = `./lobby/${initialHero}`;

    Object.values(HERO_IMG).forEach((file) => {
      const img = new Image();
      img.src = `./lobby/${file}`;
    });

    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    setTimeout(() => { this.preloader?.classList.add('hidden'); }, 1200);
  }

  bindEvents() {
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

    if (this.heroLockBadge) {
      this.heroLockBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        this.unlockCurrentHero();
      });
    }

    document.querySelectorAll('.bottom-tab-btn').forEach((tab) => {
      tab.addEventListener('click', () => this.showToast('Coming soon'));
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
    let idx = HEROES.findIndex((h) => h.id === this.displayedHeroId);
    if (idx === -1) idx = 0;
    idx = (idx + dir + HEROES.length) % HEROES.length;
    const nextHero = HEROES[idx];
    this.displayedHeroId = nextHero.id;

    const unlocked = this.getUnlockedHeroes();
    const isUnlocked = unlocked.includes(nextHero.id);
    if (isUnlocked) {
      localStorage.setItem('magica_selected_hero', nextHero.id);
      this.lastUnlockedHeroId = nextHero.id;
      this.ui?.onHeroChange?.(nextHero);
      this.ui?.heroSelectView?.render(nextHero.id);
    }
    this.updateHeroDisplay();
  }

  unlockCurrentHero() {
    const hero = HEROES.find((h) => h.id === this.displayedHeroId);
    if (!hero) return;
    if (this.meta.data.gold >= 150) {
      this.meta.data.gold -= 150;
      this.meta.save();
      const unlocked = this.getUnlockedHeroes();
      if (!unlocked.includes(hero.id)) unlocked.push(hero.id);
      localStorage.setItem('magica_unlocked_heroes', JSON.stringify(unlocked));
      localStorage.setItem('magica_selected_hero', hero.id);
      this.lastUnlockedHeroId = hero.id;
      this.ui?.renderLobby();
      this.ui?.onHeroChange?.(hero);
      this.showToast(`Unlocked ${hero.name}!`);
    } else {
      this.showToast('Need 150 Gold to unlock');
    }
  }

  updateHeroDisplay() {
    const hero = HEROES.find((h) => h.id === this.displayedHeroId) || HEROES[0];
    const isUnlocked = this.getUnlockedHeroes().includes(hero.id);
    const heroFile = HERO_IMG[hero.id] || HERO_IMG.tapasvi;

    if (this.heroImg) {
      this.heroImg.classList.add('fading');
      setTimeout(() => {
        this.heroImg.src = `./lobby/${heroFile}`;
        this.heroImg.classList.toggle('locked-dim', !isUnlocked);
        this.heroImg.classList.remove('fading');
      }, 150);
    }
    if (this.heroLockBadge) {
      this.heroLockBadge.style.display = isUnlocked ? 'none' : 'block';
    }
  }

  updateNextLevelDisplay() {
    if (!this.nextLevelNameEl) return;
    let nextLvl = LEVELS[0];
    if (this.campaign) {
      const found = LEVELS.find((l) => this.campaign.isUnlocked(l.id) && this.campaign.getStars(l.id) < 3);
      if (found) nextLvl = found;
    }
    const isSnow = nextLvl.biome === 'SNOW';
    this.nextLevelNameEl.textContent = isSnow ? 'FROZEN PEAKS' : 'GRASS PLAINS';
    if (this.nextMapThumb) {
      this.nextMapThumb.src = isSnow ? './lobby/map_snow.png' : './lobby/map_grass.png';
    }
  }

  openPanel(panelKey) {
    const titleMap = {
      heroes: 'HEROES', staves: 'STAVES', upgrades: 'UPGRADES',
      quests: 'DAILY QUESTS', spellbook: 'THE GRANTH'
    };
    if (this.sheetTitle) this.sheetTitle.textContent = titleMap[panelKey] || 'MENU';
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById(`tab-${panelKey}`)?.classList.add('active');
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

  stopHeroShowcase() {}
  startHeroShowcase() {}

  render() {
    this.updateHeroDisplay();
    this.updateNextLevelDisplay();
  }
}
