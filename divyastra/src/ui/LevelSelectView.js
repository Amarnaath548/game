import { LEVELS } from '../config/levels.js';
import { DIFFICULTIES } from '../config/difficulty.js';
import { BIOMES } from '../config/constants.js';
import { iconLock, iconMap, iconSwords, iconChevronLeft, iconChevronRight, renderStars } from './icons.js';

const BIOME_THUMB = {
  GRASS: './lobby/map_grass.png',
  SNOW: './lobby/map_snow.png',
  DESERT: './lobby/map_desert.png',
  AUTUMN: './lobby/map_autumn.png'
};

export class LevelSelectView {
  constructor(campaignManager, callbacks = {}) {
    this.campaignManager = campaignManager;
    this.callbacks = callbacks;
    this.overlay = null;
    this._initDOM();
  }

  _initDOM() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'level-select-overlay';

    const header = document.createElement('div');
    header.className = 'level-select-header';

    const backBtn = document.createElement('button');
    backBtn.className = 'level-back-btn';
    backBtn.innerHTML = `${iconChevronLeft(15)}<span>BACK</span>`;
    backBtn.onclick = () => {
      this.hide();
      this.callbacks.onBack?.();
    };

    const titleBox = document.createElement('div');
    titleBox.style.cssText = 'text-align: center;';
    titleBox.innerHTML = `
      <div class="level-select-title">CAMPAIGN MISSIONS</div>
      <div class="level-select-sub">Select a trial to prove your mastery</div>
    `;

    const dummyRight = document.createElement('div');
    dummyRight.style.width = '76px';

    header.appendChild(backBtn);
    header.appendChild(titleBox);
    header.appendChild(dummyRight);
    this.overlay.appendChild(header);

    const rowWrap = document.createElement('div');
    rowWrap.className = 'level-row-wrap';

    this.leftBtn = document.createElement('button');
    this.leftBtn.className = 'level-scroll-btn left';
    this.leftBtn.setAttribute('aria-label', 'Scroll left');
    this.leftBtn.innerHTML = iconChevronLeft(16);
    this.leftBtn.onclick = () => this.cardsContainer.scrollBy({ left: -240, behavior: 'smooth' });

    this.rightBtn = document.createElement('button');
    this.rightBtn.className = 'level-scroll-btn right';
    this.rightBtn.setAttribute('aria-label', 'Scroll right');
    this.rightBtn.innerHTML = iconChevronRight(16);
    this.rightBtn.onclick = () => this.cardsContainer.scrollBy({ left: 240, behavior: 'smooth' });

    this.cardsContainer = document.createElement('div');
    this.cardsContainer.className = 'level-cards-row';
    this.cardsContainer.addEventListener('scroll', () => this._updateScrollButtons());

    rowWrap.appendChild(this.leftBtn);
    rowWrap.appendChild(this.cardsContainer);
    rowWrap.appendChild(this.rightBtn);
    this.overlay.appendChild(rowWrap);
    document.body.appendChild(this.overlay);
  }

  _updateScrollButtons() {
    if (!this.cardsContainer) return;
    const { scrollLeft, scrollWidth, clientWidth } = this.cardsContainer;
    this.leftBtn.disabled = scrollLeft <= 2;
    this.rightBtn.disabled = scrollLeft + clientWidth >= scrollWidth - 2;
  }

  show() {
    this.render();
    this.overlay.style.display = 'flex';
    const targetId = this.campaignManager.currentLevelId
      || (typeof this.campaignManager.data?.unlocked === 'number' ? this.campaignManager.data.unlocked : null)
      || LEVELS.filter((l) => this.campaignManager.isUnlocked(l.id)).pop()?.id
      || 1;
    const targetCard = this.cardsContainer.querySelector(`[data-level-id="${targetId}"]`);
    requestAnimationFrame(() => {
      targetCard?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
      this._updateScrollButtons();
    });
  }

  hide() {
    this.overlay.style.display = 'none';
  }

  render() {
    this.cardsContainer.innerHTML = '';

    LEVELS.forEach((level) => {
      const unlocked = this.campaignManager.isUnlocked(level.id);
      const stars = this.campaignManager.getStars(level.id);
      const diff = DIFFICULTIES[level.difficulty] || DIFFICULTIES.NORMAL;
      const mapName = (BIOMES[level.biome] || BIOMES.GRASS).name;
      const thumbSrc = BIOME_THUMB[level.biome] || BIOME_THUMB.GRASS;

      const card = document.createElement('div');
      card.className = `level-card dv-panel ${unlocked ? 'unlocked' : 'locked'}`;
      card.dataset.levelId = String(level.id);

      if (unlocked) {
        card.onclick = () => {
          this.hide();
          this.campaignManager.startLevel(level.id);
          this.callbacks.onLevelSelected?.(level);
        };
      }

      card.innerHTML = `
        <div class="level-card-inner">
          <div>
            <div class="level-card-banner">
              <img src="${thumbSrc}" alt="${mapName}" />
              ${!unlocked ? `<div class="level-lock-badge">${iconLock(24)}</div>` : ''}
            </div>
            <div class="level-card-body">
              <div style="font-size:10px; font-weight:700; color:#E3B04B; text-transform:uppercase; letter-spacing:1px;">Level ${level.id}</div>
              <div style="font-family:'Yatra One',cursive,sans-serif; font-size:17px; color:#EFE6D2; margin:2px 0 5px;">${level.name}</div>
              <div style="display:inline-block; background:${diff.badgeColor}; color:#15172B; font-weight:700; font-size:10px; padding:2px 8px; border-radius:999px; margin-bottom:7px; text-transform:uppercase;">${diff.name}</div>
              <div style="font-size:11px; font-weight:700; color:#EFE6D2; margin-bottom:3px; display:flex; align-items:center; justify-content:center; gap:4px;">${iconMap(13)} ${mapName}</div>
              <div style="font-size:11px; font-weight:700; color:#B9AE98; margin-bottom:6px; display:flex; align-items:center; justify-content:center; gap:4px;">${iconSwords(13)} ${level.botCount} Bots</div>
              <div class="level-card-desc">${level.description}</div>
            </div>
          </div>
          <div class="level-card-footer">
            <div style="margin-bottom:4px; color:#E3B04B; display:flex; justify-content:center; gap:3px;">${renderStars(stars, 3, 15)}</div>
            <div style="font-size:9.5px; font-weight:700; color:#E08A2E; text-transform:uppercase;">Goal: Top ${level.completeRank}</div>
          </div>
        </div>
      `;

      this.cardsContainer.appendChild(card);
    });
  }
}
