import {
  CAMERA_CONFIG, CAMERA_PHONE, CAMERA_THIRD_PERSON, CAMERA_THIRD_PERSON_PHONE
} from '../config/constants.js';

export const CAM_STORAGE_KEY = 'divyastra_cam';

export const CAMERA_MODES = {
  TOP_DOWN: 'TOP_DOWN',
  THIRD_PERSON: 'THIRD_PERSON'
};

export const CAMERA_ZOOM_PRESETS = {
  PHONE: {
    TOP_DOWN: 0.85,
    THIRD_PERSON: 1.0
  },
  DESKTOP: {
    TOP_DOWN: 0.85,
    THIRD_PERSON: 1.0
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
      if (upper === CAMERA_MODES.THIRD_PERSON) return CAMERA_MODES.THIRD_PERSON;
      if (upper === CAMERA_MODES.TOP_DOWN || upper === 'NEAR') return CAMERA_MODES.TOP_DOWN;
    }
  } catch (_) {}
  return CAMERA_MODES.TOP_DOWN;
}

export function saveCamDistance(mode) {
  try {
    if (mode) {
      const upper = mode.toUpperCase();
      const normalized = upper === CAMERA_MODES.THIRD_PERSON ? CAMERA_MODES.THIRD_PERSON : CAMERA_MODES.TOP_DOWN;
      localStorage.setItem(CAM_STORAGE_KEY, normalized);
    }
  } catch (_) {}
}

export function getCamZoom(mode = null, isTouch = null) {
  const touch = isTouch ?? isTouchDevice();
  const resolved = (mode || getSavedCamDistance()).toUpperCase();
  const table = touch ? CAMERA_ZOOM_PRESETS.PHONE : CAMERA_ZOOM_PRESETS.DESKTOP;
  return table[resolved] ?? table.TOP_DOWN;
}

export class CameraZoom {
  constructor() {
    this.currentDistance = getSavedCamDistance();
    this.targetZoom = getCamZoom(this.currentDistance);
    this.currentZoom = this.targetZoom;
  }

  isThirdPerson() {
    return this.currentDistance === CAMERA_MODES.THIRD_PERSON;
  }

  setDistance(mode) {
    const upper = (mode || '').toUpperCase();
    this.currentDistance = upper === CAMERA_MODES.THIRD_PERSON ? CAMERA_MODES.THIRD_PERSON : CAMERA_MODES.TOP_DOWN;
    this.targetZoom = getCamZoom(this.currentDistance);
  }

  syncWithDevice() {
    this.targetZoom = getCamZoom(this.currentDistance);
  }

  update(lerpSpeed = CAMERA_CONFIG.LERP_SPEED) {
    this.currentZoom += (this.targetZoom - this.currentZoom) * (lerpSpeed || 0.1);
    return this.currentZoom;
  }

  applyToCamera(camera, desiredPos, lookPos, target, playerPos, aimDir, shakeX = 0, shakeZ = 0) {
    const isTouch = isTouchDevice();
    const thirdPerson = this.isThirdPerson();
    const camCfg = thirdPerson
      ? (isTouch ? CAMERA_THIRD_PERSON_PHONE : CAMERA_THIRD_PERSON)
      : (isTouch ? CAMERA_PHONE : CAMERA_CONFIG);
    const aimLookahead = thirdPerson
      ? camCfg.AIM_LOOKAHEAD
      : (isTouch ? (CAMERA_PHONE.AIM_LOOKAHEAD ?? 1.5) : CAMERA_CONFIG.AIM_LOOKAHEAD);

    const lookAheadX = aimDir.x * aimLookahead;
    const lookAheadZ = aimDir.z * aimLookahead;
    const zoomMult = this.update();
    const pitchBias = thirdPerson ? 1.0 : (CAMERA_CONFIG.PITCH_BIAS || 1.0);

    desiredPos.set(
      playerPos.x + lookAheadX + shakeX,
      camCfg.OFFSET_Y * pitchBias * zoomMult,
      playerPos.z + (camCfg.OFFSET_Z * pitchBias * zoomMult) + lookAheadZ + shakeZ
    );
    camera.position.lerp(desiredPos, CAMERA_CONFIG.LERP_SPEED);

    if (thirdPerson) {
      lookPos.set(
        playerPos.x + lookAheadX * 0.5,
        camCfg.LOOK_Y ?? 1.5,
        playerPos.z - (camCfg.LOOK_AHEAD_Z ?? 6.0) + lookAheadZ * 0.5
      );
      target.lerp(lookPos, CAMERA_CONFIG.LERP_SPEED);
    } else {
      const forwardLead = camCfg.LOOK_FORWARD ?? (isTouch ? -0.4 : -1.3);
      lookPos.set(playerPos.x + lookAheadX * 0.5, 0, playerPos.z - forwardLead + lookAheadZ * 0.5);
      target.lerp(lookPos, CAMERA_CONFIG.LERP_SPEED);

      const maxLead = isTouch ? 2.5 : 4.0;
      if (playerPos.z - target.z > maxLead) {
        target.z = playerPos.z - maxLead;
      }
    }

    const targetFov = thirdPerson ? (camCfg.FOV || 62) : (CAMERA_CONFIG.FOV || 58);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * CAMERA_CONFIG.LERP_SPEED;
      camera.updateProjectionMatrix();
    } else if (camera.fov !== targetFov) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }

    camera.lookAt(target);
  }
}
