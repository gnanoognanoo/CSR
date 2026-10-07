import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadModule(path) {
  const filename = new URL(path, import.meta.url);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, module: { exports } }, { filename: filename.pathname });
  return exports;
}

const spin = loadModule('../src/projects/model-spin.ts');
const geometry = loadModule('../src/projects/orbit-geometry.ts');
const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`);
function advance(state, index, seconds, fps = 60, options = {}) {
  for (let frame = 0; frame < Math.round(seconds * fps); frame++) {
    state = spin.advanceModelSpin(state, 1 / fps, { index, ...options });
  }
  return state;
}

test('all seven bodies make complete slow self-turns independently of their shared orbital revolution', () => {
  const speeds = new Set();
  for (let index = 0; index < 7; index++) {
    let state = spin.createModelSpin(index);
    speeds.add(state.speed);
    assert.ok(state.speed >= .12 && state.speed <= .18);
    for (let frame = 0; frame < 60 * 60; frame++) {
      const next = spin.advanceModelSpin(state, 1 / 60, { index });
      assert.ok(next.angle > state.angle, 'self-spin must continue through the back side, never reverse into a wiggle');
      state = next;
    }
    assert.ok(state.angle > Math.PI * 2, 'every object completes a full turn in under a minute');
    near(state.angle, spin.MODEL_SELF_SPIN_SPEEDS[index] * 60);
    assert.ok(state.angle > geometry.ORBIT_MODEL_SPEED * 60 * 4);
  }
  assert.equal(speeds.size, 7);
});

test('hover gently slows self-spin without reversing or snapping and release restores its speed', () => {
  const initial = advance(spin.createModelSpin(3), 3, 3);
  const firstHoveredFrame = spin.advanceModelSpin(initial, 1 / 60, { index: 3, hovered: true });
  assert.ok(firstHoveredFrame.speed < initial.speed && firstHoveredFrame.speed > initial.speed * .9);
  const hovered = advance(initial, 3, 2, 60, { hovered: true });
  assert.ok(hovered.angle > initial.angle);
  assert.ok(hovered.angle - initial.angle < initial.speed);
  near(hovered.speed, initial.speed * .24, .00001);
  const released = advance(hovered, 3, 2);
  assert.ok(released.angle > hovered.angle);
  near(released.speed, initial.speed, .00001);
});

test('modal pause, dragging, and reduced motion freeze the exact orientation without catch-up jumps', () => {
  const moving = advance(spin.createModelSpin(2), 2, 5);
  for (const reason of ['paused', 'dragging', 'reducedMotion']) {
    const held = advance(moving, 2, 30, 60, { [reason]: true });
    assert.equal(held, moving);
    const resumed = spin.advanceModelSpin(held, 1 / 60, { index: 2 });
    near(resumed.angle - held.angle, held.speed / 60);
  }
  for (const elapsed of [0, -1, NaN, Infinity]) {
    assert.equal(spin.advanceModelSpin(moving, elapsed, { index: 2 }), moving);
  }
  const recoveredFrame = spin.advanceModelSpin(moving, 20, { index: 2 });
  assert.ok(recoveredFrame.angle - moving.angle < .02, 'a delayed frame must not jump the model around');
});

test('hover and release integrate to the same orientation across normal frame rates', () => {
  const outputs = [30, 60, 144].map(fps => {
    let state = advance(spin.createModelSpin(6), 6, 3, fps);
    state = advance(state, 6, 2, fps, { hovered: true });
    return advance(state, 6, 3, fps);
  });
  for (const result of outputs.slice(1)) {
    near(result.angle, outputs[0].angle);
    near(result.speed, outputs[0].speed);
  }
});

test('full yaw normalization protects perspective silhouettes at off-axis positions and selected scale', () => {
  const vertices = [[-4, -.2, -.3], [4, .2, .3], [.2, 2, .9], [-.1, -2, -.9], [.7, .3, 3.5]];
  const targetSize = geometry.ORBIT_MODEL_SIZE;
  const maximumScale = geometry.ORBIT_ACTIVE_SCALE;
  const closestDistance = geometry.ORBIT_CAMERA_Z - 1.1;
  const envelope = { radius: 0, verticalSupport: 0 };
  for (const vertex of vertices) spin.includeSpinVertex(envelope, ...vertex, targetSize, maximumScale, closestDistance);
  const normalization = spin.fullSpinNormalization(envelope, targetSize, maximumScale, closestDistance);
  let largestCoverage = 0;
  for (const distance of [closestDistance, geometry.ORBIT_CAMERA_Z, geometry.ORBIT_CAMERA_Z + .55]) {
    for (const scale of [1, 1.025, maximumScale]) {
      for (const slopeX of [-spin.MODEL_MAX_CAMERA_SLOPE, 0, spin.MODEL_MAX_CAMERA_SLOPE]) {
        for (const slopeY of [-spin.MODEL_MAX_CAMERA_SLOPE, 0, spin.MODEL_MAX_CAMERA_SLOPE]) {
          const anchorX = slopeX * distance;
          const anchorY = slopeY * distance;
          for (let degree = 0; degree < 360; degree++) {
            const angle = degree * Math.PI / 180;
            for (const [x, y, z] of vertices) {
              const localX = (x * Math.cos(angle) + z * Math.sin(angle)) * normalization * scale;
              const localY = y * normalization * scale;
              const localZ = (-x * Math.sin(angle) + z * Math.cos(angle)) * normalization * scale;
              const dx = (anchorX + localX) / (distance - localZ) - anchorX / distance;
              const dy = (anchorY + localY) / (distance - localZ) - anchorY / distance;
              const half = targetSize * scale / distance / 2;
              assert.ok(Math.abs(dx) < half && Math.abs(dy) < half, `sweep exceeds footprint at ${degree} degrees`);
              largestCoverage = Math.max(largestCoverage, Math.abs(dx) / half, Math.abs(dy) / half);
            }
          }
        }
      }
    }
  }
  assert.ok(largestCoverage > .97, 'normalization should retain a large silhouette, not add excess padding');
});

test('the complete outer lane and its drag bounds stay inside the normalization camera allowance', () => {
  const period = Math.PI * 2 / geometry.ORBIT_MODEL_SPEED;
  for (const [width, height] of [[1190, 505], [372, 399], [640, 640], [2300, 820]]) {
    for (let phase = 0; phase < 36; phase++) {
      for (let index = 0; index < 7; index++) {
        for (const offset of [[0, 0, 0], [.45, 0, 0], [-.45, 0, 0], [0, .45, .05], [0, -.45, -.05]]) {
          for (const active of [0, 1]) {
            const { position } = geometry.getModelPose(index, phase / 36 * period, offset, width, height, { active, hover: 1 });
            const distance = geometry.ORBIT_CAMERA_Z - position.z;
            assert.ok(distance >= geometry.ORBIT_CAMERA_Z - 1.1);
            assert.ok(Math.abs(position.x / distance) < spin.MODEL_MAX_CAMERA_SLOPE);
            assert.ok(Math.abs(position.y / distance) < spin.MODEL_MAX_CAMERA_SLOPE);
          }
        }
      }
    }
  }
});
