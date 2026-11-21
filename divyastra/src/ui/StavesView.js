import { STAVES } from '../core/MetaProgression.js';

const STAFF_ICON_ID_MAP = {
  PYRO_STAFF: 'agni',
  CRYO_STAFF: 'jala',
  ELECTRO_STAFF: 'prithvi',
  VENOM_STAFF: 'naga',
  PIERCE_STAFF: 'vayu',
  BLAST_STAFF: 'surya',
  HOMING_STAFF: 'akasha',
  SHIELD_STAFF: 'kavacha',
  agni: 'agni',
  jala: 'jala',
  prithvi: 'prithvi',
  naga: 'naga',
  vayu: 'vayu',
  surya: 'surya',
  akasha: 'akasha',
  kavacha: 'kavacha'
};

const VALID_STAFF_ICON_IDS = ['agni', 'jala', 'prithvi', 'naga', 'vayu', 'surya', 'akasha', 'kavacha'];

export function getStaffIconSrc(staffId) {
  const mapped = STAFF_ICON_ID_MAP[staffId] || staffId;
  if (VALID_STAFF_ICON_IDS.includes(mapped)) {
    return `./lobby/staff_${mapped}.webp`;
  }
  return './lobby/icon_staves.png';
}

export class StavesView {
  constructor(container, metaProgression, onUpdate) {
    this.container = container;
    this.meta = metaProgression;
    this.onUpdate = onUpdate;
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    STAVES.forEach((staff) => {
      const isUnlocked = this.meta.data.unlockedStaves.includes(staff.id);
      const isSelected = this.meta.data.selectedStaffId === staff.id;
      const canAfford = this.meta.data.gold >= staff.cost;
      const accentHex = '#' + staff.colorHex.toString(16).padStart(6, '0');
      const iconSrc = getStaffIconSrc(staff.id);

      const card = document.createElement('div');
      card.className = `staff-card ${isSelected ? 'selected equipped' : isUnlocked ? 'owned' : 'locked'}`;
      card.style.background = `radial-gradient(circle at 50% 36px, ${accentHex}2a 0%, transparent 68%), linear-gradient(180deg, #131d36 0%, #0a1020 100%)`;

      let btnHtml;
      if (isSelected) {
        btnHtml = `<button class="staff-action-btn btn-equipped" disabled>EQUIPPED</button>`;
      } else if (isUnlocked) {
        btnHtml = `<button class="staff-action-btn btn-equip btn-select">EQUIP</button>`;
      } else if (canAfford) {
        btnHtml = `<button class="staff-action-btn btn-unlock">UNLOCK (${staff.cost} <img src="./lobby/icon_gold.png" class="btn-coin" alt="🪙" />)</button>`;
      } else {
        btnHtml = `<button class="staff-action-btn btn-unlock btn-unaffordable" disabled>UNLOCK (<span class="price-unaffordable">${staff.cost}</span> <img src="./lobby/icon_gold.png" class="btn-coin" alt="🪙" />)</button>`;
      }

      card.innerHTML = `
        <div class="staff-icon-wrap">
          <div class="staff-icon-glow" style="background: radial-gradient(circle, ${accentHex}80 0%, ${accentHex}00 70%);"></div>
          <img src="${iconSrc}" alt="${staff.name}" class="staff-icon-img" onerror="this.onerror=null;this.src='./lobby/icon_staves.png';" />
        </div>
        <div class="staff-name" style="color: ${accentHex};">${staff.name}</div>
        <div class="staff-desc">${staff.perkDesc}</div>
        ${btnHtml}
      `;

      const btn = card.querySelector('.staff-action-btn');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isSelected) return;
        if (isUnlocked) {
          this.meta.selectStaff(staff.id);
          this.onUpdate?.();
        } else if (this.meta.unlockStaff(staff.id)) {
          this.onUpdate?.();
        }
      });

      this.container.appendChild(card);
    });
  }
}
