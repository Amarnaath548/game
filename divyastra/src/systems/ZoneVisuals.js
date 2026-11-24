import * as THREE from 'three';
import { ARENA } from '../config/constants.js';
import { PALETTE } from '../config/palette.js';
import { createSwirlTexture, createWallGradientTexture, setRing } from './ZoneTextures.js';

export class ZoneVisuals {
  constructor(scene) {
    this.scene = scene;
    this.elapsed = 0;

    // 1. Storm band (vertices updated each frame via setRing, no mesh scaling)
    this.bandOuter = ARENA.RADIUS + 30;
    const bandGeo = new THREE.RingGeometry(1, this.bandOuter, 64, 1);
    this.bandGeo = bandGeo;
    this.swirlTex = createSwirlTexture();
    this.bandMat = new THREE.MeshBasicMaterial({
      map: this.swirlTex,
      color: 0x5A1A10,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      fog: false
    });
    this.stormBand = new THREE.Mesh(bandGeo, this.bandMat);
    this.stormBand.position.y = 0.25;
    this.stormBand.renderOrder = 5;
    this.stormBand.frustumCulled = false;
    this.scene.add(this.stormBand);

    // 2. Boundary wall: open-ended cylinder, height 14, 64 segments
    const wallGeo = new THREE.CylinderGeometry(1, 1, 14, 64, 8, true);
    this.wallGradTex = createWallGradientTexture();
    this.wallMat = new THREE.MeshBasicMaterial({
      color: PALETTE.sindoor,
      map: this.wallGradTex,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      fog: false
    });
    this.wall = new THREE.Mesh(wallGeo, this.wallMat);
    this.wall.position.y = 7.3;
    this.wall.renderOrder = 998;
    this.scene.add(this.wall);

    // 3. Danger edge ring: width 3 units, dynamic vertices
    this.edgeGeo = new THREE.RingGeometry(1, 4, 64, 1);
    this.edgeMat = new THREE.MeshBasicMaterial({
      color: PALETTE.sindoor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      fog: false
    });
    this.edgeRing = new THREE.Mesh(this.edgeGeo, this.edgeMat);
    this.edgeRing.position.y = 0.27;
    this.edgeRing.renderOrder = 5;
    this.edgeRing.frustumCulled = false;
    this.scene.add(this.edgeRing);

    // 4. Ground arrow near player pointing to zone center
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 1.4);
    arrowShape.lineTo(0.9, -0.7);
    arrowShape.lineTo(0.35, -0.45);
    arrowShape.lineTo(0.35, -1.2);
    arrowShape.lineTo(-0.35, -1.2);
    arrowShape.lineTo(-0.35, -0.45);
    arrowShape.lineTo(-0.9, -0.7);
    arrowShape.closePath();
    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    arrowGeo.rotateX(-Math.PI / 2);
    this.arrowMat = new THREE.MeshBasicMaterial({
      color: PALETTE.gold,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      fog: false
    });
    this.arrowMesh = new THREE.Mesh(arrowGeo, this.arrowMat);
    this.arrowMesh.position.y = 0.35;
    this.arrowMesh.renderOrder = 1000;
    this.arrowMesh.visible = false;
    this.scene.add(this.arrowMesh);

    this._initDomOverlays();
  }

  _initDomOverlays() {
    this.warningBanner = document.getElementById('zone-shrink-warning');
    if (!this.warningBanner) {
      this.warningBanner = document.createElement('div');
      this.warningBanner.id = 'zone-shrink-warning';
      this.warningBanner.style.cssText = 'position:fixed;top:54px;left:50%;transform:translateX(-50%);background:rgba(200,67,30,0.92);color:#efe6d2;font:bold 15px monospace,sans-serif;letter-spacing:1px;padding:6px 20px;border-radius:6px;border:2px solid #e08a2e;box-shadow:0 0 16px rgba(200,67,30,0.8);z-index:9999;display:none;pointer-events:none;text-shadow:0 1px 3px #000;';
      document.body.appendChild(this.warningBanner);
    }

    this.vignetteEl = document.getElementById('storm-vignette');
    if (!this.vignetteEl) {
      this.vignetteEl = document.createElement('div');
      this.vignetteEl.id = 'storm-vignette';
      this.vignetteEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9990;display:none;background:radial-gradient(circle at center,transparent 40%,rgba(90,26,16,0.45) 80%,rgba(90,26,16,0.8) 100%);';
      document.body.appendChild(this.vignetteEl);
    }

    this.stormLabelEl = document.getElementById('storm-in-label');
    if (!this.stormLabelEl) {
      this.stormLabelEl = document.createElement('div');
      this.stormLabelEl.id = 'storm-in-label';
      this.stormLabelEl.textContent = '⚡ IN STORM ⚡';
      this.stormLabelEl.style.cssText = 'position:fixed;top:90px;left:50%;transform:translateX(-50%);background:rgba(90,26,16,0.95);color:#efe6d2;font:900 14px monospace,sans-serif;letter-spacing:2px;padding:4px 16px;border-radius:5px;border:1px solid #c8431e;box-shadow:0 0 12px rgba(200,67,30,0.9);z-index:9999;display:none;pointer-events:none;text-shadow:0 1px 3px #000;';
      document.body.appendChild(this.stormLabelEl);
    }
  }

  update(dt, zoneSys, player) {
    this.elapsed += dt;
    const r = zoneSys.currentRadius;
    const phaseIdx = zoneSys.currentPhaseIndex;

    // 1. Storm band: inner = r, outer fixed
    setRing(this.bandGeo, r, this.bandOuter, 1 / (this.bandOuter * 2));
    this.bandMat.opacity = phaseIdx >= 2 ? 0.45 : 0.35;

    // 2. Scroll swirl texture
    this.swirlTex.offset.x = (this.elapsed * 0.035) % 1;
    this.swirlTex.offset.y = (this.elapsed * 0.018) % 1;

    // 3. Wall follows zone radius
    this.wall.scale.set(r, 1, r);

    // 4. Edge ring stays 3 units wide
    setRing(this.edgeGeo, Math.max(0.1, r - 1.5), r + 1.5, 0);

    // Pulse wall and edge ring with sin(time*3) between 0.6x and 1.0x
    const pulse = 0.8 + 0.2 * Math.sin(this.elapsed * 3);
    this.wallMat.opacity = 0.55 * pulse;

    // 5. Pre-shrink warning: last 5 seconds before a shrink
    const timeUntilShrink = zoneSys.getTimeUntilNextShrink();
    const isShrinking = zoneSys.isShrinking();
    if (!isShrinking && timeUntilShrink <= 5 && timeUntilShrink > 0) {
      const flash = Math.sin(this.elapsed * 4 * Math.PI * 2) > 0;
      this.edgeMat.color.setHex(flash ? PALETTE.saffron : PALETTE.bone);
      this.edgeMat.opacity = 0.95;
      const sec = Math.max(1, Math.ceil(timeUntilShrink));
      this.warningBanner.textContent = `ZONE SHRINKING IN ${sec}s`;
      this.warningBanner.style.display = 'block';
    } else {
      this.edgeMat.color.setHex(PALETTE.sindoor);
      this.edgeMat.opacity = 0.9 * pulse;
      this.warningBanner.style.display = 'none';
    }

    // 6 & 7. Player edge pointer & in-storm vignette
    if (player && !player.isDead) {
      const pDist = Math.hypot(player.x - zoneSys.centerX, player.z - zoneSys.centerZ);
      const inStorm = pDist > r;
      const nearEdge = (r - pDist) <= 15;

      if (inStorm) {
        this.vignetteEl.style.display = 'block';
        const vigAlpha = 0.35 + 0.1 * Math.sin(this.elapsed * 4);
        this.vignetteEl.style.opacity = vigAlpha.toFixed(3);
        this.stormLabelEl.style.display = 'block';
      } else {
        this.vignetteEl.style.display = 'none';
        this.stormLabelEl.style.display = 'none';
      }

      if (inStorm || nearEdge) {
        this.arrowMesh.visible = true;
        const toCx = zoneSys.centerX - player.x;
        const toCz = zoneSys.centerZ - player.z;
        const d = Math.hypot(toCx, toCz) || 1;
        const nx = toCx / d, nz = toCz / d;
        this.arrowMesh.position.set(player.x + nx * 2.2, 0.35, player.z + nz * 2.2);
        this.arrowMesh.lookAt(zoneSys.centerX, 0.35, zoneSys.centerZ);
        this.arrowMat.color.setHex(inStorm ? PALETTE.sindoor : PALETTE.gold);
      } else {
        this.arrowMesh.visible = false;
      }
    } else {
      this.vignetteEl.style.display = 'none';
      this.stormLabelEl.style.display = 'none';
      this.arrowMesh.visible = false;
    }
  }

  dispose() {
    this.scene.remove(this.stormBand);
    this.scene.remove(this.wall);
    this.scene.remove(this.edgeRing);
    this.scene.remove(this.arrowMesh);
    if (this.warningBanner) this.warningBanner.style.display = 'none';
    if (this.vignetteEl) this.vignetteEl.style.display = 'none';
    if (this.stormLabelEl) this.stormLabelEl.style.display = 'none';
  }
}
