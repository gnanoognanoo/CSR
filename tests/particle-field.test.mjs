import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/background/particle-field.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { exports, module: { exports } });
const { createParticleField, smoothstepInfluence, frameEase, updateParticle, getParticleSettings } = exports;

const particleAt = (x, y) => ({ homeX: x, homeY: y, x, y, influence: 0, directionX: 1, directionY: 0 });
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);

test('home positions cover a stable jittered grid and stay within the viewport', () => {
  const width = 1280;
  const height = 720;
  const spacing = 26;
  const field = createParticleField(width, height, spacing);
  const columns = Math.ceil((width - spacing / 2) / spacing);
  const rows = Math.ceil((height - spacing / 2) / spacing);
  assert.equal(field.length, columns * rows);
  assert.equal(JSON.stringify(field), JSON.stringify(createParticleField(width, height, spacing)));
  const offsets = new Set();
  field.forEach((particle, index) => {
    const gridX = spacing / 2 + (index % columns) * spacing;
    const gridY = spacing / 2 + Math.floor(index / columns) * spacing;
    assert.ok(Math.abs(particle.homeX - gridX) <= spacing * 0.3);
    assert.ok(Math.abs(particle.homeY - gridY) <= spacing * 0.3);
    assert.ok(particle.homeX >= 0 && particle.homeX <= width);
    assert.ok(particle.homeY >= 0 && particle.homeY <= height);
    assert.equal(particle.x, particle.homeX);
    assert.equal(particle.y, particle.homeY);
    assert.equal(particle.influence, 0);
    offsets.add((particle.homeX - gridX).toFixed(2));
  });
  assert.ok(offsets.size > field.length / 3, 'jitter must not collapse into a repeated rigid pattern');
});

test('resizing keeps shared grid locations stable and handles transient dimensions', () => {
  const small = createParticleField(390, 667, 32);
  const large = createParticleField(700, 800, 32);
  const positions = new Set(large.map(p => `${p.homeX}:${p.homeY}`));
  for (const point of small) {
    if (point.homeX < 370 && point.homeY < 640) assert.ok(positions.has(`${point.homeX}:${point.homeY}`));
  }
  for (const [width, height] of [[0, 720], [1280, 0], [-1, 720], [NaN, 720], [1280, Infinity]]) {
    assert.equal(createParticleField(width, height).length, 0);
  }
  assert.equal(JSON.stringify(createParticleField(390, 667, 0)), JSON.stringify(createParticleField(390, 667)));
});

test('smoothstep has zero-slope boundaries, a bounded radius, and a continuous falloff', () => {
  close(smoothstepInfluence(0, 260), 1);
  close(smoothstepInfluence(130, 260), 0.5);
  close(smoothstepInfluence(260, 260), 0);
  close(smoothstepInfluence(500, 260), 0);
  let previous = 1;
  for (let distance = 0; distance <= 500; distance++) {
    const value = smoothstepInfluence(distance, 260);
    assert.ok(value >= 0 && value <= 1 && value <= previous);
    previous = value;
  }
  assert.ok(1 - smoothstepInfluence(0.1, 260) < 0.000001);
  assert.ok(smoothstepInfluence(259.9, 260) < 0.000001);
  for (const [distance, radius] of [[NaN, 260], [Infinity, 260], [100, 0], [100, NaN]]) {
    assert.equal(smoothstepInfluence(distance, radius), 0);
  }
});

test('repulsion moves radially away from the cursor on every cardinal direction', () => {
  for (const [x, y] of [[100, 0], [-100, 0], [0, 100], [0, -100]]) {
    const particle = particleAt(x, y);
    const identity = particle;
    const motion = updateParticle(particle, 0, 0, 260, 70, 0.15);
    assert.equal(particle, identity);
    assert.ok(Math.hypot(particle.x, particle.y) > 100);
    close(particle.x * y - particle.y * x, 0);
    close(Math.hypot(particle.directionX, particle.directionY), 1);
    close(motion, 70 * smoothstepInfluence(100, 260) * 0.15);
    assert.equal(particle.homeX, x);
    assert.equal(particle.homeY, y);
  }
});

test('a particle directly under the cursor has a stable finite outward direction', () => {
  const particle = particleAt(200, 200);
  updateParticle(particle, 200, 200, 260, 70, 1);
  assert.equal(particle.x, 270);
  assert.equal(particle.y, 200);
  assert.equal(particle.directionX, 1);
  assert.equal(particle.directionY, 0);
  assert.equal(particle.influence, 1);
});

test('particles smoothly settle at the displaced position and return home when inactive', () => {
  const particle = particleAt(50, 70);
  const x = particle.homeX;
  const y = particle.homeY;
  let lastMotion = Infinity;
  for (let frame = 0; frame < 180; frame++) {
    const motion = updateParticle(particle, 0, 0, 260, 70, 0.15);
    assert.ok(motion <= lastMotion + 1e-12);
    lastMotion = motion;
  }
  assert.ok(Math.hypot(particle.x - x, particle.y - y) <= 70);
  for (let frame = 0; frame < 180; frame++) updateParticle(particle, 0, 0, 260, 70, 0.15, 0);
  close(particle.x, x, 1e-9);
  close(particle.y, y, 1e-9);
  assert.equal(particle.influence, 0);
  assert.equal(particle.homeX, x);
  assert.equal(particle.homeY, y);
  updateParticle(particle, -9999, -9999, 260, 70, 1);
  assert.equal(particle.x, x);
  assert.equal(particle.y, y);
});

test('equivalent elapsed time gives consistent cursor and particle easing at different refresh rates', () => {
  for (const baseEase of [0.08, 0.15]) {
    close(frameEase(baseEase, 1000 / 60), baseEase);
    const after = refreshRate => {
      let position = 0;
      const ease = frameEase(baseEase, 1000 / refreshRate);
      for (let frame = 0; frame < refreshRate; frame++) position += (100 - position) * ease;
      return position;
    };
    close(after(30), after(60));
    close(after(60), after(120));
    close(frameEase(baseEase, 10000), frameEase(baseEase, 100));
    assert.equal(frameEase(baseEase, 0), 0);
    assert.equal(frameEase(baseEase, -1), 0);
    assert.ok(Number.isFinite(frameEase(baseEase, NaN)));
  }
});

test('mobile settings reduce interaction strength and density while retaining a capped raster ratio', () => {
  const desktop = getParticleSettings(false, 3);
  const mobile = getParticleSettings(true, 3);
  assert.equal(desktop.spacing, 26);
  assert.equal(desktop.radius, 260);
  assert.equal(desktop.push, 70);
  assert.equal(mobile.spacing, 32);
  assert.equal(mobile.radius, 200);
  assert.equal(mobile.push, 48);
  assert.ok(createParticleField(1280, 720, mobile.spacing).length < createParticleField(1280, 720, desktop.spacing).length * 0.75);
  for (const ratio of [0.75, 1, 2, 3, 4, 10]) {
    assert.equal(getParticleSettings(false, ratio).pixelRatio, Math.min(ratio, 2));
  }
  for (const ratio of [0, -1, NaN, Infinity]) assert.equal(getParticleSettings(false, ratio).pixelRatio, 1);
});
