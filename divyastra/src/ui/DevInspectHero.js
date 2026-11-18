import * as THREE from 'three';
import { buildHeroVisual } from '../entities/HeroVisual.js';
import { updateTierVisuals } from '../entities/HeroTierVisuals.js';

export const INSPECT_ARCHETYPES = {
  'Tapasvi': { id: 'tapasvi', name: 'Tapasvi', archetype: 'TAPASVI', bodyColor: 0xe06014, accentColor: 0xfbbf24, hatType: 'JATA' },
  'Agni Sadhaka': { id: 'agni', name: 'Agni Sadhaka', archetype: 'AGNI', bodyColor: 0xd92638, accentColor: 0xf97316, hatType: 'FLAME_CREST' },
  'Jala Sadhaka': { id: 'jala', name: 'Jala Sadhaka', archetype: 'JALA', bodyColor: 0x0284c7, accentColor: 0x99f6e4, hatType: 'TURBAN' },
  'Prithvi Sadhaka': { id: 'prithvi', name: 'Prithvi Sadhaka', archetype: 'PRITHVI', bodyColor: 0x166534, accentColor: 0xc2410c, hatType: 'CIRCLET' }
};

export class DevInspectHero {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.set(0, 5, 0);

    this.currentArchetype = 'Tapasvi';
    this.currentTier = 1;
    this.autoRotate = true;
    this.currentAnim = 'idle';
    this.animTime = 0;

    this.initPedestal();
    this.initHero();
    this.scene.add(this.group);
  }

  initPedestal() {
    this.pedestalGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(2.6, 2.9, 0.45, 32);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0xD4A373, flatShading: true });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.25;
    base.receiveShadow = true;
    this.pedestalGroup.add(base);

    const rimGeo = new THREE.TorusGeometry(2.65, 0.08, 6, 32);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshLambertMaterial({ color: 0xFAEDCD });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = -0.02;
    this.pedestalGroup.add(rim);

    // Glowing subtle rune ring
    const runeGeo = new THREE.RingGeometry(1.6, 2.3, 32).rotateX(-Math.PI / 2);
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    const runeMesh = new THREE.Mesh(runeGeo, runeMat);
    runeMesh.position.y = 0.01;
    this.pedestalGroup.add(runeMesh);

    this.group.add(this.pedestalGroup);
  }

  initHero() {
    this.actor = {
      visualMesh: new THREE.Group(),
      heroMats: []
    };
    this.actor.visualMesh.scale.setScalar(2.5);
    this.group.add(this.actor.visualMesh);

    this.setArchetype(this.currentArchetype);
    this.setTier(this.currentTier);
  }

  setArchetype(name) {
    this.currentArchetype = name;
    const heroConfig = INSPECT_ARCHETYPES[name] || INSPECT_ARCHETYPES['Tapasvi'];

    while (this.actor.visualMesh.children.length > 0) {
      this.actor.visualMesh.remove(this.actor.visualMesh.children[0]);
    }
    if (this.actor.heroMats) {
      this.actor.heroMats.forEach((m) => m?.dispose?.());
      this.actor.heroMats = [];
    }

    buildHeroVisual(this.actor, heroConfig);
    this.setTier(this.currentTier);
  }

  setTier(tier) {
    this.currentTier = tier;
    updateTierVisuals(this.actor, tier, 0.016);
  }

  setOrbColor(hex) {
    if (this.actor?.staffOrbMat) {
      this.actor.staffOrbMat.color.setHex(hex);
    }
  }

  setAnimation(anim) {
    this.currentAnim = anim;
    this.animTime = 0;
    this.resetLimbs();
  }

  resetLimbs() {
    if (this.actor.leftArm) this.actor.leftArm.rotation.set(0, 0, 0);
    if (this.actor.rightArm) this.actor.rightArm.rotation.set(0, 0, 0);
    if (this.actor.leftLeg) this.actor.leftLeg.rotation.set(0, 0, 0);
    if (this.actor.rightLeg) this.actor.rightLeg.rotation.set(0, 0, 0);
    if (this.actor.visualMesh) {
      this.actor.visualMesh.position.y = 0;
      this.actor.visualMesh.rotation.set(0, 0, 0);
    }
  }

  update(dt = 0.016) {
    if (this.autoRotate) {
      this.actor.visualMesh.rotation.y += dt * 0.7;
    }

    updateTierVisuals(this.actor, this.currentTier, dt);

    this.animTime += dt;
    if (this.currentAnim === 'walk') {
      const wTime = this.animTime * 8;
      if (this.actor.leftLeg && this.actor.rightLeg) {
        this.actor.leftLeg.rotation.x = Math.sin(wTime) * 0.5;
        this.actor.rightLeg.rotation.x = -Math.sin(wTime) * 0.5;
      }
      if (this.actor.leftArm && this.actor.rightArm) {
        this.actor.leftArm.rotation.x = -Math.sin(wTime) * 0.4;
        this.actor.rightArm.rotation.x = Math.sin(wTime) * 0.4;
      }
      this.actor.visualMesh.position.y = Math.abs(Math.sin(wTime)) * 0.15;
    } else if (this.currentAnim === 'cast') {
      const pulse = Math.sin(this.animTime * 6) * 0.5 + 0.5;
      if (this.actor.rightArm) {
        this.actor.rightArm.rotation.x = -1.1 + pulse * 0.2;
      }
      if (this.actor.staffOrb) {
        const sc = (this.actor.tierBaseScale || 1.0) * (1.0 + pulse * 0.35);
        this.actor.staffOrb.scale.setScalar(sc);
      }
    } else if (this.currentAnim === 'punch') {
      const cycle = (this.animTime * 2.5) % 1.0;
      const punchDist = cycle < 0.3 ? (cycle / 0.3) : Math.max(0, 1.0 - (cycle - 0.3) / 0.7);
      if (this.actor.rightArm) {
        this.actor.rightArm.rotation.x = -punchDist * 1.5;
      }
    }
  }

  getMetrics() {
    let triangles = 0;
    const mats = new Set();

    this.actor.visualMesh.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geo = child.geometry;
        if (geo.index) {
          triangles += geo.index.count / 3;
        } else if (geo.attributes?.position) {
          triangles += geo.attributes.position.count / 3;
        }
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => mats.add(m));
          else mats.add(child.material);
        }
      }
    });

    return { triangles: Math.round(triangles), drawCalls: mats.size };
  }

  destroy() {
    this.scene.remove(this.group);
    if (this.actor.heroMats) {
      this.actor.heroMats.forEach((m) => m?.dispose?.());
    }
    this.group.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    });
  }
}
