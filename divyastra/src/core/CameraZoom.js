import { CAMERA_CONFIG } from '../config/constants.js';

export class CameraZoom {
  constructor() {
    this.targetZoom = CAMERA_CONFIG.ZOOM ?? (CAMERA_CONFIG.ZOOM_LEVELS?.CLOSE ?? 1.0);
    this.currentZoom = this.targetZoom;
  }

  update(lerpSpeed = CAMERA_CONFIG.LERP_SPEED) {
    this.currentZoom += (this.targetZoom - this.currentZoom) * (lerpSpeed || 0.1);
    return this.currentZoom;
  }
}
