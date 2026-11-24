import * as THREE from 'three';

export class DamageNumbers {
  constructor(camera) {
    this.camera = camera;
    this.container = document.createElement('div');
    this.container.id = 'damage-numbers-container';
    this.container.style.position = 'fixed';
    this.container.style.inset = '0';
    this.container.style.pointerEvents = 'none';
    this.container.style.overflow = 'hidden';
    this.container.style.zIndex = '12';
    document.body.appendChild(this.container);

    this.maxActive = 30;
    this.pool = [];
    this.projVec = new THREE.Vector3();

    for (let i = 0; i < this.maxActive; i++) {
      const el = document.createElement('div');
      el.className = 'floating-dmg';
      el.style.position = 'absolute';
      el.style.transform = 'translate(-50%, -50%)';
      el.style.fontWeight = '900';
      el.style.fontSize = '18px';
      el.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      el.style.webkitTextStroke = '1px #000000';
      el.style.display = 'none';
      el.style.willChange = 'transform, opacity';
      this.container.appendChild(el);

      this.pool.push({
        el,
        active: false,
        x: 0,
        y: 0,
        z: 0,
        timer: 0,
        duration: 0.7,
        isBig: false
      });
    }
  }

  spawn(worldX, worldZ, amount, opts = {}) {
    if (amount <= 0 || worldX === undefined || worldZ === undefined || Number.isNaN(worldX)) return;
    let item = this.pool.find((p) => !p.active);
    if (!item) {
      item = this.pool.reduce((oldest, cur) => (cur.timer > oldest.timer ? cur : oldest), this.pool[0]);
    }

    const isObj = typeof opts === 'object' && opts !== null;
    const isPlayerHit = isObj ? !!opts.isPlayerHit : false;
    const isPlayerHurt = isObj ? !!opts.isPlayerHurt : false;
    const isCrit = isObj ? !!opts.isCrit : false;
    const fallbackColor = !isObj ? opts : opts.color;

    const isBig = isCrit || amount >= 25;
    let colorHex = '#e2e8f0';
    if (isPlayerHit) {
      colorHex = '#ffd700'; // Gold for player's hits
    } else if (isPlayerHurt) {
      colorHex = '#ffffff'; // White for hits taken
    } else if (fallbackColor) {
      colorHex = typeof fallbackColor === 'number' ? `#${fallbackColor.toString(16).padStart(6, '0')}` : fallbackColor;
    }

    item.active = true;
    item.timer = 0;
    item.duration = 0.7; // Float up and fade over 0.7s
    item.isBig = isBig;
    item.x = worldX + (Math.random() - 0.5) * 0.8;
    item.y = 2.0;
    item.z = worldZ + (Math.random() - 0.5) * 0.8;

    item.el.textContent = Math.round(amount);
    item.el.style.color = colorHex;
    item.el.style.fontSize = isBig ? '24px' : '17px';
    item.el.style.textShadow = isBig
      ? '0 0 6px #000, 0 2px 4px #000, 0 0 10px rgba(255, 215, 0, 0.7)'
      : '0 0 4px #000, 0 1px 3px rgba(0,0,0,0.95), 0 0 8px #000';
    item.el.style.opacity = '1';

    if (this.camera) {
      this.projVec.set(item.x, item.y, item.z);
      this.projVec.project(this.camera);
      if (this.projVec.z <= 1.0) {
        const sx = this.projVec.x * (window.innerWidth / 2) + (window.innerWidth / 2);
        const sy = -this.projVec.y * (window.innerHeight / 2) + (window.innerHeight / 2);
        item.el.style.left = `${sx}px`;
        item.el.style.top = `${sy}px`;
        item.el.style.transform = `translate(-50%, -50%) scale(${isBig ? '1.9' : '1.3'})`;
      }
    }
    item.el.style.display = 'block';
  }

  update(dt) {
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    for (const item of this.pool) {
      if (!item.active) continue;

      item.timer += dt;
      const progress = item.timer / item.duration;

      if (progress >= 1.0) {
        item.active = false;
        item.el.style.display = 'none';
        continue;
      }

      // Float up smoothly
      const curY = item.y + progress * 2.2;
      this.projVec.set(item.x, curY, item.z);
      this.projVec.project(this.camera);

      if (this.projVec.z > 1.0) {
        item.el.style.display = 'none';
        continue;
      }

      const screenX = this.projVec.x * widthHalf + widthHalf;
      const screenY = -this.projVec.y * heightHalf + heightHalf;

      // Pop-scaled: punch out initially then settle and fade
      let scale = 1.0;
      if (item.isBig) {
        const pop = Math.max(0, 1.0 - progress * 4.0);
        scale = 1.35 + pop * 0.55 - progress * 0.2;
      } else {
        const pop = Math.max(0, 1.0 - progress * 4.0);
        scale = 1.05 + pop * 0.25 - progress * 0.15;
      }
      const opacity = 1.0 - Math.pow(progress, 1.6);

      item.el.style.display = 'block';
      item.el.style.left = `${screenX}px`;
      item.el.style.top = `${screenY}px`;
      item.el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(2)})`;
      item.el.style.opacity = `${opacity.toFixed(2)}`;
    }
  }

  reset() {
    for (const item of this.pool) {
      item.active = false;
      item.el.style.display = 'none';
    }
  }
}
