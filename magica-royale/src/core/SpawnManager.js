import { Chest, ArcaneCrystal, ShadowBush } from '../entities/Prop.js';
import { Bot } from '../entities/Bot.js';

const CHEST_COORDS = [
  [-20, -20], [20, -20], [-20, 20], [20, 20],
  [-45, -25], [45, -25], [-45, 25], [45, 25],
  [0, 50], [0, -50], [-50, 0], [50, 0],
  [-75, -40], [75, -40], [-75, 40], [75, 40],
  [40, 70], [-40, -70], [70, 40], [-70, -40],
  [-90, 0], [90, 0], [0, -90], [0, 90]
];

const CRYSTAL_COORDS = [
  [-35, 0], [35, 0], [0, -35], [0, 35],
  [-60, -60], [60, 60], [-60, 60], [60, -60]
];

const BOT_SPAWNS = [
  { r: 26, angle: 0.5 }, { r: 28, angle: 2.6 }, { r: 30, angle: 4.7 },
  { r: 48, angle: 1.2 }, { r: 50, angle: 2.8 }, { r: 52, angle: 4.4 }, { r: 46, angle: 5.9 },
  { r: 68, angle: 0.8 }, { r: 72, angle: 2.3 }, { r: 75, angle: 3.9 }, { r: 78, angle: 5.4 }
];

export class SpawnManager {
  constructor(scene, gems, healthOrbs) {
    this.scene = scene;
    this.gems = gems;
    this.healthOrbs = healthOrbs;

    this.chests = [];
    this.crystals = [];
    this.bots = [];

    this.bushes = [
      new ShadowBush(-20, -12, this.scene),
      new ShadowBush(20, 12, this.scene),
      new ShadowBush(-15, 28, this.scene),
      new ShadowBush(15, -28, this.scene),
      new ShadowBush(-42, 15, this.scene),
      new ShadowBush(42, -15, this.scene)
    ];
  }

  startMatch() {
    this.cleanup();

    // Spawn Mythic center chest + 24 arena chests
    this.chests.push(new Chest(0, -12, this.scene, true));
    CHEST_COORDS.forEach(([x, z]) => {
      this.chests.push(new Chest(x, z, this.scene, false));
    });

    // Spawn 8 Arcane Crystals
    CRYSTAL_COORDS.forEach(([x, z]) => {
      this.crystals.push(new ArcaneCrystal(x, z, this.scene));
    });

    // Spawn 11 Bots across inner, mid, and outer rings
    for (let i = 0; i < BOT_SPAWNS.length; i++) {
      const s = BOT_SPAWNS[i];
      const bx = Math.cos(s.angle) * s.r;
      const bz = Math.sin(s.angle) * s.r;
      this.bots.push(new Bot(this.scene, bx, bz, i + 1));
    }
  }

  cleanup() {
    this.chests.forEach((c) => c.destroy());
    this.crystals.forEach((c) => c.destroy());
    this.bots.forEach((b) => b.die());
    this.chests = [];
    this.crystals = [];
    this.bots = [];
  }

  dropLoot(x, z, gemCount = 3, healthOrbChance = 0.35) {
    for (let i = 0; i < gemCount; i++) {
      const gem = this.gems.find((g) => !g.active);
      if (gem) {
        gem.pool.acquire();
        const ox = (Math.random() - 0.5) * 2;
        const oz = (Math.random() - 0.5) * 2;
        gem.spawn(x + ox, z + oz, 30);
      }
    }
    if (Math.random() < healthOrbChance) {
      const orb = this.healthOrbs.find((o) => !o.active);
      if (orb) {
        orb.pool.acquire();
        orb.spawn(x, z, 0.25);
      }
    }
  }

  updateProps(dt) {
    this.chests.forEach((c) => c.update(dt));
    this.crystals.forEach((c) => c.update(dt));
  }
}

