import { PALETTE } from './palette.js';

export const SPELLS_T3 = {
  E_E_E: {
    id: 'E_E_E',
    tier: 3,
    name: 'Bhumyastra',
    lore: 'Mighty radial earthquake spike ring crushing adversaries. Blocks enemy projectiles and fortifies caster',
    elements: ['E', 'E', 'E'],
    trajectory: 'RADIAL',
    color: PALETTE.elements.PRITHVI,
    damage: 75,
    radius: 6,
    knockback: 5,
    stunDuration: 0.8,
    cooldown: 2.2,
    damageTakenMult: 0.7,
    damageTakenDuration: 4.0,
    damageReduction: 0.3,
    damageReductionDuration: 4.0,
    deflectsProjectiles: true
  },
  F_F_F: {
    id: 'F_F_F',
    tier: 3,
    name: 'Agneyastra',
    lore: 'Invincible thermonuclear firestorm consuming everything nearby. Blocks enemy projectiles',
    elements: ['F', 'F', 'F'],
    trajectory: 'RADIAL',
    color: PALETTE.elements.AGNI,
    damage: 85,
    speed: 0,
    range: 7.5,
    radius: 7.5,
    knockback: 4.0,
    burnDuration: 3.0,
    burnDps: 12,
    cooldown: 2.2,
    deflectsProjectiles: true,
    deflectHold: 0.3
  },
  W_W_W: {
    id: 'W_W_W',
    tier: 3,
    name: 'Varunastra',
    lore: 'Vast radial tidal surge sweeping away all resistance. Blocks enemy projectiles',
    elements: ['W', 'W', 'W'],
    trajectory: 'RADIAL',
    color: PALETTE.elements.JALA,
    damage: 70,
    radius: 7,
    knockback: 10,
    slowFactor: 0.4,
    slowDuration: 2.0,
    cooldown: 2.0,
    deflectsProjectiles: true
  }
};
