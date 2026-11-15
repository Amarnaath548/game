import * as THREE from 'three';

const BOT_NAMES = [
  'Aarav', 'Daksha', 'Kael', 'Rudra', 'Veda', 'Bhanu', 'Tejas', 'Nakul',
  'Kiran', 'Vidur', 'Deva', 'Ashoka', 'Taran', 'Madhav', 'Arun', 'Omkar',
  'Eklavya', 'Samir', 'Varun', 'Yash', 'Alok', 'Neel', 'Chetan', 'Dhruv',
  'Gautam', 'Ishan', 'Jai', 'Keshav', 'Manan', 'Naveen', 'Pranav', 'Rishi',
  'Sagar', 'Tanay', 'Utkarsh', 'Veer', 'Yuvraj', 'Aniket', 'Bhavin', 'Chinmay'
];

export class FloatingBarSystem {
  constructor(camera) {
    this.camera = camera;
    this.player = null;
    this.container = document.createElement('div');
    this.container.id = 'floating-bars-container';
    this.container.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:5;';
    document.body.appendChild(this.container);

    this.bars = new Map();
    this.projVec = new THREE.Vector3();
  }

  setPlayer(player) {
    this.player = player;
  }

  getOrCreateBar(actor) {
    let entry = this.bars.get(actor);
    if (!entry) {
      const el = document.createElement('div');
      el.className = 'actor-overhead';
      el.style.cssText = 'position:absolute;display:none;flex-direction:column;align-items:center;gap:2px;transform:translate(-50%,-100%);pointer-events:none;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;gap:4px;white-space:nowrap;';

      const lvl = document.createElement('span');
      lvl.className = 'overhead-lvl';
      lvl.style.cssText = 'font-size:9px;font-weight:900;color:#fff;background:rgba(15,23,42,0.92);padding:0 3px;border-radius:3px;border:1px solid #000;line-height:1.2;';

      const name = document.createElement('span');
      name.className = 'overhead-name';
      name.style.cssText = 'font-size:11px;font-weight:800;color:#f8fafc;text-shadow:0 1px 3px #000,0 0 2px #000;line-height:1.2;';

      header.appendChild(lvl);
      header.appendChild(name);
      el.appendChild(header);

      const bar = document.createElement('div');
      bar.className = 'overhead-bar';
      bar.style.cssText = 'display:flex;gap:2px;padding:1px;background:rgba(15,23,42,0.9);border:1.5px solid #000;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.7);width:56px;height:7px;box-sizing:border-box;';

      const segments = [];
      for (let i = 0; i < 8; i++) {
        const seg = document.createElement('div');
        seg.style.cssText = 'flex:1;height:100%;border-radius:1px;background:#22c55e;';
        bar.appendChild(seg);
        segments.push(seg);
      }
      el.appendChild(bar);

      this.container.appendChild(el);
      entry = { el, lvl, name, segments, state: { x: -999, y: -999, lvl: '', name: '', activeCount: -1, color: '', visible: false } };
      this.bars.set(actor, entry);
    }
    return entry;
  }

  ensureDisplayName(actor) {
    if (actor.isPlayer || actor === this.player) {
      if (!actor.displayName) {
        actor.displayName = actor.hero?.name || localStorage.getItem('magica_selected_hero') || 'Hero';
      }
      return;
    }
    if (!actor.displayName || actor.displayName.includes('_')) {
      const idx = (typeof actor.id === 'number' ? actor.id - 1 : Math.floor(Math.random() * BOT_NAMES.length)) % BOT_NAMES.length;
      actor.displayName = BOT_NAMES[(idx + BOT_NAMES.length) % BOT_NAMES.length];
      actor.name = actor.displayName;
    }
  }

  update(actors, playerRef = null, bushes = null) {
    const player = playerRef || this.player || actors.find((a) => a.isPlayer);
    if (player && !this.player) this.player = player;

    let targetActors = actors;
    if (player && !targetActors.includes(player)) {
      targetActors = [player, ...actors];
    }

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    targetActors.forEach((actor) => {
      this.ensureDisplayName(actor);
      const entry = this.getOrCreateBar(actor);
      const { el, lvl, name, segments, state } = entry;

      if (actor.isDead) {
        if (state.visible) { el.style.display = 'none'; state.visible = false; }
        return;
      }

      const isActorPlayer = actor.isPlayer || actor === player;
      if (player && !isActorPlayer) {
        const distSq = (actor.x - player.x) ** 2 + (actor.z - player.z) ** 2;
        if (distSq > 1225) { // 35 units
          if (state.visible) { el.style.display = 'none'; state.visible = false; }
          return;
        }
        if (actor.inBush || (bushes && bushes.some((b) => b.checkInside && b.checkInside(actor.x, actor.z)))) {
          if (state.visible) { el.style.display = 'none'; state.visible = false; }
          return;
        }
      }

      this.projVec.set(actor.x, 3.5, actor.z);
      this.projVec.project(this.camera);
      if (this.projVec.z > 1) {
        if (state.visible) { el.style.display = 'none'; state.visible = false; }
        return;
      }

      const screenX = Math.round((this.projVec.x * widthHalf) + widthHalf);
      const screenY = Math.round(-(this.projVec.y * heightHalf) + heightHalf);

      if (!state.visible) { el.style.display = 'flex'; state.visible = true; }
      if (state.x !== screenX) { el.style.left = `${screenX}px`; state.x = screenX; }
      if (state.y !== screenY) { el.style.top = `${screenY}px`; state.y = screenY; }

      const lvlText = `${actor.level || 1}`;
      if (state.lvl !== lvlText) { lvl.textContent = lvlText; state.lvl = lvlText; }

      const nameText = actor.displayName || 'Mage';
      if (state.name !== nameText) {
        name.textContent = nameText;
        name.style.color = isActorPlayer ? '#fde047' : '#ffffff';
        name.style.fontWeight = isActorPlayer ? '900' : '800';
        state.name = nameText;
      }

      const hpPct = Math.max(0, Math.min(100, (actor.hp / actor.maxHp) * 100));
      const activeCount = actor.hp <= 0 ? 0 : Math.max(1, Math.ceil((hpPct / 100) * 8));
      const color = hpPct < 25 ? '#ef4444' : (hpPct < 50 ? '#f59e0b' : '#22c55e');

      if (state.activeCount !== activeCount || state.color !== color) {
        for (let i = 0; i < 8; i++) {
          segments[i].style.background = i < activeCount ? color : 'rgba(15, 23, 42, 0.7)';
        }
        state.activeCount = activeCount;
        state.color = color;
      }
    });

    this.bars.forEach((entry, actor) => {
      if (!targetActors.includes(actor) || actor.isDead) {
        if (entry.state.visible) { entry.el.style.display = 'none'; entry.state.visible = false; }
      }
    });
  }
}
