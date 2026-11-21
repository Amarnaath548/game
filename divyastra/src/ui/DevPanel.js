import * as THREE from 'three';
import { getDevTools } from '../core/DevTools.js';
import { ALL_SPELLS } from '../config/spellRegistry.js';
import { STORM_PHASES, LEVEL_TABLE } from '../config/constants.js';
import { setDifficulty } from '../config/difficulty.js';

export class DevPanel {
  constructor(deps) {
    this.player = deps.player;
    this.spawnManager = deps.spawnManager;
    this.matchManager = deps.matchManager;
    this.sceneManager = deps.sceneManager;
    this.ui = deps.ui;
    this.devInspectView = deps.devInspectView;
    this.campaignManager = deps.campaignManager;
    this.dev = getDevTools();
    this.circleEls = [];
    this._build();
  }

  _build() {
    const wrap = document.createElement('div');
    wrap.id = 'dev-panel-wrap';
    wrap.style.cssText = 'position:fixed;top:75px;left:8px;z-index:9999;font:11px monospace;color:#fff;pointer-events:none;user-select:none;';

    const btn = document.createElement('button');
    btn.textContent = 'DEV';
    btn.style.cssText = 'pointer-events:auto;background:#7c3aed;color:#fff;border:none;padding:3px 8px;border-radius:4px;cursor:pointer;font:bold 11px monospace;box-shadow:0 2px 6px rgba(0,0,0,0.5);margin-right:4px;';
    wrap.appendChild(btn);

    const inspectBtn = document.createElement('button');
    inspectBtn.textContent = 'DEV VIEW / INSPECT';
    inspectBtn.style.cssText = 'pointer-events:auto;background:#0284c7;color:#fff;border:1px solid #38bdf8;padding:3px 8px;border-radius:4px;cursor:pointer;font:bold 11px monospace;box-shadow:0 2px 6px rgba(0,0,0,0.5);';
    inspectBtn.onclick = () => { if (this.devInspectView) this.devInspectView.toggle(); };
    wrap.appendChild(inspectBtn);

    const panel = document.createElement('div');
    panel.style.cssText = 'display:none;pointer-events:auto;background:rgba(15,20,40,0.94);border:1px solid #7c3aed;border-radius:6px;padding:6px;margin-top:4px;max-width:210px;box-shadow:0 4px 12px rgba(0,0,0,0.7);';
    wrap.appendChild(panel);
    btn.onclick = () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; };

    const row = (t) => { const d = document.createElement('div'); d.style.margin = '3px 0'; d.textContent = t; panel.appendChild(d); return d; };
    const toggle = (label, get, set) => {
      const d = row(''); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = get();
      cb.onchange = () => { set(cb.checked); this.dev.markCheat(); }; d.appendChild(cb); d.append(' ' + label);
    };
    const button = (label, fn) => {
      const b = document.createElement('button'); b.textContent = label;
      b.style.cssText = 'background:#334155;color:#fff;border:1px solid #475569;padding:2px 6px;border-radius:3px;cursor:pointer;font:10px monospace;margin:2px;';
      b.onclick = fn; panel.appendChild(b);
    };

    // 1-2: God mode & No-cooldown
    button('Unlock all levels', () => { this.campaignManager?.unlockAll(); });
    button('Restart match (Normal)', () => { setDifficulty('NORMAL'); if (this.campaignManager) this.campaignManager.currentLevelId = null; this.matchManager.startMatch(); });
    toggle('God mode', () => this.dev.godMode, (v) => { this.dev.godMode = v; });
    toggle('No cooldown', () => this.dev.noCooldown, (v) => { this.dev.noCooldown = v; });

    // 3: Level & XP
    button('+1 Level', () => {
      this.dev.markCheat();
      const nxt = LEVEL_TABLE.find((l) => l.level === this.player.level + 1);
      const req = nxt ? Math.max(1, nxt.xpReq - this.player.xp) : 200;
      this.player.addXP(req, (lvl) => this.ui?.showLevelUp(this.player, lvl));
    });
    button('+200 XP', () => {
      this.dev.markCheat();
      this.player.addXP(200, (lvl) => this.ui?.showLevelUp(this.player, lvl));
    });

    // 4: Spell picker
    const selRow = row('Spell: ');
    const sel = document.createElement('select');
    sel.style.cssText = 'font:10px monospace;background:#1e293b;color:#fff;border:1px solid #475569;max-width:180px;';
    sel.innerHTML = '<option value="fist">fist - Mushti</option>' + Object.entries(ALL_SPELLS).map(([k, sp]) => `<option value="${k}">${k} - ${sp?.name || k}</option>`).join('');
    sel.onchange = () => { this.dev.markCheat(); this.player.setSpell(sel.value); };
    selRow.appendChild(sel);

    // 5: Bot controls
    toggle('Freeze bots', () => this.dev.freezeBots, (v) => { this.dev.freezeBots = v; });
    button('Kill all bots', () => { this.dev.markCheat(); this.spawnManager.bots.forEach((b) => { if (!b.isDead) b.takeDamage(99999); }); });
    button('Spawn 1 bot', () => { this.dev.markCheat(); this.spawnManager.spawnSingleBot?.(); });
    const nRow = row('Keep N bots: ');
    const nInput = document.createElement('input');
    nInput.type = 'number'; nInput.min = 0; nInput.max = 20; nInput.value = 5;
    nInput.style.cssText = 'width:36px;font:10px monospace;background:#1e293b;color:#fff;border:1px solid #475569;';
    const nBtn = document.createElement('button');
    nBtn.textContent = 'Set'; nBtn.style.cssText = 'font:10px monospace;margin-left:4px;background:#334155;color:#fff;border:1px solid #475569;padding:1px 5px;border-radius:3px;cursor:pointer;';
    nBtn.onclick = () => {
      this.dev.markCheat();
      const keep = parseInt(nInput.value, 10) || 0;
      this.spawnManager.bots.filter((b) => !b.isDead).slice(keep).forEach((b) => b.takeDamage(99999));
    };
    nRow.appendChild(nInput); nRow.appendChild(nBtn);

    // 6: Zone controls
    button('Next zone phase', () => {
      this.dev.markCheat();
      const z = this.matchManager.zoneSys;
      if (z.currentPhaseIndex < STORM_PHASES.length - 1) {
        z.currentPhaseIndex++; z.phaseTime = 0;
        z.currentRadius = STORM_PHASES[z.currentPhaseIndex].startRadius;
      }
    });
    button('Jump to final zone', () => {
      this.dev.markCheat();
      const z = this.matchManager.zoneSys;
      z.currentPhaseIndex = STORM_PHASES.length - 1; z.phaseTime = 0;
      z.currentRadius = STORM_PHASES[z.currentPhaseIndex].startRadius;
    });
    toggle('Pause zone', () => this.dev.pauseZone, (v) => { this.dev.pauseZone = v; });

    // 7: Time scale
    row('Time scale:');
    [0.25, 1, 2].forEach((s) => button(`${s}x`, () => { this.dev.timeScale = s; if (s !== 1) this.dev.markCheat(); }));

    // 8: Actor circles
    toggle('Show actor circles', () => this.dev.showActorCircles, (v) => { this.dev.showActorCircles = v; });

    document.body.appendChild(wrap);
  }

  updateCircles(allActors) {
    if (!this.dev.showActorCircles) {
      this.circleEls.forEach((m) => { m.visible = false; });
      return;
    }
    const alive = allActors.filter((a) => !a.isDead);
    while (this.circleEls.length < alive.length) {
      const geo = new THREE.RingGeometry(0.95, 1.05, 32); geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, depthWrite: false, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      this.sceneManager.scene.add(mesh);
      this.circleEls.push(mesh);
    }
    this.circleEls.forEach((m, i) => {
      if (i < alive.length) {
        const a = alive[i];
        m.visible = true; m.position.set(a.x, 0.12, a.z);
        const r = a.radius || 1.0; m.scale.set(r, 1, r);
        m.material.color.setHex(a.isPlayer ? 0x00ff00 : 0xff4444);
      } else {
        m.visible = false;
      }
    });
  }
}
