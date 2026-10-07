import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../src/projects/model-motion.ts', import.meta.url));
const exports = {};
const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(source, { exports, module: { exports } }, { filename });
const { createModelMotionController, MAX_MODEL_OFFSET, MAX_MODEL_THROW_SPEED, MODEL_DRAG_THRESHOLD_PX, isModelDrag } = exports;
const advance = (motion, seconds, frameRate = 60, reducedMotion = false) => {
  for (let frame = 0; frame < Math.round(seconds * frameRate); frame++) motion.tick(1 / frameRate, reducedMotion);
};

const grab = (motion, x, y = 0, duration = .05) => {
  motion.beginDrag(0);
  motion.dragBy(0, x, y, duration);
  advance(motion, duration);
};

test('pointer jitter is a click; an 8-pixel accumulated movement becomes a drag', () => {
  assert.equal(MODEL_DRAG_THRESHOLD_PX, 8);
  assert.equal(isModelDrag(5, 5), false);
  assert.equal(isModelDrag(8, 0), true);
  assert.equal(isModelDrag(0, -8), true);
  assert.equal(isModelDrag(6, 6), true);
});

test('only the held model detaches while the other models keep revolving', () => {
  const motion = createModelMotionController();
  advance(motion, 1);
  const anchorTime = motion.get(2).orbitTime;
  motion.beginDrag(2);
  motion.dragBy(2, 4, 2, .05);
  assert.equal(motion.get(2).offset[0], 0, 'pointer input sets a target rather than teleporting the object');
  motion.tick(1 / 60);
  assert.ok(motion.get(2).offset[0] > 0 && motion.get(2).offset[0] < 4, 'the object follows with mass');
  advance(motion, .5);
  assert.ok(motion.get(2).offset[0] > 3.99);
  assert.equal(motion.get(2).dragging, true);
  assert.equal(motion.get(2).free, true);
  assert.ok(motion.get(2).held > .99);
  assert.equal(motion.get(2).orbitTime, anchorTime, 'held anchor must not drift under the pointer');
  assert.ok(motion.time > anchorTime + .5);
  for (const index of [0, 1, 3, 4, 5, 6]) {
    assert.equal(Math.hypot(...motion.get(index).offset), 0);
    assert.equal(motion.get(index).orbitTime, motion.time);
  }
});

test('release throws, floats, and settles onto the moving orbit within about two seconds', () => {
  const motion = createModelMotionController();
  grab(motion, 3, -1, .05);
  motion.endDrag(0);
  const releaseOffset = motion.get(0).offset[0];
  assert.ok(motion.get(0).velocity[0] > 0);
  assert.equal(motion.get(0).dragging, false);
  advance(motion, .1);
  assert.ok(motion.get(0).offset[0] > releaseOffset, 'release keeps directional momentum before attraction');
  advance(motion, 2);
  assert.equal(Math.hypot(...motion.get(0).offset), 0);
  assert.equal(Math.hypot(...motion.get(0).velocity), 0);
  assert.equal(motion.get(0).free, false);
  assert.equal(motion.get(0).orbitTime, motion.time);
  assert.ok(motion.get(0).held < .001);
});

test('a long hold resumes its moving orbital phase smoothly, without freezing other models', () => {
  const motion = createModelMotionController();
  advance(motion, 1);
  motion.beginDrag(1);
  advance(motion, 12);
  const frozenTime = motion.get(1).orbitTime;
  assert.ok(Math.abs(frozenTime - 1) < 1e-10);
  assert.ok(motion.time > 12);
  motion.endDrag(1);
  motion.tick(1 / 60);
  assert.ok(motion.get(1).orbitTime > frozenTime);
  assert.ok(motion.get(1).orbitTime < motion.time - 1, 'return starts with a blend rather than teleporting to the live phase');
  advance(motion, 2);
  assert.equal(motion.get(1).orbitTime, motion.time);
  assert.equal(motion.get(1).free, false);
});

test('a held-still or cancelled model returns softly without a stale throw', () => {
  const motion = createModelMotionController();
  grab(motion, 5);
  advance(motion, .5);
  motion.endDrag(0);
  assert.ok(Math.hypot(...motion.get(0).velocity) < .01);
  advance(motion, 2);
  assert.equal(Math.hypot(...motion.get(0).offset), 0);
  grab(motion, 3, 2);
  const cancelledAt = [...motion.get(0).offset];
  motion.cancelDrag(0);
  assert.deepEqual(Array.from(motion.get(0).offset), cancelledAt, 'cancellation must not snap the model');
  assert.equal(Math.hypot(...motion.get(0).velocity), 0);
  advance(motion, 2);
  assert.equal(motion.get(0).free, false);
});

test('outlier input is bounded but models can move far beyond the old short orbital lane', () => {
  const motion = createModelMotionController();
  grab(motion, 8, -4, .1);
  assert.ok(Math.hypot(...motion.get(0).offset) > 4, 'drag is a scene-wide excursion');
  motion.dragBy(0, 1000, -500, .00001, 100);
  advance(motion, .1);
  assert.ok(Math.hypot(...motion.get(0).offset) <= MAX_MODEL_OFFSET + 1e-10);
  motion.endDrag(0);
  assert.ok(Math.hypot(...motion.get(0).velocity) <= MAX_MODEL_THROW_SPEED + 1e-10);
  advance(motion, 4);
  assert.equal(Math.hypot(...motion.get(0).offset), 0);
});

test('overlay motion slows the background while pause preserves exact physics state', () => {
  const motion = createModelMotionController();
  motion.slow(.06);
  advance(motion, 1);
  assert.ok(Math.abs(motion.time - .06) < 1e-10);
  motion.slow(1);
  motion.pause(true);
  const before = JSON.stringify(motion.get(0));
  const time = motion.time;
  motion.tick(90);
  assert.equal(motion.time, time);
  assert.equal(JSON.stringify(motion.get(0)), before);
  motion.pause(false);
  motion.tick(90);
  assert.ok(motion.time - time <= .1 + 1e-10, 'a background-tab delay cannot become a large jump');
});

test('reduced motion allows direct dragging and disables autonomous orbit, throws, and returns', () => {
  const motion = createModelMotionController();
  motion.beginDrag(3);
  motion.dragBy(3, 4, -2, .05);
  motion.tick(1 / 60, true);
  assert.equal(motion.time, 0);
  assert.equal(motion.get(3).offset[0], 4);
  motion.endDrag(3);
  motion.tick(1 / 60, true);
  assert.equal(Math.hypot(...motion.get(3).offset), 0);
  assert.equal(Math.hypot(...motion.get(3).velocity), 0);
  assert.equal(motion.get(3).free, false);
});

test('following, inertial float, and spring return agree at mobile and desktop frame rates', () => {
  const atRate = rate => {
    const motion = createModelMotionController();
    motion.beginDrag(0);
    motion.dragBy(0, 5, 3, .1);
    advance(motion, .1, rate);
    motion.endDrag(0);
    advance(motion, .5, rate);
    return motion.get(0);
  };
  const desktop = atRate(60), mobile = atRate(30);
  assert.ok(Math.hypot(...desktop.offset.map((value, axis) => value - mobile.offset[axis])) < .001);
  assert.ok(Math.hypot(...desktop.velocity.map((value, axis) => value - mobile.velocity[axis])) < .001);
});

test('invalid or idle input cannot poison a model state', () => {
  const motion = createModelMotionController();
  motion.dragBy(0, 5, 0, .1);
  assert.equal(Math.hypot(...motion.get(0).offset), 0);
  motion.beginDrag(0);
  motion.dragBy(0, NaN, 4, .1);
  motion.tick(Infinity);
  motion.slow(NaN);
  assert.equal(Math.hypot(...motion.get(0).offset), 0);
  assert.equal(motion.speed, 1);
  assert.throws(() => motion.get(100), { name: 'RangeError' });
});
