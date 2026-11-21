const STAFF_NAME_MAP = {
  'Agni Danda': 'staff_agni',
  'Jala Danda': 'staff_jala',
  'Prithvi Danda': 'staff_prithvi',
  'Naga Danda': 'staff_naga',
  'Vayu Danda': 'staff_vayu',
  'Surya Danda': 'staff_surya',
  'Akasha Danda': 'staff_akasha',
  'Kavacha Danda': 'staff_kavacha'
};

export function getStaffIconPath(staff) {
  const name = staff?.name || '';
  if (STAFF_NAME_MAP[name]) {
    return `./lobby/${STAFF_NAME_MAP[name]}.webp`;
  }
  const n = name.toLowerCase();
  if (n.includes('agni')) return './lobby/staff_agni.webp';
  if (n.includes('jala')) return './lobby/staff_jala.webp';
  if (n.includes('prithvi')) return './lobby/staff_prithvi.webp';
  if (n.includes('naga')) return './lobby/staff_naga.webp';
  if (n.includes('vayu')) return './lobby/staff_vayu.webp';
  if (n.includes('surya')) return './lobby/staff_surya.webp';
  if (n.includes('akasha')) return './lobby/staff_akasha.webp';
  if (n.includes('kavacha')) return './lobby/staff_kavacha.webp';
  return './lobby/icon_staves.png';
}

export class StaffChip {
  constructor(meta, onOpenStaves) {
    this.meta = meta;
    this.chip = document.getElementById('lobby-staff-chip');
    this.icon = document.getElementById('lobby-staff-chip-icon');
    this.perk = document.getElementById('lobby-staff-chip-perk');

    if (this.chip && onOpenStaves) {
      this.chip.addEventListener('click', (e) => {
        e.stopPropagation();
        onOpenStaves();
      });
      this.chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onOpenStaves();
        }
      });
    }
    this.update();
  }

  update() {
    if (!this.meta) return;
    const staff = this.meta.getSelectedStaff?.();
    if (!staff) return;

    if (this.icon) {
      this.icon.src = getStaffIconPath(staff);
      this.icon.onerror = () => {
        this.icon.src = './lobby/icon_staves.png';
      };
    }
    if (this.perk) {
      this.perk.textContent = staff.perkDesc || '';
    }
  }
}
