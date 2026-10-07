export type Particle = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  influence: number;
  directionX: number;
  directionY: number;
};

const FRAME_DURATION = 1000 / 60;

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function gridNoise(column: number, row: number, salt: number): number {
  let hash = Math.imul(column + 1, 374761393) ^ Math.imul(row + 1, 668265263) ^ salt;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

/** Fixed home positions, regenerated only when the viewport changes. */
export function createParticleField(width: number, height: number, spacing = 26): Particle[] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
  const step = Number.isFinite(spacing) && spacing > 0 ? spacing : 26;
  const points: Particle[] = [];
  for (let row = 0, gridY = step / 2; gridY < height; row++, gridY += step) {
    for (let column = 0, gridX = step / 2; gridX < width; column++, gridX += step) {
      const homeX = Math.min(width, Math.max(0, gridX + (gridNoise(column, row, 0x13579bdf) - 0.5) * step * 0.6));
      const homeY = Math.min(height, Math.max(0, gridY + (gridNoise(column, row, 0x2468ace0) - 0.5) * step * 0.6));
      points.push({ homeX, homeY, x: homeX, y: homeY, influence: 0, directionX: 1, directionY: 0 });
    }
  }
  return points;
}

export function smoothstepInfluence(distance: number, radius: number): number {
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || radius <= 0) return 0;
  const t = clampUnit(1 - Math.max(0, distance) / radius);
  return t * t * (3 - 2 * t);
}

/** Equivalent to reference easing at 60 Hz, without jumps after suspended frames. */
export function frameEase(baseEase: number, deltaMs: number): number {
  const elapsed = Math.min(100, Math.max(0, Number.isFinite(deltaMs) ? deltaMs : FRAME_DURATION));
  if (elapsed === 0) return 0;
  return 1 - Math.pow(1 - clampUnit(baseEase), elapsed / FRAME_DURATION);
}

/** Update in place; zero influence restores the same remembered home position. */
export function updateParticle(
  particle: Particle,
  cursorX: number,
  cursorY: number,
  radius: number,
  push: number,
  ease: number,
  influenceScale = 1,
): number {
  const dx = particle.homeX - cursorX;
  const dy = particle.homeY - cursorY;
  const distance = Math.hypot(dx, dy);
  const directionValid = Number.isFinite(distance) && distance > 0;
  particle.directionX = directionValid ? dx / distance : 1;
  particle.directionY = directionValid ? dy / distance : 0;
  particle.influence = smoothstepInfluence(distance, radius) * clampUnit(influenceScale);

  const displacement = (Number.isFinite(push) ? Math.max(0, push) : 0) * particle.influence;
  const targetX = particle.homeX + particle.directionX * displacement;
  const targetY = particle.homeY + particle.directionY * displacement;
  const step = clampUnit(ease);
  const moveX = (targetX - particle.x) * step;
  const moveY = (targetY - particle.y) * step;
  particle.x += moveX;
  particle.y += moveY;
  return Math.max(Math.abs(moveX), Math.abs(moveY));
}

export function getParticleSettings(compact: boolean, devicePixelRatio: number) {
  return {
    spacing: compact ? 32 : 26,
    radius: compact ? 200 : 260,
    push: compact ? 48 : 70,
    pixelRatio: Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? Math.min(devicePixelRatio, 2) : 1,
  };
}
