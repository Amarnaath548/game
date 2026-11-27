import { HEROES, VALID_HERO_IDS, DEFAULT_UNLOCKED_HEROES } from '../config/constants.js';
import { iconGold, iconLock, iconCheck } from './icons.js';
import { loadAndTrimHero, getHeroSrc } from './HeroImageTrim.js';

const HERO_PORTRAITS = {
  tapasvi: { file: 'hero_tapasvi.webp', hex: '#E3B04B', rgb: '227, 176, 75' },
  agni: { file: 'hero_agni.png', hex: '#E4572E', rgb: '228, 87, 46', trim: true },
  jala: { file: 'hero_jala.webp', hex: '#2FB5C9', rgb: '47, 181, 201' },
  prithvi: { file: 'hero_prithvi.webp', hex: '#7FA650', rgb: '127, 166, 80' }
};

const HERO_UNLOCK_COST = 150;

function formatPerk(extra) {
  return (extra || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export class HeroSelectView {
  constructor(container, meta, onHeroChange) {
    this.container = container;
    this.meta = meta;
    this.onHeroChange = onHeroChange;
  }

  render(selectedHeroId) {
    if (!this.container) return;
    this.container.innerHTML = '';

    const savedUnlocked = localStorage.getItem('magica_unlocked_heroes');
    const rawUnlocked = savedUnlocked ? JSON.parse(savedUnlocked) : DEFAULT_UNLOCKED_HEROES;
    const unlockedHeroes = rawUnlocked.filter((id) => VALID_HERO_IDS.includes(id));
    if (!unlockedHeroes.includes('tapasvi')) unlockedHeroes.push('tapasvi');

    const safeSelected = VALID_HERO_IDS.includes(selectedHeroId) ? selectedHeroId : 'tapasvi';

    HEROES.forEach((hero) => {
      const isSelected = hero.id === safeSelected;
      const isUnlocked = unlockedHeroes.includes(hero.id);
      const canAfford = this.meta.data.gold >= HERO_UNLOCK_COST;
      const styleInfo = HERO_PORTRAITS[hero.id] || HERO_PORTRAITS.tapasvi;
      const imgSrc = styleInfo.trim
        ? getHeroSrc(hero.id, styleInfo.file)
        : `./lobby/${styleInfo.file}`;

      const card = document.createElement('div');
      card.className = `hero-card dv-panel ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
      card.style.setProperty('--hero-color', styleInfo.hex);
      card.style.setProperty('--hero-rgb', styleInfo.rgb);

      const actionHtml = isSelected
        ? `<button type="button" class="hero-btn hero-btn-selected" disabled>${iconCheck(14)}<span>SELECTED</span></button>`
        : isUnlocked
          ? `<button type="button" class="hero-btn hero-btn-select">SELECT</button>`
          : `<button type="button" class="hero-btn hero-btn-unlock ${canAfford ? '' : 'unaffordable'}" ${canAfford ? '' : 'disabled'}>${iconLock(13)}<span>${HERO_UNLOCK_COST}</span>${iconGold(13)}</button>`;

      card.innerHTML = `
        <div class="hero-portrait-bg">
          <img class="hero-portrait-img" src="${imgSrc}" alt="${hero.name}" draggable="false" />
        </div>
        ${!isUnlocked ? `<div class="hero-lock-pill">${iconLock(13)}<span>${HERO_UNLOCK_COST}</span>${iconGold(12)}</div>` : ''}
        <div class="hero-card-fade">
          <div class="hero-name">${hero.name}</div>
          <div class="hero-perk-row">
            <span class="hero-elem-dot"></span>
            <span class="hero-perk-text">${formatPerk(hero.extra)}</span>
          </div>
          ${actionHtml}
        </div>
      `;

      if (styleInfo.trim) {
        const imgEl = card.querySelector('.hero-portrait-img');
        loadAndTrimHero(hero.id, styleInfo.file).then((trimmedUrl) => {
          if (imgEl && imgEl.isConnected && trimmedUrl) imgEl.src = trimmedUrl;
        });
      }

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isSelected) return;
        if (isUnlocked) {
          localStorage.setItem('magica_selected_hero', hero.id);
          this.render(hero.id);
          if (this.onHeroChange) this.onHeroChange(hero);
        } else if (this.meta.data.gold >= HERO_UNLOCK_COST) {
          this.meta.data.gold -= HERO_UNLOCK_COST;
          this.meta.save();
          unlockedHeroes.push(hero.id);
          localStorage.setItem('magica_unlocked_heroes', JSON.stringify(unlockedHeroes));
          localStorage.setItem('magica_selected_hero', hero.id);
          this.render(hero.id);
          if (this.onHeroChange) this.onHeroChange(hero);
        }
      });

      this.container.appendChild(card);
    });
  }
}
