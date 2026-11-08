import * as THREE from 'three';

export class InputManager {
  constructor(camera) {
    this.camera = camera;
    this.moveDir = { x: 0, z: 0 };
    this.aimDir = { x: 0, z: 1 };
    this.isAiming = false;
    this.fireReleased = false;
    this.dashRequested = false;

    this.keys = {};
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.mouseNormalized = new THREE.Vector2();
    this.usingTouch = false;

    this.initKeyboardAndMouse();
    this.initTouchControls();
  }

  initKeyboardAndMouse() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') this.dashRequested = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      this.mouseNormalized.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNormalized.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.target.id === 'dash-btn') return;
      this.isAiming = true;
    });

    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' || e.target.id === 'dash-btn') return;
      if (this.isAiming) {
        this.isAiming = false;
        this.fireReleased = true;
      }
    });
  }

  initTouchControls() {
    const leftZone = document.getElementById('left-zone');
    const rightZone = document.getElementById('right-zone');
    const leftBase = document.getElementById('left-base');
    const leftKnob = document.getElementById('left-knob');
    const rightBase = document.getElementById('right-base');
    const rightKnob = document.getElementById('right-knob');
    const dashBtn = document.getElementById('dash-btn');

    const maxRadius = 45;

    // Left Joystick (Movement)
    let leftId = null;
    let leftOrigin = { x: 0, y: 0 };

    leftZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.usingTouch = true;
      const touch = e.changedTouches[0];
      leftId = touch.identifier;
      leftOrigin = { x: touch.clientX, y: touch.clientY };
      leftBase.style.display = 'block';
      leftBase.style.left = `${leftOrigin.x}px`;
      leftBase.style.top = `${leftOrigin.y}px`;
      leftKnob.style.transform = `translate(0px, 0px)`;
    }, { passive: false });

    leftZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === leftId) {
          const dx = touch.clientX - leftOrigin.x;
          const dy = touch.clientY - leftOrigin.y;
          const dist = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);
          const clamped = Math.min(dist, maxRadius);
          leftKnob.style.transform = `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)`;

          if (dist > 6) {
            this.moveDir.x = (dx / dist) * (clamped / maxRadius);
            this.moveDir.z = (dy / dist) * (clamped / maxRadius);
          } else {
            this.moveDir.x = 0;
            this.moveDir.z = 0;
          }
        }
      }
    }, { passive: false });

    const endLeft = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === leftId) {
          leftId = null;
          this.moveDir.x = 0;
          this.moveDir.z = 0;
          leftBase.style.display = 'none';
        }
      }
    };
    leftZone.addEventListener('touchend', endLeft);
    leftZone.addEventListener('touchcancel', endLeft);

    // Right Joystick (Aim & Release to Cast)
    let rightId = null;
    let rightOrigin = { x: 0, y: 0 };

    rightZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.usingTouch = true;
      const touch = e.changedTouches[0];
      rightId = touch.identifier;
      rightOrigin = { x: touch.clientX, y: touch.clientY };
      rightBase.style.display = 'block';
      rightBase.style.left = `${rightOrigin.x}px`;
      rightBase.style.top = `${rightOrigin.y}px`;
      rightKnob.style.transform = `translate(0px, 0px)`;
      this.isAiming = true;
    }, { passive: false });

    rightZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === rightId) {
          const dx = touch.clientX - rightOrigin.x;
          const dy = touch.clientY - rightOrigin.y;
          const dist = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);
          const clamped = Math.min(dist, maxRadius);
          rightKnob.style.transform = `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)`;

          if (dist > 10) {
            this.aimDir.x = dx / dist;
            this.aimDir.z = dy / dist;
          }
        }
      }
    }, { passive: false });

    const endRight = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === rightId) {
          rightId = null;
          this.isAiming = false;
          this.fireReleased = true;
          rightBase.style.display = 'none';
        }
      }
    };
    rightZone.addEventListener('touchend', endRight);
    rightZone.addEventListener('touchcancel', endRight);

    dashBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.dashRequested = true;
    });
  }

  update(playerPos) {
    if (!this.usingTouch) {
      let kx = 0;
      let kz = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) kz -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) kz += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) kx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) kx += 1;

      const len = Math.hypot(kx, kz);
      this.moveDir.x = len > 0 ? kx / len : 0;
      this.moveDir.z = len > 0 ? kz / len : 0;

      // Raycast mouse onto Y=0 ground plane for desktop aiming
      this.raycaster.setFromCamera(this.mouseNormalized, this.camera);
      const intersect = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, intersect)) {
        const dx = intersect.x - playerPos.x;
        const dz = intersect.z - playerPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.01) {
          this.aimDir.x = dx / dist;
          this.aimDir.z = dz / dist;
        }
      }
    }
  }
}