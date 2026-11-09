import { HEROES } from '../config/constants.js';

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

      card.innerHTML = `
        <div class="hero-color-strip" style="background: linear-gradient(135deg, ${bodyHex}, ${accentHex});"></div>
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

