import * as THREE from 'three';

const _tipPos = new THREE.Vector3();
const _orbColor = new THREE.Color();
const _zeroColor = new THREE.Color(0x000000);
let _glowTex = null;

function getGlowTexture() {
  if (_glowTex) return _glowTex;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.65)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}

export class CastWindup {
  constructor(player, scene, particleSys = null) {
    this.player = player;
    this.scene = scene;
    this.particleSys = particleSys;
    this.active = false;
    this.timer = 0;
    this.duration = 0.10;
    this.isTier3 = false;
    this.payloads = [];
    this.input = null;
    this.onFire = null;
    this.snapTimer = 0;
    this.orbFadeTimer = 0;
    this.orbElemColor = 0xf97316;

    const ringGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.glowRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd700, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false
    });
    this.glowRing = new THREE.Mesh(ringGeo, this.glowRingMat);
    this.glowRing.position.y = 0.06;
    this.glowRing.renderOrder = 6;
    this.glowRing.visible = false;
    this.scene.add(this.glowRing);

    const tex = getGlowTexture();
    this.flashes = [];
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex, color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.renderOrder = 8;
      this.scene.add(sprite);
      this.flashes.push({ sprite, mat, active: false, elapsed: 0, maxScale: 1.2 });
    }
  }

  isWindingUp() { return this.active; }

  triggerMuzzleFlash(x, y, z, colorHex = 0xf97316, isTier3 = false) {
    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      if (!f.active) {
        f.active = true;
        f.elapsed = 0;
        f.maxScale = isTier3 ? 2.2 : 1.2;
        f.mat.color.setHex(colorHex);
        f.mat.opacity = 1.0;
        f.sprite.position.set(x, y, z);
        f.sprite.scale.setScalar(0.3);
        f.sprite.visible = true;
        break;
      }
    }
  }

  _snapYaw() {
    if (this.input?.aimDir) {
      this.player.visualMesh.rotation.y = Math.atan2(this.input.aimDir.x, this.input.aimDir.z);
    }
  }

  start(payloads, input, spell, onFire) {
    if (this.active || this.player.isDead) return;
    const isRigged = !!this.player.glbHero?.isRigged;
    this.isTier3 = (payloads[0]?.tier === 3) || (spell?.tier === 3);
    const useCastClip = isRigged && !this.isTier3 && !!this.player.glbHero.actions?.cast;
    this.duration = isRigged ? (this.isTier3 ? 0.65 : (useCastClip ? 0.20 : 0.25)) : (this.isTier3 ? 0.25 : 0.10);
    this.timer = this.duration;
    this.payloads = payloads;
    this.input = input;
    this.onFire = onFire;
    this.active = true;
    this.orbFadeTimer = 0;
    this._snapYaw();
    this.player.glbHero?.startWindup(this.isTier3);

    const elemColor = spell?.color || 0xf97316;
    this.orbElemColor = elemColor;
    if (this.player.staffOrbMat) {
      this.player.staffOrbMat.color.setHex(elemColor);
      this.player.staffOrbMat.emissive?.setHex(elemColor);
    }
    if (this.player.staffOrb) this.player.staffOrb.scale.setScalar(1.6);

    if (this.isTier3) {
      this.glowRing.visible = true;
      this.glowRingMat.color.setHex(elemColor);
      this.glowRing.scale.set(0.1, 1, 0.1);
      this.glowRing.position.set(this.player.x, 0.06, this.player.z);
    }
  }

  update(dt) {
    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      if (!f.active) continue;
      f.elapsed += dt;
      const p = f.elapsed / 0.12;
      if (p >= 1) { f.active = false; f.sprite.visible = false; continue; }
      f.sprite.scale.setScalar(0.3 + (f.maxScale - 0.3) * p);
      f.mat.opacity = 1.0 - p;
    }

    const isRigged = !!this.player.glbHero?.isRigged;
    if (this.snapTimer > 0) {
      this.snapTimer = Math.max(0, this.snapTimer - dt);
      const ratio = this.snapTimer / 0.10;
      if (!this.player.glbHero) this.player.visualMesh.rotation.x = ratio * 0.35;
      if (!isRigged && this.player.rightArm) this.player.rightArm.rotation.x = -1.1 * ratio;
    }

    if (this.orbFadeTimer > 0) {
      this.orbFadeTimer = Math.max(0, this.orbFadeTimer - dt);
      const t = this.orbFadeTimer / 0.25;
      if (this.player.staffOrb) {
        const base = this.player.tierBaseScale || 1.25;
        this.player.staffOrb.scale.setScalar(base + (1.6 - base) * t);
      }
      if (this.player.staffOrbMat?.emissive) {
        _orbColor.setHex(this.orbElemColor);
        this.player.staffOrbMat.emissive.copy(_zeroColor).lerp(_orbColor, t);
      }
    }

    if (!this.active) return;
    if (this.player.isDead) { this.cancel(); return; }

    this.timer -= dt;
    this._snapYaw();

    if (!isRigged) {
      if (!this.player.glbHero) this.player.visualMesh.rotation.x = -0.32;
      if (this.player.rightArm) this.player.rightArm.rotation.x = 0.65;
      if (this.player.staffShaft) this.player.staffShaft.rotation.x = 0.65;
    }

    if (this.particleSys && this.player.visible && this.player.group.visible) {
      this.player.getStaffTipWorld(_tipPos);
      const count = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        this.particleSys.spawnSpiralParticle(this.player.x, this.player.z, _tipPos.x, _tipPos.y, _tipPos.z, this.orbElemColor);
      }
    }

    if (this.isTier3 && this.glowRing.visible) {
      const progress = Math.min(1.0, 1.0 - this.timer / this.duration);
      const ringScale = 0.1 + progress * 0.95;
      this.glowRing.scale.set(ringScale, 1, ringScale);
      this.glowRing.position.set(this.player.x, 0.06, this.player.z);
      this.glowRingMat.opacity = 0.4 + Math.sin(progress * Math.PI) * 0.55;
    }

    if (this.timer <= 0) {
      this.active = false;
      this.glowRing.visible = false;
      this.orbFadeTimer = 0.25;
      if (this.player.glbHero) {
        if (!isRigged) this.snapTimer = 0.10;
        this.player.glbHero.triggerSnap();
      } else {
        this.snapTimer = 0.10;
        this.player.visualMesh.rotation.x = 0.35;
      }
      if (!isRigged && this.player.rightArm) this.player.rightArm.rotation.x = -1.1;
      this.onFire?.(this.payloads, this.input);
    }
  }

  cancel() {
    this.active = false;
    this.glowRing.visible = false;
    this.snapTimer = 0;
    this.orbFadeTimer = 0;
    this.player.glbHero?.cancelCast();
    if (this.player.staffOrbMat) this.player.staffOrbMat.emissive?.setHex(0x000000);
    if (this.player.staffOrb) this.player.staffOrb.scale.setScalar(this.player.tierBaseScale || 1.25);
  }
}
