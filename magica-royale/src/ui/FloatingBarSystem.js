import * as THREE from 'three';

export class FloatingBarSystem {
  constructor(camera) {
    this.camera = camera;
    this.container = document.createElement('div');
    this.container.id = 'floating-bars-container';
    this.container.style.position = 'fixed';
    this.container.style.inset = '0';
    this.container.style.pointerEvents = 'none';
    this.container.style.overflow = 'hidden';
    this.container.style.zIndex = '5';
    document.body.appendChild(this.container);

    this.bars = new Map(); // actor -> DOMElement
    this.projVec = new THREE.Vector3();
  }

  getOrCreateBar(actor) {
    let el = this.bars.get(actor);
    if (!el) {
      el = document.createElement('div');
      el.className = 'actor-overhead';
      el.style.position = 'absolute';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.gap = '4px';
      el.style.transform = 'translate(-50%, -50%)';

      const lvlTag = document.createElement('span');
      lvlTag.className = 'actor-lvl-tag';
      lvlTag.style.fontSize = '10px';
      lvlTag.style.fontWeight = '800';
      lvlTag.style.color = '#f8fafc';
      lvlTag.style.textShadow = '0 1px 3px rgba(0,0,0,0.9)';
      lvlTag.textContent = `Lv ${actor.level || 1}`;
      el.appendChild(lvlTag);

      const barBg = document.createElement('div');
      barBg.style.width = '42px';
      barBg.style.height = '6px';
      barBg.style.background = 'rgba(0,0,0,0.6)';
      barBg.style.border = '1px solid #1f2937';
      barBg.style.borderRadius = '3px';
      barBg.style.overflow = 'hidden';

      const fill = document.createElement('div');
      fill.className = 'actor-hp-bar';
      fill.style.width = '100%';
      fill.style.height = '100%';
      fill.style.background = '#ef4444';
      fill.style.transition = 'width 0.1s linear';
      barBg.appendChild(fill);
      el.appendChild(barBg);

      this.container.appendChild(el);
      this.bars.set(actor, el);
    }
    return el;
  }

  update(actors) {
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    actors.forEach((actor) => {
      const el = this.getOrCreateBar(actor);

      if (actor.isDead) {
        el.style.display = 'none';
        return;
      }

      // 3D position ~3.5 units high (above 1.4x head/hat)
      this.projVec.set(actor.x, 3.5, actor.z);
      this.projVec.project(this.camera);

      if (this.projVec.z > 1) {
        el.style.display = 'none';
        return;
      }

      const screenX = (this.projVec.x * widthHalf) + widthHalf;
      const screenY = -(this.projVec.y * heightHalf) + heightHalf;

      el.style.display = 'flex';
      el.style.left = `${screenX}px`;
      el.style.top = `${screenY}px`;

      const lvlTag = el.querySelector('.actor-lvl-tag');
      if (lvlTag) lvlTag.textContent = `Lv ${actor.level || 1}`;

      const hpPercent = Math.max(0, Math.min(100, (actor.hp / actor.maxHp) * 100));
      const fill = el.querySelector('.actor-hp-bar');
      if (fill) {
        fill.style.width = `${hpPercent}%`;
        fill.style.background = actor.hero?.bodyColor
          ? `#${actor.hero.bodyColor.toString(16).padStart(6, '0')}`
          : '#ef4444';
      }
    });

    this.bars.forEach((el, actor) => {
      if (!actors.includes(actor) || actor.isDead) {
        el.style.display = 'none';
      }
    });
  }
}
