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
      el.style.width = '48px';
      el.style.height = '6px';
      el.style.background = 'rgba(0,0,0,0.6)';
      el.style.border = '1px solid #1f2937';
      el.style.borderRadius = '3px';
      el.style.transform = 'translate(-50%, -50%)';
      el.style.display = 'flex';
      el.style.overflow = 'hidden';

      const fill = document.createElement('div');
      fill.className = 'actor-hp-bar';
      fill.style.width = '100%';
      fill.style.height = '100%';
      fill.style.background = '#ef4444';
      fill.style.transition = 'width 0.1s linear';
      el.appendChild(fill);

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

      // 3D position ~3.2 units high (above head/hat)
      this.projVec.set(actor.x, 3.2, actor.z);
      this.projVec.project(this.camera);

      // Check if behind camera
      if (this.projVec.z > 1) {
        el.style.display = 'none';
        return;
      }

      const screenX = (this.projVec.x * widthHalf) + widthHalf;
      const screenY = -(this.projVec.y * heightHalf) + heightHalf;

      el.style.display = 'flex';
      el.style.left = `${screenX}px`;
      el.style.top = `${screenY}px`;

      const hpPercent = Math.max(0, Math.min(100, (actor.hp / actor.maxHp) * 100));
      const fill = el.firstChild;
      if (fill) {
        fill.style.width = `${hpPercent}%`;
        fill.style.background = actor.robeColor
          ? `#${actor.robeColor.toString(16).padStart(6, '0')}`
          : '#ef4444';
      }
    });

    // Cleanup dead actors that are no longer in array
    this.bars.forEach((el, actor) => {
      if (!actors.includes(actor) || actor.isDead) {
        el.style.display = 'none';
      }
    });
  }
}
