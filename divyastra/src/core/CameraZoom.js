import { CAMERA_CONFIG } from '../config/constants.js';

export const CAM_STORAGE_KEY = 'divyastra_cam';

export const CAMERA_ZOOM_PRESETS = {
  PHONE: {
    NEAR: 0.85,
    NORMAL: 1.0,
    FAR: 1.2
  },
  DESKTOP: {
    NEAR: 0.85,
    NORMAL: 1.0,
    FAR: 1.15
  }
};

export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    window.innerWidth < 900
  );
}

export function getSavedCamDistance() {
  try {
    const saved = localStorage.getItem(CAM_STORAGE_KEY);
    if (saved) {
      const upper = saved.toUpperCase();
      if (upper === 'NEAR' || upper === 'NORMAL' || upper === 'FAR') {
        return upper;
      }
    }
  } catch (_) {}
  return 'NORMAL';
}

export function saveCamDistance(distance) {
  try {
    if (distance) {
      localStorage.setItem(CAM_STORAGE_KEY, distance.toUpperCase());
    }
  } catch (_) {}
}

export function getCamZoom(distance = null, isTouch = null) {
  const touch = isTouch ?? isTouchDevice();
  const dist = (distance || getSavedCamDistance()).toUpperCase();
  const table = touch ? CAMERA_ZOOM_PRESETS.PHONE : CAMERA_ZOOM_PRESETS.DESKTOP;
  return table[dist] ?? 1.0;
}

export class CameraZoom {
  constructor() {
    this.currentDistance = getSavedCamDistance();
    this.targetZoom = getCamZoom(this.currentDistance);
    this.currentZoom = this.targetZoom;
  }

  setDistance(distance) {
    this.currentDistance = distance || 'NORMAL';
    this.targetZoom = getCamZoom(this.currentDistance);
  }

  syncWithDevice() {
    this.targetZoom = getCamZoom(this.currentDistance);
  }

  update(lerpSpeed = CAMERA_CONFIG.LERP_SPEED) {
    this.currentZoom += (this.targetZoom - this.currentZoom) * (lerpSpeed || 0.1);
    return this.currentZoom;
  }
}
