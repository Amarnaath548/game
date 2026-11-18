import * as THREE from 'three';

/**
 * Interactive 3D Dev Camera Controller.
 * Provides 360° orbit, 10°–85° pitch, 4u–120u zoom, and XZ panning with y >= 0.5 ground constraint.
 */
export class DevCameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement || document.body;

    this.target = new THREE.Vector3(0, 0, 0);
    this.desiredTarget = new THREE.Vector3(0, 0, 0);

    this.radius = 12;
    this.desiredRadius = 12;

    this.theta = 0; // Azimuth angle
    this.desiredTheta = 0;

    // Pitch: 10 deg to 85 deg => phi (polar angle from Y-up) = 80 deg down to 5 deg
    this.minPhi = THREE.MathUtils.degToRad(5);
    this.maxPhi = THREE.MathUtils.degToRad(80);
    this.phi = THREE.MathUtils.degToRad(60); // default ~30 deg pitch
    this.desiredPhi = this.phi;

    this.isDragging = false;
    this.dragMode = 'orbit'; // 'orbit' | 'pan'
    this.prevPointerX = 0;
    this.prevPointerY = 0;

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onWheel = this.onWheel.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    this.isBound = false;
  }

  bind() {
    if (this.isBound) return;
    this.isBound = true;
    this.domElement.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this._onContextMenu);
  }

  unbind() {
    if (!this.isBound) return;
    this.isBound = false;
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    this.domElement.removeEventListener('wheel', this._onWheel);
    this.domElement.removeEventListener('contextmenu', this._onContextMenu);
  }

  focusOn(x, y, z, radius = null, pitchDeg = null) {
    this.desiredTarget.set(x, y, z);
    if (radius !== null) this.desiredRadius = THREE.MathUtils.clamp(radius, 4, 120);
    if (pitchDeg !== null) {
      const p = THREE.MathUtils.clamp(pitchDeg, 10, 85);
      this.desiredPhi = THREE.MathUtils.degToRad(90 - p);
    }
  }

  onPointerDown(e) {
    if (e.target !== this.domElement && !e.target.classList.contains('dev-inspect-canvas-target')) return;
    this.isDragging = true;
    this.dragMode = (e.button === 2 || e.button === 1 || e.shiftKey) ? 'pan' : 'orbit';
    this.prevPointerX = e.clientX;
    this.prevPointerY = e.clientY;
  }

  onPointerMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevPointerX;
    const dy = e.clientY - this.prevPointerY;
    this.prevPointerX = e.clientX;
    this.prevPointerY = e.clientY;

    if (this.dragMode === 'orbit') {
      this.desiredTheta -= dx * 0.006;
      this.desiredPhi = THREE.MathUtils.clamp(this.desiredPhi - dy * 0.006, this.minPhi, this.maxPhi);
    } else {
      // Pan along camera right and forward projected on XZ plane
      const panSpeed = (this.radius / 80) * 0.04;
      const sinT = Math.sin(this.theta);
      const cosT = Math.cos(this.theta);
      const rightX = cosT;
      const rightZ = -sinT;
      const fwdX = -sinT;
      const fwdZ = -cosT;

      this.desiredTarget.x += (-rightX * dx + fwdX * dy) * panSpeed;
      this.desiredTarget.z += (-rightZ * dx + fwdZ * dy) * panSpeed;
    }
  }

  onPointerUp() {
    this.isDragging = false;
  }

  onWheel(e) {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.035;
    this.desiredRadius = THREE.MathUtils.clamp(this.desiredRadius + zoomDelta, 4, 120);
  }

  update(dt = 0.016) {
    const lerpFactor = Math.min(1.0, dt * 14);

    this.target.lerp(this.desiredTarget, lerpFactor);
    this.radius = THREE.MathUtils.lerp(this.radius, this.desiredRadius, lerpFactor);
    this.theta = THREE.MathUtils.lerp(this.theta, this.desiredTheta, lerpFactor);
    this.phi = THREE.MathUtils.lerp(this.phi, this.desiredPhi, lerpFactor);

    // Compute spherical position around target
    const sinPhi = Math.sin(this.phi);
    const cosPhi = Math.cos(this.phi);

    const x = this.target.x + this.radius * sinPhi * Math.sin(this.theta);
    const y = Math.max(0.5, this.target.y + this.radius * cosPhi);
    const z = this.target.z + this.radius * sinPhi * Math.cos(this.theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }
}
