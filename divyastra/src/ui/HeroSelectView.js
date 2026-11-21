import { HEROES, VALID_HERO_IDS, DEFAULT_UNLOCKED_HEROES } from '../config/constants.js';

export function getSilhouetteClass(hero) {
  const arch = (hero.archetype || hero.hatType || '').toLowerCase();
  if (arch.includes('tapasvi') || arch.includes('jata')) return 'sil-tapasvi';
  if (arch.includes('agni') || arch.includes('flame') || arch.includes('wizard')) return 'sil-agni';
  if (arch.includes('jala') || arch.includes('turban') || arch.includes('hood')) return 'sil-jala';
  if (arch.includes('prithvi') || arch.includes('circlet') || arch.includes('helmet') || arch.includes('horn')) return 'sil-prithvi';
  return 'sil-tapasvi';
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
    // Filter out removed hero ids so old saves don't break
    const unlockedHeroes = rawUnlocked.filter((id) => VALID_HERO_IDS.includes(id));
    if (!unlockedHeroes.includes('tapasvi')) unlockedHeroes.push('tapasvi');

    // Sanitise selected hero — fall back to 'tapasvi' if the saved id no longer exists
    const safeSelected = VALID_HERO_IDS.includes(selectedHeroId) ? selectedHeroId : 'tapasvi';

    HEROES.forEach((hero) => {
      const isSelected = hero.id === safeSelected;
      const isUnlocked = unlockedHeroes.includes(hero.id);

      const card = document.createElement('div');
      card.className = `hero-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;

      const bodyHex = '#' + hero.bodyColor.toString(16).padStart(6, '0');
      const accentHex = '#' + hero.accentColor.toString(16).padStart(6, '0');
      const silClass = getSilhouetteClass(hero);

      card.innerHTML = `
        <div class="hero-preview-box">
          <div class="hero-avatar ${silClass}" style="--accent: ${accentHex}; --body: ${bodyHex};">
            <div class="avatar-headgear"></div>
            <div class="hero-head">
              <div class="hero-nose"></div>
            </div>
            <div class="hero-body" style="background: ${bodyHex}; border-color: ${accentHex};"></div>
            <div class="avatar-orb" style="background: ${accentHex};"></div>
          </div>
        </div>
        <div class="hero-card-content">
          <div class="hero-name">${hero.name}</div>
          <div class="hero-traits">${hero.archetype || 'SEEKER'} • ${hero.extra.replace('_', ' ')}</div>
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
