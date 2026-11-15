export const PERK_POOL = [
  { id: 'TWIN_CAST', title: 'Twin Cast', desc: '+1 Projectile per shot (-15% damage)' },
  { id: 'GIANT_ARCANA', title: 'Giant Arcana', desc: '+40% Projectile AoE & blast size' },
  { id: 'SNIPER_VELOCITY', title: 'Sniper Velocity', desc: '+35% Projectile speed & range' },
  { id: 'VAMPIRIC_SOUL', title: 'Vampiric Soul', desc: 'Heal for 20% of damage dealt' },
  { id: 'WINDWALKER', title: 'Windwalker', desc: '+20% Move Speed, -1s Dash CD' },
  { id: 'ARCANE_SHIELD', title: 'Arcane Shield', desc: 'Absorbs next incoming hit' },
  { id: 'EXECUTIONER', title: 'Executioner', desc: '+35% Damage to enemies below 40% HP' }
];

export function renderPerkSelection(container, onPerkSelected) {
  container.innerHTML = '';
  const shuffled = [...PERK_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
  shuffled.forEach((perk, idx) => {
    const card = document.createElement('div');
    card.className = 'perk-card';
    card.innerHTML = `<div class="perk-title">(${idx + 1}) ${perk.title}</div><div class="perk-desc">${perk.desc}</div>`;
    card.addEventListener('click', () => {
      container.style.display = 'none';
      if (onPerkSelected) onPerkSelected(perk);
    });
    container.appendChild(card);
  });
  container.style.display = 'flex';
}
