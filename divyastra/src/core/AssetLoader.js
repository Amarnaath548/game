import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ASSET_PATHS } from '../config/assets.js';

function toWebPath(path) {
  if (!path) return '';
  return path.startsWith('public/') ? `./${path.slice(7)}` : path;
}

export class AssetLoader {
  constructor() {
    this.icons = new Map();
    this.iconUrls = new Map();
    this.models = new Map();
    this.audioBuffers = new Map();
    this.rawAudio = new Map();
    this.audioCtx = null;
    this.gltfLoader = new GLTFLoader();
    this.loaded = false;
  }

  async loadAll(audioCtx = null) {
    if (audioCtx) this.audioCtx = audioCtx;
    const tasks = [];

    // 1. Spell Icons
    if (ASSET_PATHS.spells) {
      Object.entries(ASSET_PATHS.spells).forEach(([id, rawPath]) => {
        tasks.push(this.loadIcon(id, rawPath));
      });
    }

    // 2. Hero Models (.glb)
    if (ASSET_PATHS.heroes) {
      Object.entries(ASSET_PATHS.heroes).forEach(([id, rawPath]) => {
        tasks.push(this.loadModel(`hero_${id}`, rawPath));
      });
    }

    // 3. Prop Models (.glb)
    if (ASSET_PATHS.props) {
      Object.entries(ASSET_PATHS.props).forEach(([id, rawPath]) => {
        tasks.push(this.loadModel(`prop_${id}`, rawPath));
      });
    }

    // 4. SFX (.ogg)
    if (ASSET_PATHS.sfx) {
      Object.entries(ASSET_PATHS.sfx).forEach(([key, rawPath]) => {
        tasks.push(this.loadAudio(key, rawPath));
      });
    }

    // 5. BGM (.ogg)
    if (ASSET_PATHS.bgm) {
      tasks.push(this.loadAudio('bgm', ASSET_PATHS.bgm));
    }

    await Promise.allSettled(tasks);
    this.loaded = true;
  }

  loadIcon(id, rawPath) {
    return new Promise((resolve) => {
      const candidates = [
        toWebPath(rawPath),
        toWebPath(rawPath).replace(/\.png$/i, '.svg')
      ];

      const tryNext = (index) => {
        if (index >= candidates.length) {
          resolve(null);
          return;
        }
        const url = candidates[index];
        const img = new Image();
        img.onload = () => {
          this.icons.set(id, img);
          this.iconUrls.set(id, url);
          resolve(img);
        };
        img.onerror = () => tryNext(index + 1);
        img.src = url;
      };

      tryNext(0);
    });
  }

  loadModel(key, rawPath) {
    return new Promise((resolve) => {
      const url = toWebPath(rawPath);
      this.gltfLoader.load(
        url,
        (gltf) => {
          if (gltf && gltf.scene) {
            this.models.set(key, gltf.scene);
          }
          resolve(gltf);
        },
        undefined,
        () => resolve(null) // Silently fall back to procedural
      );
    });
  }

  async loadAudio(key, rawPath) {
    try {
      const url = toWebPath(rawPath);
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      this.rawAudio.set(key, arrayBuffer);
      if (this.audioCtx) {
        await this._decodeAudio(key, arrayBuffer);
      }
      return arrayBuffer;
    } catch {
      return null; // Silently fall back to procedural sound
    }
  }

  async _decodeAudio(key, arrayBuffer) {
    if (!this.audioCtx) return;
    try {
      const decoded = await this.audioCtx.decodeAudioData(arrayBuffer.slice(0));
      this.audioBuffers.set(key, decoded);
    } catch {
      // Ignore audio decode errors
    }
  }

  async setAudioContext(ctx) {
    if (!ctx) return;
    this.audioCtx = ctx;
    const decodePromises = [];
    for (const [key, rawBuffer] of this.rawAudio.entries()) {
      if (!this.audioBuffers.has(key)) {
        decodePromises.push(this._decodeAudio(key, rawBuffer));
      }
    }
    await Promise.allSettled(decodePromises);
  }

  getSpellIcon(spellId) {
    return this.icons.get(spellId) || null;
  }

  getSpellIconUrl(spellId) {
    return this.iconUrls.get(spellId) || null;
  }

  hasSpellIcon(spellId) {
    return this.iconUrls.has(spellId);
  }

  getHeroModel(heroId) {
    const scene = this.models.get(`hero_${heroId}`);
    return scene ? scene.clone(true) : null;
  }

  hasHeroModel(heroId) {
    return this.models.has(`hero_${heroId}`);
  }

  getPropModel(propKey) {
    const scene = this.models.get(`prop_${propKey}`);
    return scene ? scene.clone(true) : null;
  }

  hasPropModel(propKey) {
    return this.models.has(`prop_${propKey}`);
  }

  getAudioBuffer(soundKey) {
    return this.audioBuffers.get(soundKey) || null;
  }

  hasAudioBuffer(soundKey) {
    return this.audioBuffers.has(soundKey);
  }
}

export const assetLoader = new AssetLoader();
