import { HEROES, VALID_HERO_IDS, DEFAULT_UNLOCKED_HEROES, BIOMES } from '../config/constants.js';
import { LEVELS } from '../config/levels.js';
import { loadAndTrimHero, getHeroSrc } from './HeroImageTrim.js';
import { StaffChip } from './StaffChip.js';

const HERO_IMG = { tapasvi: 'hero_tapasvi.webp', jala: 'hero_jala.webp', prithvi: 'hero_prithvi.webp', agni: 'hero_agni.png' };

export class LobbyShell {
  constructor(uiManager, campaignManager, meta) {
    this.ui = uiManager; this.campaign = campaignManager; this.meta = meta;
    this.toastTimer = null; this.animTimer = null; this.isAnimating = false;
    this.queuedDir = null; this.activeLayerIdx = 0;

    const get = (id) => document.getElementById(id);
    this.stage = get('lobby-stage'); this.preloader = get('lobby-preloader');
    this.heroLayers = [get('lobby-hero-img-0'), get('lobby-hero-img-1')];
    this.heroLockBadge = get('lobby-hero-lock'); this.heroMeta = get('lobby-hero-meta');
    this.heroName = get('lobby-hero-name'); this.heroSchool = get('lobby-hero-school');
    this.sheetOverlay = get('lobby-sheet-overlay'); this.sheetTitle = get('lobby-sheet-title');
    this.nextLevelNameEl = get('lobby-next-level-name'); this.nextMapThumb = get('lobby-next-map-thumb');
    this.settingsPopover = get('settings-popover'); this.toastEl = get('lobby-toast');

    this.displayedHeroId = this.getSelectedHeroId();
    this.lastUnlockedHeroId = this.displayedHeroId;
    this.staffChip = new StaffChip(this.meta, () => this.openPanel('staves'));
    this.initScaling(); this.preloadImages(); this.bindEvents(); this.render();
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
      './lobby/bg_lobby.webp', './lobby/pedestal.png', './lobby/icon_trophy.png',
      './lobby/icon_gold.png', './lobby/icon_gem.png', './lobby/icon_quests.png',
      './lobby/icon_granth.png', './lobby/icon_settings.png', './lobby/icon_heroes.png',
      './lobby/icon_staves.png', './lobby/icon_upgrades.png', './lobby/map_grass.png', './lobby/map_snow.png', './lobby/map_desert.png', './lobby/map_autumn.png'
    ];
    let bgLoaded = false; let heroesPreloaded = false;
    const checkCritical = () => {
      if (bgLoaded && heroesPreloaded && this.preloader) this.preloader.classList.add('hidden');
    };
    const bg = new Image();
    bg.onload = bg.onerror = () => { bgLoaded = true; checkCritical(); };
    bg.src = './lobby/bg_lobby.webp';

    Promise.all(Object.entries(HERO_IMG).map(async ([id, file]) => {
      try {
        const src = await loadAndTrimHero(id, file);
        const img = new Image();
        img.src = src;
        await img.decode();
      } catch (_) {}
    })).then(() => {
      heroesPreloaded = true;
      this.updateHeroDisplay();
      checkCritical();
    });
    images.slice(2).forEach((src) => { const img = new Image(); img.src = src; });
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
        if (!this.settingsPopover.contains(e.target) && e.target !== gearBtn) this.settingsPopover.style.display = 'none';
      });
    }
    document.querySelectorAll('[data-panel]').forEach((btn) => {
      btn.addEventListener('click', () => this.openPanel(btn.dataset.panel));
    });
    document.getElementById('lobby-sheet-close')?.addEventListener('click', () => this.closePanel());
    if (this.sheetOverlay) {
      this.sheetOverlay.addEventListener('click', (e) => { if (e.target === this.sheetOverlay) this.closePanel(); });
    }
    document.getElementById('hero-cycle-prev')?.addEventListener('click', () => this.cycleHero(-1));
    document.getElementById('hero-cycle-next')?.addEventListener('click', () => this.cycleHero(1));
    if (this.heroLockBadge) {
      this.heroLockBadge.addEventListener('click', (e) => { e.stopPropagation(); this.unlockCurrentHero(); });
    }
    document.querySelectorAll('.bottom-tab-btn').forEach((tab) => {
      tab.addEventListener('click', () => this.showToast('Coming soon'));
    });
  }

  getUnlockedHeroes() {
    const saved = localStorage.getItem('magica_unlocked_heroes');
    const unlocked = (saved ? JSON.parse(saved) : DEFAULT_UNLOCKED_HEROES).filter((id) => VALID_HERO_IDS.includes(id));
    if (!unlocked.includes('tapasvi')) unlocked.push('tapasvi');
    return unlocked;
  }

  getSelectedHeroId() {
    const raw = localStorage.getItem('magica_selected_hero') || 'tapasvi';
    const unlocked = this.getUnlockedHeroes();
    return (VALID_HERO_IDS.includes(raw) && unlocked.includes(raw)) ? raw : unlocked[0];
  }

  async cycleHero(dir) {
    if (this.isAnimating) {
      this.queuedDir = dir;
      return;
    }
    let idx = HEROES.findIndex((h) => h.id === this.displayedHeroId);
    if (idx === -1) idx = 0;
    idx = (idx + dir + HEROES.length) % HEROES.length;
    const nextHero = HEROES[idx];
    const isUnlocked = this.getUnlockedHeroes().includes(nextHero.id);

    const heroFile = HERO_IMG[nextHero.id] || HERO_IMG.tapasvi;
    const heroSrc = getHeroSrc(nextHero.id, heroFile);
    const currentLayer = this.heroLayers[this.activeLayerIdx];
    const nextLayer = this.heroLayers[1 - this.activeLayerIdx];
    if (!currentLayer || !nextLayer) {
      this.displayedHeroId = nextHero.id;
      this.updateHeroDisplay();
      return;
    }

    nextLayer.src = heroSrc;
    try { await nextLayer.decode(); } catch (_) {}

    this.isAnimating = true;
    this.displayedHeroId = nextHero.id;
    if (isUnlocked) {
      localStorage.setItem('magica_selected_hero', nextHero.id);
      this.lastUnlockedHeroId = nextHero.id;
      this.ui?.onHeroChange?.(nextHero);
      this.ui?.heroSelectView?.render(nextHero.id);
    }
    if (this.heroLockBadge) this.heroLockBadge.style.display = isUnlocked ? 'none' : 'block';
    if (this.heroMeta) {
      this.heroMeta.classList.add('fading');
      setTimeout(() => {
        if (this.heroName) this.heroName.textContent = nextHero.name;
        if (this.heroSchool) this.heroSchool.textContent = nextHero.archetype || 'SEEKER';
        this.heroMeta.classList.remove('fading');
      }, 120);
    }

    const outClass = dir > 0 ? 'slide-out-left' : 'slide-out-right';
    const inClass = dir > 0 ? 'slide-in-right' : 'slide-in-left';
    currentLayer.className = `lobby-hero-img ${outClass}`;
    nextLayer.className = `lobby-hero-img ${inClass}${isUnlocked ? '' : ' locked-dim'}`;

    clearTimeout(this.animTimer);
    this.animTimer = setTimeout(() => {
      currentLayer.className = 'lobby-hero-img';
      nextLayer.className = `lobby-hero-img active${isUnlocked ? '' : ' locked-dim'}`;
      this.activeLayerIdx = 1 - this.activeLayerIdx;
      this.isAnimating = false;
      if (this.queuedDir !== null) {
        const queued = this.queuedDir;
        this.queuedDir = null;
        this.cycleHero(queued);
      }
    }, 220);
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
      this.updateHeroDisplay();
      this.showToast(`Unlocked ${hero.name}!`);
    } else {
      this.showToast('Need 150 Gold to unlock');
    }
  }

  updateHeroDisplay() {
    const hero = HEROES.find((h) => h.id === this.displayedHeroId) || HEROES[0];
    const isUnlocked = this.getUnlockedHeroes().includes(hero.id);
    const heroFile = HERO_IMG[hero.id] || HERO_IMG.tapasvi;
    const heroSrc = getHeroSrc(hero.id, heroFile);

    const activeLayer = this.heroLayers[this.activeLayerIdx];
    const hiddenLayer = this.heroLayers[1 - this.activeLayerIdx];
    if (activeLayer) {
      activeLayer.src = heroSrc;
      activeLayer.className = `lobby-hero-img active${isUnlocked ? '' : ' locked-dim'}`;
    }
    if (hiddenLayer) hiddenLayer.className = 'lobby-hero-img';
    if (this.heroLockBadge) this.heroLockBadge.style.display = isUnlocked ? 'none' : 'block';
    if (this.heroName) this.heroName.textContent = hero.name;
    if (this.heroSchool) this.heroSchool.textContent = hero.archetype || 'SEEKER';
  }

  updateNextLevelDisplay() {
    if (!this.nextLevelNameEl) return;
    let nextLvl = LEVELS[0];
    if (this.campaign) {
      const found = LEVELS.find((l) => this.campaign.isUnlocked(l.id) && this.campaign.getStars(l.id) < 3);
      if (found) nextLvl = found;
    }
    const biome = BIOMES[nextLvl.biome] || BIOMES.GRASS;
    this.nextLevelNameEl.textContent = biome.name.toUpperCase();
    if (this.nextMapThumb) this.nextMapThumb.src = `./lobby/map_${biome.id.toLowerCase()}.png`;
  }

  openPanel(panelKey) {
    const titleMap = { heroes: 'HEROES', staves: 'STAVES', upgrades: 'UPGRADES', quests: 'DAILY QUESTS', spellbook: 'THE GRANTH' };
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
  render() { this.updateHeroDisplay(); this.staffChip?.update(); this.updateNextLevelDisplay(); }
}
