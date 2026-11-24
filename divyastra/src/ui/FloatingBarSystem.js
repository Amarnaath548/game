import * as THREE from 'three';

const BOT_NAMES = [
  'Aarav', 'Daksha', 'Kael', 'Rudra', 'Veda', 'Bhanu', 'Tejas', 'Nakul',
  'Kiran', 'Vidur', 'Deva', 'Ashoka', 'Taran', 'Madhav', 'Arun', 'Omkar',
  'Eklavya', 'Samir', 'Varun', 'Yash', 'Alok', 'Neel', 'Chetan', 'Dhruv',
  'Gautam', 'Ishan', 'Jai', 'Keshav', 'Manan', 'Naveen', 'Pranav', 'Rishi',
  'Sagar', 'Tanay', 'Utkarsh', 'Veer', 'Yuvraj', 'Aniket', 'Bhavin', 'Chinmay'
];

const OVERLAP_DY = 24, OVERLAP_DX = 70, STACK_OFFSET = 14, OVERLAP_INTERVAL = 100;

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

    // Overlap state — reuse arrays across frames (no per-frame allocation)
    this._visibleList = [];   // {actor, sx, sy, distSq, isPlayer, entry}
    this._lastOverlapTime = 0;
    this._collapseSet = new Set(); // actors that should show compact bar only
    this._offsetMap = new Map();   // actor -> extra upward offset (px)
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
      lvl.style.cssText = 'font-size:9px;font-weight:900;color:#fff;background:rgba(27,31,59,0.92);padding:0 3px;border-radius:3px;border:1px solid #000;line-height:1.2;';

      const name = document.createElement('span');
      name.className = 'overhead-name';
      name.style.cssText = 'font-size:11px;font-weight:800;color:#f8fafc;text-shadow:0 1px 3px #000,0 0 2px #000;line-height:1.2;';

      header.appendChild(lvl);
      header.appendChild(name);
      el.appendChild(header);

      const bar = document.createElement('div');
      bar.className = 'overhead-bar';
      bar.style.cssText = 'display:flex;gap:2px;padding:1px;background:rgba(27,31,59,0.9);border:1.5px solid #000;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.7);width:56px;height:7px;box-sizing:border-box;';

      const segments = [];
      for (let i = 0; i < 8; i++) {
        const seg = document.createElement('div');
        seg.style.cssText = 'flex:1;height:100%;border-radius:1px;background:#7FA650;';
        bar.appendChild(seg);
        segments.push(seg);
      }
      el.appendChild(bar);

      this.container.appendChild(el);
      entry = {
        el, lvl, name, header, segments,
        state: { x: -999, y: -999, lvl: '', name: '', activeCount: -1, color: '', visible: false, collapsed: false }
      };
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

  /** Throttled overlap check — runs at most 10 times per second, reuses arrays. */
  _runOverlapCheck(now) {
    if (now - this._lastOverlapTime < OVERLAP_INTERVAL) return;
    this._lastOverlapTime = now;
    const list = this._visibleList;
    const collapse = this._collapseSet;
    const offsets = this._offsetMap;
    collapse.clear();
    offsets.clear();

    const n = list.length;
    if (n < 2) return;
    const player = this.player;

    for (let i = 0; i < n; i++) {
      const a = list[i];
      if (a.isPlayer || collapse.has(a.actor)) continue;
      // gather cluster: all actors near a's screen pos (including a)
      let clusterCount = 0;
      let closestIdx = i;
      let closestDist = a.distSq;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const b = list[j];
        if (b.isPlayer) continue;
        if (Math.abs(a.sy - b.sy) < OVERLAP_DY && Math.abs(a.sx - b.sx) < OVERLAP_DX) {
          clusterCount++;
          if (b.distSq < closestDist) { closestDist = b.distSq; closestIdx = j; }
        }
      }
      if (clusterCount === 0) continue;

      // Collapse everyone in cluster except the closest to player
      let offsetIdx = 0;
      for (let j = 0; j < n; j++) {
        const b = list[j];
        if (b.isPlayer) continue;
        const near = (j === i) ||
          (Math.abs(a.sy - b.sy) < OVERLAP_DY && Math.abs(a.sx - b.sx) < OVERLAP_DX);
        if (!near) continue;
        if (j === closestIdx) continue;
        collapse.add(b.actor);
        offsetIdx++;
        offsets.set(b.actor, offsetIdx * STACK_OFFSET);
      }
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
    const visibleList = this._visibleList;
    visibleList.length = 0;

    targetActors.forEach((actor) => {
      this.ensureDisplayName(actor);
      const entry = this.getOrCreateBar(actor);
      const { el, lvl, name, header, segments, state } = entry;

      if (actor.isDead) {
        if (state.visible) { el.style.display = 'none'; state.visible = false; }
        return;
      }

      const isActorPlayer = actor.isPlayer || actor === player;
      let distSq = 0;
      if (player && !isActorPlayer) {
        distSq = (actor.x - player.x) ** 2 + (actor.z - player.z) ** 2;
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

      // Store for overlap check
      visibleList.push({ actor, sx: screenX, sy: screenY, distSq, isPlayer: isActorPlayer, entry });

      if (!state.visible) { el.style.display = 'flex'; state.visible = true; }
    });

    // Run overlap clustering (throttled)
    this._runOverlapCheck(performance.now());

    // Apply positions + collapse state
    const collapse = this._collapseSet;
    const offsets = this._offsetMap;
    for (let i = 0; i < visibleList.length; i++) {
      const { actor, sx, sy, isPlayer, entry } = visibleList[i];
      const { el, lvl, name, header, segments, state } = entry;
      const collapsed = !isPlayer && collapse.has(actor);
      const extraOffset = offsets.get(actor) || 0;
      const finalY = sy - extraOffset;

      if (state.x !== sx) { el.style.left = `${sx}px`; state.x = sx; }
      if (state.y !== finalY) { el.style.top = `${finalY}px`; state.y = finalY; }

      // Collapse / expand header (name + level badge)
      if (collapsed !== state.collapsed) {
        header.style.display = collapsed ? 'none' : 'flex';
        state.collapsed = collapsed;
      }

      const lvlText = `${actor.level || 1}`;
      if (state.lvl !== lvlText) { lvl.textContent = lvlText; state.lvl = lvlText; }

      const nameText = actor.displayName || 'Mage';
      if (state.name !== nameText) {
        name.textContent = nameText;
        name.style.color = isPlayer ? '#E3B04B' : '#EFE6D2';
        name.style.fontWeight = isPlayer ? '900' : '800';
        state.name = nameText;
      }

      const hpPct = Math.max(0, Math.min(100, (actor.hp / actor.maxHp) * 100));
      const activeCount = actor.hp <= 0 ? 0 : Math.max(1, Math.ceil((hpPct / 100) * 8));
      const color = hpPct < 25 ? '#C8431E' : (hpPct < 50 ? '#E08A2E' : '#7FA650');

      if (state.activeCount !== activeCount || state.color !== color) {
        for (let j = 0; j < 8; j++) {
          segments[j].style.background = j < activeCount ? color : 'rgba(27, 31, 59, 0.7)';
        }
        state.activeCount = activeCount;
        state.color = color;
      }
    }

    this.bars.forEach((entry, actor) => {
      if (!targetActors.includes(actor) || actor.isDead) {
        if (entry.state.visible) { entry.el.style.display = 'none'; entry.state.visible = false; }
      }
    });
  }
}
