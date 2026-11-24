/**
 * Asset Slot System Manifest
 * Optional asset paths to replace procedural graphics/audio.
 * Files in public/ are served at root by Vite.
 */

export const ASSET_PATHS = {
  // Spell icons per spell ID (PNG or SVG in public/icons/spells/)
  spells: {
    fist: 'public/icons/spells/fist.png',
    // Tier 1 Mantras
    E: 'public/icons/spells/E.png',
    F: 'public/icons/spells/F.png',
    W: 'public/icons/spells/W.png',
    // Tier 2 Shastras (Upgrades)
    E_PARVAT: 'public/icons/spells/E_PARVAT.png',
    E_KAVACHA: 'public/icons/spells/E_KAVACHA.png',
    F_JWALA: 'public/icons/spells/F_JWALA.png',
    F_DAHA: 'public/icons/spells/F_DAHA.png',
    W_PRAVAHA: 'public/icons/spells/W_PRAVAHA.png',
    W_HIMKANA: 'public/icons/spells/W_HIMKANA.png',
    // Tier 2 Combos / Side Effects
    E_LAVA: 'public/icons/spells/E_LAVA.png',
    E_MUD: 'public/icons/spells/E_MUD.png',
    F_LAVA: 'public/icons/spells/F_LAVA.png',
    F_STEAM: 'public/icons/spells/F_STEAM.png',
    W_STEAM: 'public/icons/spells/W_STEAM.png',
    W_MUD: 'public/icons/spells/W_MUD.png',
    // Tier 3 Astras
    E_ASTRA: 'public/icons/spells/E_ASTRA.png',
    F_ASTRA: 'public/icons/spells/F_ASTRA.png',
    W_ASTRA: 'public/icons/spells/W_ASTRA.png',
    E_E_E: 'public/icons/spells/E_E_E.png',
    F_F_F: 'public/icons/spells/F_F_F.png',
    W_W_W: 'public/icons/spells/W_W_W.png',
    E_ASTRA_LAVA: 'public/icons/spells/E_ASTRA_LAVA.png',
    E_ASTRA_MUD: 'public/icons/spells/E_ASTRA_MUD.png',
    F_ASTRA_LAVA: 'public/icons/spells/F_ASTRA_LAVA.png',
    F_ASTRA_STEAM: 'public/icons/spells/F_ASTRA_STEAM.png',
    W_ASTRA_STEAM: 'public/icons/spells/W_ASTRA_STEAM.png',
    W_ASTRA_MUD: 'public/icons/spells/W_ASTRA_MUD.png'
  },

  // Hero 3D models per hero ID (.glb in public/models/heroes/)
  heroes: {
    tapasvi: 'public/models/heroes/tapasvi.glb',
    agni: 'public/models/heroes/agni.glb',
    jala: 'public/models/heroes/jala.glb',
    prithvi: 'public/models/heroes/prithvi.glb'
  },

  // Prop 3D models per prop key (.glb in public/models/props/)
  props: {
    chest: 'public/models/props/chest.glb',
    chest_mythic: 'public/models/props/chest_mythic.glb',
    crystal: 'public/models/props/crystal.glb',
    bush: 'public/models/props/bush.glb',
    gem: 'public/models/props/gem.glb',
    health_orb: 'public/models/props/health_orb.glb'
  },

  // Sound effects per sound key (.ogg in public/audio/)
  sfx: {
    cast_fire: 'public/audio/cast_fire.ogg',
    cast_water: 'public/audio/cast_water.ogg',
    cast_earth: 'public/audio/cast_earth.ogg',
    hit_fire: 'public/audio/hit_fire.ogg',
    hit_water: 'public/audio/hit_water.ogg',
    hit_earth: 'public/audio/hit_earth.ogg',
    explosion: 'public/audio/explosion.ogg',
    player_damage: 'public/audio/player_damage.ogg',
    dash: 'public/audio/dash.ogg',
    pickup: 'public/audio/pickup.ogg',
    level_up: 'public/audio/level_up.ogg',
    kill: 'public/audio/kill.ogg',
    tapas_ready: 'public/audio/tapas_ready.ogg',
    heartbeat: 'public/audio/heartbeat.ogg'
  },

  // Looping background music (.ogg in public/audio/)
  bgm: 'public/audio/bgm.ogg'
};
