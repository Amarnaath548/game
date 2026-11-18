import * as THREE from 'three';
import '../inspect.css';
import { CAMERA_CONFIG } from '../config/constants.js';
import { DevCameraController } from './DevCameraController.js';
import { DevInspectHero } from './DevInspectHero.js';

export class DevInspectView {
  constructor(deps) {
    this.sceneManager = deps.sceneManager;
    this.matchManager = deps.matchManager;
    this.spawnManager = deps.spawnManager;
    this.arenaInteractables = deps.arenaInteractables;
    this.player = deps.player;
    this.isOpen = false;
    this.activeTab = 'hero';
    this.cameraCtrl = new DevCameraController(this.sceneManager.camera, this.sceneManager.renderer.domElement);
    this.inspectHero = null;
    this.layers = { ground: true, vegetation: true, rocks: true, interactables: true, bots: true, shadows: true };
    this.sunAngle = 45;
    this.isDev = new URLSearchParams(window.location.search).get('dev') === '1';
    this.buildUI();
  }

  buildUI() {
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.id = 'dev-inspect-toggle-btn';
    this.toggleBtn.innerHTML = '🔍 DEV VIEW / INSPECT';
    this.toggleBtn.style.display = this.isDev ? 'block' : 'none';
    this.toggleBtn.onclick = () => this.toggle();
    document.body.appendChild(this.toggleBtn);

    this.overlay = document.createElement('div');
    this.overlay.id = 'dev-inspect-overlay';
    this.overlay.innerHTML = `
      <div class="inspect-hud-panel inspect-hud-left">
        <div class="inspect-header"><span class="inspect-title">DEV INSPECT</span><span class="inspect-badge">3D VIEW</span></div>
        <div class="inspect-tab-bar">
          <button class="inspect-tab-btn active" id="tab-btn-hero">HERO VIEW</button>
          <button class="inspect-tab-btn" id="tab-btn-map">MAP EXPLORER</button>
        </div>
        <div id="inspect-content-hero" style="display:flex;flex-direction:column;gap:10px;">
          <div class="inspect-section"><span class="inspect-label">Hero / School</span>
            <select class="inspect-select" id="inspect-hero-select">
              <option value="Tapasvi">Tapasvi</option><option value="Agni Sadhaka">Agni Sadhaka</option>
              <option value="Jala Sadhaka">Jala Sadhaka</option><option value="Prithvi Sadhaka">Prithvi Sadhaka</option>
            </select>
          </div>
          <div class="inspect-section"><span class="inspect-label">Power Tier</span>
            <div class="inspect-btn-group" id="inspect-tier-group">
              <button class="inspect-btn active" data-tier="1">T1 Mantra</button>
              <button class="inspect-btn" data-tier="2">T2 Shastra</button>
              <button class="inspect-btn" data-tier="3">T3 Astra</button>
            </div>
          </div>
          <div class="inspect-section"><span class="inspect-label">Animation</span>
            <select class="inspect-select" id="inspect-anim-select">
              <option value="idle">Idle Pose</option><option value="walk">Walk Cycle</option>
              <option value="cast">Cast Spell</option><option value="punch">Mushti Punch</option>
            </select>
          </div>
          <div class="inspect-section"><span class="inspect-label">Astra Orb Color</span>
            <div class="inspect-color-swatches" id="inspect-orb-colors">
              <div class="inspect-swatch active" data-color="0x00f2ff" style="background:#00f2ff;" title="Cyan Blue"></div>
              <div class="inspect-swatch" data-color="0xef4444" style="background:#ef4444;" title="Agni Red"></div>
              <div class="inspect-swatch" data-color="0x10b981" style="background:#10b981;" title="Prithvi Green"></div>
              <div class="inspect-swatch" data-color="0xf59e0b" style="background:#f59e0b;" title="Siddhi Gold"></div>
            </div>
          </div>
          <label class="inspect-checkbox-row"><input type="checkbox" id="inspect-autorotate-cb" checked /><span>Auto-Rotate Model</span></label>
        </div>
        <div id="inspect-content-map" style="display:none;flex-direction:column;gap:10px;">
          <div class="inspect-section"><span class="inspect-label">Landmark Focus</span>
            <div class="inspect-landmark-grid">
              <button class="inspect-landmark-btn" data-target="0,0,14,40">MANDAPA</button>
              <button class="inspect-landmark-btn" data-target="38,-38,18,35">AGNI SECTOR</button>
              <button class="inspect-landmark-btn" data-target="-38,34,16,35">JALA KUND</button>
              <button class="inspect-landmark-btn" data-target="-55,55,22,35">PRITHVI VANAM</button>
              <button class="inspect-landmark-btn" data-target="0,115,35,25" style="grid-column:span 2;">ARENA RIM (120u)</button>
            </div>
          </div>
          <div class="inspect-section"><span class="inspect-label">Biome & Sun Lighting</span>
            <button class="inspect-btn" id="inspect-biome-toggle">Biome: GRASS</button>
            <div style="font-size:10px;color:#94a3b8;margin-top:4px;">Sun Angle: <span id="sun-angle-val">45°</span></div>
            <input type="range" id="inspect-sun-slider" min="0" max="360" value="45" style="width:100%;accent-color:#f59e0b;" />
          </div>
        </div>
      </div>
      <div class="inspect-hud-panel inspect-hud-right">
        <div class="inspect-header"><span class="inspect-title">METRICS & LAYERS</span></div>
        <div class="inspect-stat-box">
          <div class="inspect-stat-row"><span>Triangles:</span><span class="inspect-stat-val" id="inspect-tri-count">~2,150</span></div>
          <div class="inspect-stat-row"><span>Mat Calls:</span><span class="inspect-stat-val" id="inspect-mat-calls">6</span></div>
          <div class="inspect-stat-row"><span>Draw Calls:</span><span class="inspect-stat-val" id="inspect-render-calls">0</span></div>
        </div>
        <div class="inspect-section"><span class="inspect-label">Map Layers</span>
          <label class="inspect-checkbox-row"><input type="checkbox" id="layer-cb-ground" checked /> Ground & Paths</label><label class="inspect-checkbox-row"><input type="checkbox" id="layer-cb-veg" checked /> Banyans & Veg</label>
          <label class="inspect-checkbox-row"><input type="checkbox" id="layer-cb-rocks" checked /> Rocks & Megaliths</label><label class="inspect-checkbox-row"><input type="checkbox" id="layer-cb-interact" checked /> Hazards & Pillars</label>
          <label class="inspect-checkbox-row"><input type="checkbox" id="layer-cb-bots" checked /> Fighter Bots</label><label class="inspect-checkbox-row"><input type="checkbox" id="layer-cb-shadows" checked /> Dynamic Shadows</label>
        </div>
        <button class="inspect-exit-btn" id="inspect-exit-btn">EXIT DEV VIEW</button>
      </div>`;
    document.body.appendChild(this.overlay);
    this.bindEvents();
  }

  bindEvents() {
    const $ = (id) => this.overlay.querySelector('#' + id);
    const heroTab = $('tab-btn-hero'), mapTab = $('tab-btn-map'), heroBox = $('inspect-content-hero'), mapBox = $('inspect-content-map');

    heroTab.onclick = () => {
      this.activeTab = 'hero'; heroTab.classList.add('active'); mapTab.classList.remove('active');
      heroBox.style.display = 'flex'; mapBox.style.display = 'none';
      if (this.inspectHero) { this.inspectHero.group.visible = true; this.cameraCtrl.focusOn(0, 6.5, 0, 9, 25); }
    };
    mapTab.onclick = () => {
      this.activeTab = 'map'; mapTab.classList.add('active'); heroTab.classList.remove('active');
      mapBox.style.display = 'flex'; heroBox.style.display = 'none';
      if (this.inspectHero) this.inspectHero.group.visible = false;
      this.cameraCtrl.focusOn(0, 0, 0, 48, 45);
    };

    $('inspect-hero-select').onchange = (e) => { this.inspectHero?.setArchetype(e.target.value); this.updateMetrics(); };
    $('inspect-anim-select').onchange = (e) => this.inspectHero?.setAnimation(e.target.value);
    $('inspect-autorotate-cb').onchange = (e) => { if (this.inspectHero) this.inspectHero.autoRotate = e.target.checked; };

    this.overlay.querySelectorAll('#inspect-tier-group button').forEach((btn) => {
      btn.onclick = () => {
        this.overlay.querySelectorAll('#inspect-tier-group button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.inspectHero?.setTier(parseInt(btn.dataset.tier, 10));
        this.updateMetrics();
      };
    });
    this.overlay.querySelectorAll('.inspect-swatch').forEach((s) => {
      s.onclick = () => {
        this.overlay.querySelectorAll('.inspect-swatch').forEach((sw) => sw.classList.remove('active'));
        s.classList.add('active');
        this.inspectHero?.setOrbColor(parseInt(s.dataset.color, 16));
      };
    });
    this.overlay.querySelectorAll('.inspect-landmark-btn').forEach((btn) => {
      btn.onclick = () => {
        const [x, z, r, p] = btn.dataset.target.split(',').map(Number);
        this.cameraCtrl.focusOn(x, 0, z, r, p);
      };
    });

    const biomeBtn = $('inspect-biome-toggle');
    biomeBtn.onclick = () => {
      const nextBiome = (this.sceneManager.currentBiome?.id === 'SNOW') ? 'GRASS' : 'SNOW';
      this.sceneManager.applyBiome(nextBiome, this.spawnManager.bushes);
      biomeBtn.textContent = `Biome: ${nextBiome}`;
    };

    const slider = $('inspect-sun-slider'), sunVal = $('sun-angle-val');
    slider.oninput = (e) => {
      this.sunAngle = Number(e.target.value);
      sunVal.textContent = `${this.sunAngle}°`;
      const rad = (this.sunAngle * Math.PI) / 180;
      this.sceneManager.dirLight.position.set(Math.cos(rad) * 65, 55, Math.sin(rad) * 65);
    };

    const bindLayer = (id, key, fn) => { $(id).onchange = (e) => { this.layers[key] = e.target.checked; fn(e.target.checked); }; };
    bindLayer('layer-cb-ground', 'ground', (v) => {
      this.sceneManager.floorMesh.visible = v;
      this.sceneManager.scene.traverse((c) => { if (c.isMesh && c.geometry?.type === 'RingGeometry') c.visible = v; });
    });
    bindLayer('layer-cb-veg', 'vegetation', (v) => {
      const env = this.sceneManager.worldEnv;
      [env?.bTrunkMesh, env?.bRootMesh, env?.bLobeShMesh, env?.bLobeHiMesh, env?.pineTrunkMesh, env?.pineCanopyMesh].forEach((m) => { if (m) m.visible = v; });
      this.spawnManager.bushes?.forEach((b) => { if (b.group) b.group.visible = v; });
    });
    bindLayer('layer-cb-rocks', 'rocks', (v) => {
      const env = this.sceneManager.worldEnv;
      [env?.megMesh, env?.megMossMesh, env?.rockMesh, env?.rockMossMesh].forEach((m) => { if (m) m.visible = v; });
    });
    bindLayer('layer-cb-interact', 'interactables', (v) => {
      const ai = this.arenaInteractables;
      if (ai) [...(ai.pads || []), ...(ai.suryas || []), ...(ai.braziers || [])].forEach((i) => { if (i?.group) i.group.visible = v; });
      [...(this.spawnManager.chests || []), ...(this.spawnManager.crystals || [])].forEach((p) => { if (p?.group) p.group.visible = v; });
    });
    bindLayer('layer-cb-bots', 'bots', (v) => this.spawnManager.bots?.forEach((b) => { if (b.group) b.group.visible = v; }));
    bindLayer('layer-cb-shadows', 'shadows', (v) => {
      this.sceneManager.renderer.shadowMap.enabled = v;
      if (this.sceneManager.dirLight) this.sceneManager.dirLight.castShadow = v;
    });

    $('inspect-exit-btn').onclick = () => this.close();
  }

  toggle() { if (this.isOpen) this.close(); else this.open(); }
  open() {
    if (this.isOpen) return;
    this.isOpen = true; this.matchManager.isPaused = true;
    this.inspectHero = new DevInspectHero(this.sceneManager.scene);
    this.cameraCtrl.bind(); this.cameraCtrl.focusOn(0, 6.5, 0, 9, 25);
    this.overlay.style.display = 'block'; this.toggleBtn.style.display = 'block';
    this.toggleBtn.textContent = '✖ CLOSE DEV VIEW';
    this.updateMetrics();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.matchManager.isPaused = false;
    CAMERA_CONFIG.OFFSET_Y = 56;
    CAMERA_CONFIG.OFFSET_Z = 28;
    this.cameraCtrl.unbind();
    if (this.inspectHero) {
      this.inspectHero.destroy();
      this.inspectHero = null;
    }
    this.restoreLayers();
    this.overlay.style.display = 'none';
    this.toggleBtn.style.display = this.isDev ? 'block' : 'none';
    this.toggleBtn.textContent = '🔍 DEV VIEW / INSPECT';
  }

  restoreLayers() {
    this.sceneManager.floorMesh.visible = true;
    const env = this.sceneManager.worldEnv, ai = this.arenaInteractables;
    [env?.bTrunkMesh, env?.bRootMesh, env?.bLobeShMesh, env?.bLobeHiMesh, env?.pineTrunkMesh, env?.pineCanopyMesh, env?.megMesh, env?.megMossMesh, env?.rockMesh, env?.rockMossMesh].forEach((m) => { if (m) m.visible = true; });
    this.spawnManager.bushes?.forEach((b) => { if (b.group) b.group.visible = true; });
    if (ai) [...(ai.pads || []), ...(ai.suryas || []), ...(ai.braziers || [])].forEach((i) => { if (i?.group) i.group.visible = true; });
    [...(this.spawnManager.bots || []), ...(this.spawnManager.chests || []), ...(this.spawnManager.crystals || [])].forEach((p) => { if (p?.group) p.group.visible = true; });
    this.sceneManager.renderer.shadowMap.enabled = true;
    if (this.sceneManager.dirLight) this.sceneManager.dirLight.castShadow = true;
    this.overlay.querySelectorAll('.inspect-hud-right input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
  }

  updateMetrics() {
    if (!this.inspectHero) return;
    const { triangles, drawCalls } = this.inspectHero.getMetrics();
    const tri = this.overlay.querySelector('#inspect-tri-count'), mat = this.overlay.querySelector('#inspect-mat-calls');
    if (tri) tri.textContent = triangles.toLocaleString();
    if (mat) mat.textContent = drawCalls;
  }

  update(dt = 0.016) {
    if (!this.isOpen) return;
    this.cameraCtrl.update(dt);
    if (this.inspectHero && this.activeTab === 'hero') this.inspectHero.update(dt);
    const callsEl = this.overlay.querySelector('#inspect-render-calls');
    if (callsEl) callsEl.textContent = this.sceneManager.renderer.info.render.calls;
  }
}
