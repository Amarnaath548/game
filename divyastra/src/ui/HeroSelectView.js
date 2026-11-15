import { HEROES } from '../config/constants.js';

function getHatClass(hatType) {
  const h = (hatType || '').toLowerCase();
  if (h.includes('hat') || h.includes('wizard')) return 'hat-pointed_hat';
  if (h.includes('horn')) return 'hat-horns';
  if (h.includes('crown')) return 'hat-crown';
  if (h.includes('hood')) return 'hat-hood';
  if (h.includes('crest') || h.includes('helmet')) return 'hat-helmet';
  return 'hat-default';
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
    const unlockedHeroes = savedUnlocked ? JSON.parse(savedUnlocked) : ['ignis', 'glacia', 'volt', 'tox'];

    HEROES.forEach((hero) => {
      const isSelected = hero.id === selectedHeroId;
      const isUnlocked = unlockedHeroes.includes(hero.id);

      const card = document.createElement('div');
      card.className = `hero-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;

      const bodyHex = '#' + hero.bodyColor.toString(16).padStart(6, '0');
      const accentHex = '#' + hero.accentColor.toString(16).padStart(6, '0');
      const hatClass = getHatClass(hero.hatType);

      card.innerHTML = `
        <div class="hero-preview-box">
          <div class="hero-hat ${hatClass}" style="--accent: ${accentHex};"></div>
          <div class="hero-head">
            <div class="hero-eye"></div>
            <div class="hero-eye"></div>
          </div>
          <div class="hero-body" style="background: ${bodyHex}; border-color: ${accentHex};"></div>
        </div>
        <div class="hero-card-content">
          <div class="hero-name">${hero.name}</div>
          <div class="hero-traits">${hero.hatType.replace('_', ' ')} • ${hero.extra}</div>
          ${isSelected
            ? '<div class="hero-badge badge-active">SELECTED</div>'
            : isUnlocked
              ? '<button class="hero-btn-select">SELECT</button>'
              : `<button class="hero-btn-unlock" ${this.meta.data.gold >= 150 ? '' : 'disabled'}>UNLOCK (150 🪙)</button>`
          }
        </div>
      `;

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isSelected) return;
        if (isUnlocked) {
          localStorage.setItem('magica_selected_hero', hero.id);
          this.render(hero.id);
          if (this.onHeroChange) this.onHeroChange(hero);
        } else if (this.meta.data.gold >= 150) {
          this.meta.data.gold -= 150;
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
