import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class PostProcessingManager {
  constructor(renderer, scene, camera, qualityTier) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.bloomPass = null;
    this.enabled = false;
    this.setQuality(qualityTier);
  }

  setQuality(qualityTier) {
    if (qualityTier === 'HIGH') {
      if (!this.composer) {
        this.initComposer();
      }
      this.enabled = true;
    } else {
      this.enabled = false;
    }
  }

  initComposer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.35,
      0.6,
      0.85
    );
    this.composer.addPass(this.bloomPass);
  }

  setSize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  render() {
    if (this.enabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
  }
}
