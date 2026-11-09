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

    this.maxActive = 20;
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
      el.style.textShadow = '0 0 4px #000, 0 2px 4px #000, 0 0 8px #000';
      el.style.webkitTextStroke = '0.5px rgba(0,0,0,0.8)';
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
        duration: 0.6
      });
    }
  }

  spawn(worldX, worldZ, amount, color = 0xffffff) {
    if (amount <= 0) return;
    let item = this.pool.find((p) => !p.active);
    if (!item) {
      item = this.pool.reduce((oldest, cur) => (cur.timer > oldest.timer ? cur : oldest), this.pool[0]);
    }

    item.active = true;
    item.timer = 0;
    item.x = worldX + (Math.random() - 0.5) * 0.8;
    item.y = 2.0;
    item.z = worldZ + (Math.random() - 0.5) * 0.8;

    const hex = typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color;
    item.el.textContent = Math.round(amount);
    item.el.style.color = hex;
    item.el.style.opacity = '1';
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

      const curY = item.y + progress * 1.6;
      this.projVec.set(item.x, curY, item.z);
      this.projVec.project(this.camera);

      if (this.projVec.z > 1.0) {
        item.el.style.display = 'none';
        continue;
      }

      const screenX = this.projVec.x * widthHalf + widthHalf;
      const screenY = -this.projVec.y * heightHalf + heightHalf;
      const scale = 1.25 - progress * 0.35;
      const opacity = 1.0 - progress * progress;

      item.el.style.display = 'block';
      item.el.style.left = `${screenX}px`;
      item.el.style.top = `${screenY}px`;
      item.el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      item.el.style.opacity = `${opacity}`;
    }
  }

  reset() {
    for (const item of this.pool) {
      item.active = false;
      item.el.style.display = 'none';
    }
  }
}

