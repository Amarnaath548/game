export class CollisionSystem {
  static checkCircle(aX, aZ, aRadius, bX, bZ, bRadius) {
    const dx = aX - bX;
    const dz = aZ - bZ;
    const combinedRadius = aRadius + bRadius;
    return (dx * dx + dz * dz) <= (combinedRadius * combinedRadius);
  }
}