import * as THREE from 'three';

export class SideEffectZones {
  constructor(scene, particleSys = null) {
    this.scene = scene;
    this.particleSys = particleSys;
    this.maxZones = 20;
    this.zones = [];

    const geo = new THREE.RingGeometry(0.05, 1.0, 32);
    geo.rotateX(-Math.PI / 2);

    for (let i = 0; i < this.maxZones; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.035;
      mesh.visible = false;
      this.scene.add(mesh);
      this.zones.push({
        mesh, mat, active: false, x: 0, z: 0, radius: 3,
        dps: 0, slowFactor: 0, duration: 3, elapsed: 0,
        owner: null, spellId: null, type: 'LAVA', baseOpacity: 0.6,
        tickTimer: 0, puffTimer: 0
      });
    }
  }

  spawnZone(x, z, sideEffect, owner, spellId = null, radiusMult = 1.0) {
    if (!sideEffect) return;
    const type = sideEffect.id || sideEffect.name?.toUpperCase() || 'LAVA';

    // At most 4 zones per owner: reclaim oldest if limit reached
    const ownerZones = this.zones.filter((item) => item.active && item.owner === owner);
    if (ownerZones.length >= 4) {
      let oldest = ownerZones[0];
      for (const oz of ownerZones) {
        if (oz.elapsed > oldest.elapsed) oldest = oz;
      }
      oldest.active = false;
      oldest.mesh.visible = false;
    }

    let zItem = this.zones.find((item) => !item.active);
    if (!zItem) {
      // Reclaim oldest globally
      zItem = this.zones[0];
      for (const item of this.zones) {
        if (item.elapsed > zItem.elapsed) zItem = item;
      }
    }

    zItem.active = true;
    zItem.x = x;
    zItem.z = z;
    zItem.owner = owner;
    zItem.spellId = spellId;
    zItem.type = type;
    zItem.radius = (sideEffect.radius || 3.0) * radiusMult;
    zItem.duration = sideEffect.duration || 3.0;
    zItem.elapsed = 0;
    zItem.tickTimer = 0;
    zItem.puffTimer = 0;
    zItem.dps = sideEffect.dps || 0;
    zItem.slowFactor = sideEffect.slowFactor || 0;

    let col = 0xff4500, op = 0.65;
    if (type === 'STEAM') { col = 0xffffff; op = 0.38; }
    else if (type === 'MUD') { col = 0x5c3a21; op = 0.65; }

    zItem.baseOpacity = op;
    zItem.mat.color.setHex(col);
    zItem.mat.opacity = op;
    zItem.mesh.position.set(x, 0.035, z);
    zItem.mesh.scale.set(zItem.radius, 1, zItem.radius);
    zItem.mesh.visible = true;

    if (this.particleSys) {
      const pStyle = type === 'STEAM' ? 'DROPLET' : (type === 'LAVA' ? 'EMBER' : 'SHARD');
      this.particleSys.spawnBurst(x, 0.3, z, col, 8, 3, 0.8, pStyle);
    }
  }

  update(dt, allActors = [], resolver = null) {
    for (const zone of this.zones) {
      if (!zone.active) continue;
      zone.elapsed += dt;
      zone.tickTimer += dt;

      const remaining = zone.duration - zone.elapsed;
      if (remaining <= 0.5) {
        zone.mat.opacity = zone.baseOpacity * Math.max(0, remaining / 0.5);
      } else {
        zone.mat.opacity = zone.baseOpacity;
      }

      if (zone.elapsed >= zone.duration) {
        zone.active = false;
        zone.mesh.visible = false;
        continue;
      }

      if (zone.type === 'STEAM' && this.particleSys) {
        zone.puffTimer += dt;
        if (zone.puffTimer >= 0.18) {
          zone.puffTimer = 0;
          const ang = Math.random() * Math.PI * 2;
          const rDist = Math.random() * zone.radius * 0.8;
          this.particleSys.spawnBurst(zone.x + Math.cos(ang) * rDist, 0.3, zone.z + Math.sin(ang) * rDist, 0xffffff, 2, 2, 0.6, 'DROPLET');
        }
      }

      // Check slow for all enemies inside zone (0.3s duration so leaving loses slow within 0.3s)
      allActors.forEach((actor) => {
        if (actor.isDead || actor === zone.owner) return;
        if (Math.hypot(actor.x - zone.x, actor.z - zone.z) <= zone.radius + (actor.radius || 1.0)) {
          if (zone.slowFactor > 0) actor.applyChill?.(zone.slowFactor, 0.3);
        }
      });

      // Tick damage every 0.25s
      if (zone.dps > 0 && zone.tickTimer >= 0.25) {
        zone.tickTimer = 0;
        const tickDmg = Math.round(zone.dps * 0.25);
        if (tickDmg > 0) {
          allActors.forEach((actor) => {
            if (actor.isDead || actor === zone.owner) return;
            if (Math.hypot(actor.x - zone.x, actor.z - zone.z) <= zone.radius + (actor.radius || 1.0)) {
              actor.status.dotOwner = zone.owner;
              actor.status.dotSpellId = zone.spellId || zone.type;
              if (resolver) actor.onDeath = (killer, spellId) => resolver.handleKill(killer, actor, spellId);
              const dealt = actor.takeDamage(tickDmg);
              if (resolver?.damageNumbers && dealt > 0) {
                resolver.damageNumbers.spawn(actor.x, actor.z, dealt, zone.mat.color.getHex());
              }
              if (actor.isDead && !actor._killCredited) {
                actor._killCredited = true;
                if (resolver) resolver.handleKill(zone.owner, actor, zone.spellId || zone.type);
              }
            }
          });
        }
      }
    }
  }

  reset() {
    this.zones.forEach((z) => {
      z.active = false;
      if (z.mesh) z.mesh.visible = false;
    });
  }
}
