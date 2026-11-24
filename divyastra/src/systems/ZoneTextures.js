import * as THREE from 'three';

export function createSwirlTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5A1A10';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = -256; i < 512; i += 28) {
    ctx.fillStyle = 'rgba(200, 67, 30, 0.45)';
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 44, 0);
    ctx.lineTo(i + 44 - 256, 256);
    ctx.lineTo(i - 256, 256);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(239, 230, 210, 0.3)';
    ctx.beginPath();
    ctx.moveTo(i + 14, 0);
    ctx.lineTo(i + 18, 0);
    ctx.lineTo(i + 18 - 256, 256);
    ctx.lineTo(i + 14 - 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

export function createWallGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 64, 0, 0);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.35)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 64);
  return new THREE.CanvasTexture(canvas);
}

// RingGeometry(...,64,1) layout: vertices 0..64 = inner ring, 65..129 = outer ring
export function setRing(geo, innerR, outerR, uvScale) {
  const pos = geo.attributes.position.array;
  const uv = geo.attributes.uv.array;
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const io = i * 3, oo = (65 + i) * 3;
    pos[io] = innerR * c; pos[io + 1] = 0; pos[io + 2] = innerR * s;
    pos[oo] = outerR * c; pos[oo + 1] = 0; pos[oo + 2] = outerR * s;
    uv[i * 2] = innerR * c * uvScale + 0.5;
    uv[i * 2 + 1] = innerR * s * uvScale + 0.5;
    uv[(65 + i) * 2] = outerR * c * uvScale + 0.5;
    uv[(65 + i) * 2 + 1] = outerR * s * uvScale + 0.5;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.uv.needsUpdate = true;
  geo.computeBoundingSphere();
}
