const PROJECTILE_TRAJECTORIES = ['LINEAR', 'SPREAD', 'LOBBED', 'WAVE'];

export const PERK_POOL = [
  {
    id: 'TWIN_CAST',
    title: 'Twin Cast',
    desc: '+1 Projectile per shot (-15% damage)',
    fits: (spell) => PROJECTILE_TRAJECTORIES.includes(spell?.trajectory)
  },
  {
    id: 'GIANT_ARCANA',
    title: 'Giant Arcana',
    desc: '+40% Projectile AoE & blast size',
    fits: () => true
  },
  {
    id: 'SNIPER_VELOCITY',
    title: 'Sniper Velocity',
    desc: '+35% Projectile speed & range',
    fits: (spell) => PROJECTILE_TRAJECTORIES.includes(spell?.trajectory)
  },
  {
    id: 'VAMPIRIC_SOUL',
    title: 'Vampiric Soul',
    desc: 'Heal for 20% of damage dealt',
    fits: () => true
  },
  {
    id: 'WINDWALKER',
    title: 'Windwalker',
    desc: '+20% Move Speed, -1s Dash CD',
    fits: () => true
  },
  {
    id: 'ARCANE_SHIELD',
    title: 'Arcane Shield',
    desc: 'Absorbs next incoming hit',
    fits: () => true
  },
  {
    id: 'EXECUTIONER',
    title: 'Executioner',
    desc: '+35% Damage to enemies below 40% HP',
    fits: () => true
  }
];

export function renderPerkSelection(container, onPick, player = null) {
  if (!container) return;
  container.innerHTML = '';
  const spell = player?.currentSpell;
  const taken = player?.perks || [];
  const available = PERK_POOL.filter((perk) => {
    if (taken.includes(perk.id)) return false;
    if (typeof perk.fits === 'function' && !perk.fits(spell)) return false;
    return true;
  });

  if (available.length === 0) {
    container.style.display = 'none';
    return;
  }

  const shuffled = [...available].sort(() => 0.5 - Math.random()).slice(0, 3);
  shuffled.forEach((perk, idx) => {
    const card = document.createElement('div');
    card.className = 'perk-card dv-panel';
    card.innerHTML = `<div class="perk-title">(${idx + 1}) ${perk.title}</div><div class="perk-desc">${perk.desc}</div>`;
    card.addEventListener('click', () => {
      container.style.display = 'none';
      if (onPick) onPick(perk);
    });
    container.appendChild(card);
  });
  container.style.display = 'flex';
}
