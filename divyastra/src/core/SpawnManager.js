import { Chest, ArcaneCrystal, ShadowBush } from '../entities/Prop.js';
import { Bot } from '../entities/Bot.js';
import { CHEST_COORDS, CRYSTAL_COORDS, BUSH_COORDS, MYTHIC_CHEST } from '../config/worldLayout.js';

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

    this.bushes = BUSH_COORDS.map(([x, z]) => new ShadowBush(x, z, this.scene));
  }

  startMatch(botCount = null) {
    this.cleanup();

    // Spawn Mythic center chest + 24 arena chests
    this.chests.push(new Chest(MYTHIC_CHEST[0], MYTHIC_CHEST[1], this.scene, true));
    CHEST_COORDS.forEach(([x, z]) => {
      this.chests.push(new Chest(x, z, this.scene, false));
    });

    // Spawn 8 Arcane Crystals
    CRYSTAL_COORDS.forEach(([x, z]) => {
      this.crystals.push(new ArcaneCrystal(x, z, this.scene));
    });

    // Spawn first N of BOT_SPAWNS
    const count = (botCount !== null && botCount !== undefined) ? Math.min(BOT_SPAWNS.length, botCount) : BOT_SPAWNS.length;
    for (let i = 0; i < count; i++) {
      const s = BOT_SPAWNS[i];
      const bx = Math.cos(s.angle) * s.r;
      const bz = Math.sin(s.angle) * s.r;
      this.bots.push(new Bot(this.scene, bx, bz, i + 1));
    }
  }

  spawnSingleBot() {
    const id = this.bots.length + 1;
    const angle = Math.random() * Math.PI * 2;
    const r = 16 + Math.random() * 24;
    const bx = Math.cos(angle) * r;
    const bz = Math.sin(angle) * r;
    const bot = new Bot(this.scene, bx, bz, id);
    this.bots.push(bot);
    return bot;
  }

  cleanup() {
    this.chests.forEach((c) => c.destroy());
    this.crystals.forEach((c) => c.destroy());
    this.bots.forEach((b) => b.destroy());
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

