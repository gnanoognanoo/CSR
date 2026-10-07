import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/projects/useOrbitPhysics.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
vm.runInNewContext(code, { exports, module: { exports }, require: name => {
  assert.equal(name, 'react');
  return {};
} });
const { createOrbitPhysics, advanceOrbitPhysics, createOrbitPhysicsState, nearestOrbitIndex, nearestOrbitTarget } = exports;
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`);
const run = (controller, seconds = 3, fps = 60) => {
  for (let frame = 0; frame < seconds * fps; frame++) controller.tick(1 / fps);
};

test('clockwise angles focus successive choices and click targets take the shortest path', () => {
  assert.equal(nearestOrbitIndex(51.43, 7), 1);
  assert.equal(nearestOrbitIndex(-51.43, 7), 6);
  assert.equal(nearestOrbitIndex(360, 7), 0);
  close(nearestOrbitTarget(0, 6, 7), -360 / 7);
  close(nearestOrbitTarget(360, 1, 7), 360 + 360 / 7);
  close(nearestOrbitTarget(-720, 6, 7), -720 - 360 / 7);
});

test('wheel input creates continuous momentum, then settles at a real angular choice', () => {
  const visited = [];
  const controller = createOrbitPhysics({ count: 7, onFocus: index => visited.push(index) });
  controller.impulse(100);
  assert.equal(controller.rotation, 0, 'A wheel event does not jump to the next division');
  assert.ok(controller.velocity > 0);
  controller.tick(1 / 60);
  assert.ok(controller.rotation > 0 && controller.rotation < 360 / 7);
  run(controller);
  close(controller.rotation, 360 / 7);
  assert.equal(controller.velocity, 0);
  assert.equal(controller.isMoving, false);
  assert.deepEqual(visited, [1], 'Focus callbacks happen only when the nearest index changes');
  controller.impulse(-100);
  run(controller);
  close(controller.rotation, 0);
  assert.deepEqual(visited, [1, 0]);
});

test('inertia integration is frame-rate independent before snapping and does not mutate its input', () => {
  const initial = { ...createOrbitPhysicsState({ count: 7 }), velocity: 300, inputIdle: 0 };
  let sixty = initial;
  let oneTwenty = initial;
  for (let frame = 0; frame < 12; frame++) sixty = advanceOrbitPhysics(sixty, 1 / 60);
  for (let frame = 0; frame < 24; frame++) oneTwenty = advanceOrbitPhysics(oneTwenty, 1 / 120);
  close(sixty.rotation, oneTwenty.rotation);
  close(sixty.velocity, oneTwenty.velocity);
  assert.equal(initial.rotation, 0);
  assert.equal(initial.velocity, 300);
});

test('drag follows the pointer, carries momentum after release, and a held pointer loses stale velocity', () => {
  const controller = createOrbitPhysics({ count: 7 });
  controller.beginDrag();
  controller.dragBy(35, 0.05);
  close(controller.rotation, 35);
  assert.equal(controller.isDragging, true);
  controller.tick(1 / 60);
  close(controller.rotation, 35, 0.001);
  controller.endDrag();
  controller.tick(1 / 60);
  assert.ok(controller.rotation > 35);
  run(controller);
  close(controller.rotation % (360 / 7), 0, 0.001);

  controller.beginDrag();
  controller.dragBy(10, 0.02);
  run(controller, 1);
  assert.ok(Math.abs(controller.velocity) < 0.02);
  controller.endDrag();
  run(controller);
  assert.equal(controller.isMoving, false);
});

test('click completion fires exactly once after the chosen item reaches focus, and gestures cancel pending clicks', () => {
  let completed = 0;
  const controller = createOrbitPhysics({ count: 7 });
  controller.select(3, () => completed++);
  assert.equal(completed, 0);
  run(controller);
  assert.equal(completed, 1);
  assert.equal(controller.focus, 3);
  close(controller.rotation, 3 * 360 / 7);
  run(controller);
  assert.equal(completed, 1);
  controller.select(5, () => completed++);
  controller.impulse(-80);
  run(controller);
  assert.equal(completed, 1);
});

test('pausing overlays preserves exact angular state and separate controllers retain their own positions', () => {
  const divisions = createOrbitPhysics({ count: 7 });
  const projects = createOrbitPhysics({ count: 3 });
  divisions.impulse(90);
  run(divisions, 0.1);
  const angle = divisions.rotation;
  const velocity = divisions.velocity;
  divisions.pause(true);
  run(divisions);
  divisions.impulse(100);
  close(divisions.rotation, angle);
  close(divisions.velocity, velocity);
  projects.select(1);
  run(projects);
  close(projects.rotation, 120);
  close(divisions.rotation, angle);
  divisions.pause(false);
  run(divisions);
  assert.equal(divisions.isMoving, false);
  close(projects.rotation, 120);
});

test('empty archives, invalid input, and dynamic project counts remain finite and selectable', () => {
  const controller = createOrbitPhysics({ count: 0 });
  controller.impulse(100);
  controller.beginDrag();
  controller.dragBy(40);
  controller.endDrag();
  controller.select(3);
  run(controller);
  assert.equal(controller.rotation, 0);
  assert.equal(controller.focus, 0);
  controller.configure({ count: 5 });
  controller.select(4);
  run(controller);
  close(controller.rotation, -72);
  controller.setRotation(NaN);
  controller.impulse(Infinity);
  controller.tick(NaN);
  close(controller.rotation, -72);
  controller.configure({ count: 0 });
  run(controller);
  close(controller.rotation, -72);
  assert.equal(controller.focus, 0);
});

test('reduced motion permits input and selection with no inertial drift', () => {
  let completed = false;
  const controller = createOrbitPhysics({ count: 7, reducedMotion: true });
  controller.select(2, () => { completed = true; });
  assert.equal(completed, true);
  close(controller.rotation, 2 * 360 / 7);
  assert.equal(controller.velocity, 0);
  controller.beginDrag();
  controller.dragBy(40);
  controller.endDrag();
  assert.equal(controller.focus, 3);
  close(controller.rotation, 3 * 360 / 7);
  controller.impulse(100);
  assert.equal(controller.velocity, 0);
  run(controller, 0.5);
  assert.equal(controller.focus, 4);
  close(controller.rotation, 4 * 360 / 7);
});

test('rapid next and previous commands advance the pending slot before focus catches up', () => {
  const controller = createOrbitPhysics({ count: 6 });
  controller.step(1);
  run(controller, 0.1);
  assert.equal(controller.focus, 0, 'the first animation is still before its halfway point');
  const speed = controller.velocity;
  controller.step(1);
  assert.equal(controller.velocity, speed, 'continuing in the same direction preserves momentum');
  run(controller);
  close(controller.rotation, 120);
  assert.equal(controller.focus, 2);

  controller.step(-1);
  run(controller, 0.1);
  controller.step(-1);
  run(controller);
  close(controller.rotation, 0);
  assert.equal(controller.focus, 0);
});

test('step commands keep their direction across the last slot and beyond half or full turns', () => {
  const controller = createOrbitPhysics({ count: 6, initialRotation: 300 });
  controller.step(1);
  run(controller);
  close(controller.rotation, 360);
  assert.equal(controller.focus, 0);

  for (let index = 0; index < 8; index++) controller.step(1);
  let previous = controller.rotation;
  for (let frame = 0; frame < 180; frame++) {
    controller.tick(1 / 60);
    assert.ok(controller.rotation >= previous, 'queued forward steps must never take a backwards shortcut');
    previous = controller.rotation;
  }
  close(controller.rotation, 840);
  assert.equal(controller.focus, 2);

  for (let index = 0; index < 9; index++) controller.step(-1);
  previous = controller.rotation;
  for (let frame = 0; frame < 180; frame++) {
    controller.tick(1 / 60);
    assert.ok(controller.rotation <= previous, 'queued previous steps must never take a forward shortcut');
    previous = controller.rotation;
  }
  close(controller.rotation, 300);
  assert.equal(controller.focus, 5);
});

test('reversing rapid navigation subtracts from the requested slot and cancels stale click completion', () => {
  let completed = 0;
  const controller = createOrbitPhysics({ count: 6 });
  controller.select(2, () => completed++);
  run(controller, 0.1);
  controller.step(-1);
  run(controller);
  close(controller.rotation, 60);
  assert.equal(completed, 0);

  controller.step(1);
  run(controller, 0.1);
  controller.step(-1);
  assert.equal(controller.velocity, 0, 'reversing towards a target behind the current position drops opposing momentum');
  run(controller);
  close(controller.rotation, 60);
  assert.equal(controller.focus, 1);

  controller.select(5);
  run(controller);
  close(controller.rotation, -60, 0.001);
  assert.equal(controller.focus, 5, 'direct selection still uses the shortest route');
});

test('gesture cancellation clears queued steps before the next navigation command', () => {
  const controller = createOrbitPhysics({ count: 6 });
  controller.step(4);
  controller.beginDrag();
  controller.dragBy(-40, .1);
  controller.cancelDrag();
  assert.equal(controller.focus, 5);
  controller.step(-1);
  run(controller);
  close(controller.rotation, -120);
  assert.equal(controller.focus, 4);
});

test('stepping respects reduced motion, overlay pause, empty selectors and invalid input', () => {
  const controller = createOrbitPhysics({ count: 6, reducedMotion: true });
  controller.step(-1);
  close(controller.rotation, -60);
  assert.equal(controller.focus, 5);
  controller.step(2);
  close(controller.rotation, 60);
  assert.equal(controller.focus, 1);
  assert.equal(controller.velocity, 0);
  assert.equal(controller.isMoving, false);

  controller.pause(true);
  controller.step(1);
  close(controller.rotation, 60);
  controller.pause(false);
  for (const invalid of [NaN, Infinity, -Infinity, 0, .5]) controller.step(invalid);
  close(controller.rotation, 60);
  assert.equal(controller.isMoving, false);

  controller.configure({ count: 0 });
  controller.step(1);
  close(controller.rotation, 60);
  assert.equal(controller.isMoving, false);
});

test('unwrapped focus reports full turns and negative positions even when the wrapped slot stays unchanged', () => {
  const steps = [];
  const indices = [];
  const controller = createOrbitPhysics({ count: 6, onFocusStep: step => steps.push(step), onFocus: index => indices.push(index) });
  assert.deepEqual(steps, [], 'creating a controller does not publish an initial focus');
  controller.setRotation(360);
  controller.setRotation(-360);
  controller.setRotation(720);
  controller.setRotation(720);
  controller.setRotation(NaN);
  controller.tick(1 / 60);
  assert.deepEqual(steps, [6, -6, 12]);
  assert.deepEqual(indices, [], 'the existing wrapped callback still reports only wrapped changes');
});

test('large pointer movements publish the current unwrapped step without losing whole turns', () => {
  const steps = [];
  const controller = createOrbitPhysics({ count: 6, onFocusStep: step => steps.push(step) });
  controller.beginDrag();
  controller.dragBy(360, .05);
  controller.dragBy(360, .05);
  controller.dragBy(-1080, .05);
  assert.deepEqual(steps, [6, 12, -6]);
  assert.equal(controller.focus, 0);
  controller.cancelDrag();
  run(controller);
  assert.deepEqual(steps, [6, 12, -6], 'settled or cancelled gestures do not repeat focus notifications');
});

test('queued navigation publishes every unwrapped focus crossing in either direction', () => {
  const steps = [];
  const controller = createOrbitPhysics({ count: 6, onFocusStep: step => steps.push(step) });
  for (let index = 0; index < 8; index++) controller.step(1);
  run(controller);
  assert.deepEqual(steps, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(controller.focus, 2);
  for (let index = 0; index < 9; index++) controller.step(-1);
  run(controller);
  assert.deepEqual(steps, [1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1]);
  assert.equal(controller.focus, 5);
});

test('reduced motion and callback configuration preserve unwrapped focus without synthetic notifications', () => {
  const original = [];
  const replacement = [];
  const controller = createOrbitPhysics({ count: 6, reducedMotion: true, onFocusStep: step => original.push(step) });
  controller.step(6);
  controller.step(-12);
  assert.deepEqual(original, [6, -6], 'instant full turns must notify even when physical slot zero stays focused');
  controller.configure({ onFocusStep: step => replacement.push(step) });
  assert.deepEqual(replacement, [], 'installing a callback does not replay the existing focus');
  controller.configure({ count: 3 });
  assert.deepEqual(replacement, [-3], 'a changed slot count updates the nearest unwrapped physical step');
  controller.configure({ count: 3 });
  controller.pause(true);
  controller.step(1);
  assert.deepEqual(replacement, [-3]);
  controller.pause(false);
  controller.step(1);
  assert.deepEqual(replacement, [-3, -2]);
  controller.configure({ onFocusStep: undefined });
  controller.step(1);
  assert.deepEqual(replacement, [-3, -2], 'removing the callback stops subsequent notifications');
  assert.deepEqual(original, [6, -6]);
});

test('explicit unwrapped selection retains positive and negative turns and completes only after settling', () => {
  const steps = [];
  let completed = 0;
  const controller = createOrbitPhysics({ count: 6, onFocusStep: step => steps.push(step) });
  controller.selectStep(7, () => completed++);
  assert.equal(completed, 0);
  run(controller);
  close(controller.rotation, 420);
  assert.equal(controller.focus, 1);
  assert.equal(steps.at(-1), 7);
  assert.equal(completed, 1);
  run(controller);
  assert.equal(completed, 1);

  controller.selectStep(-1, () => completed++);
  run(controller);
  close(controller.rotation, -60);
  assert.equal(controller.focus, 5);
  assert.equal(steps.at(-1), -1);
  assert.equal(completed, 2);
  controller.select(1);
  run(controller);
  close(controller.rotation, 60, .001);
  assert.equal(controller.focus, 1, 'wrapped selection still follows its existing shortest-route semantics');
});

test('explicit selection composes with queued navigation, cancels stale completion, and validates its target', () => {
  let completed = 0;
  const controller = createOrbitPhysics({ count: 6, initialRotation: 360 });
  controller.selectStep(8, () => completed++);
  run(controller, .1);
  controller.step(1);
  run(controller);
  close(controller.rotation, 540);
  assert.equal(controller.focus, 3);
  assert.equal(completed, 0, 'a newer navigation request replaces the previous completion');

  controller.selectStep(11, () => completed++);
  controller.beginDrag();
  controller.cancelDrag();
  run(controller);
  assert.equal(completed, 0, 'gesture takeover cancels an unwrapped click selection');
  for (const invalid of [NaN, Infinity, -Infinity, Number.MAX_VALUE]) controller.selectStep(invalid, () => completed++);
  close(controller.rotation, 540);
  controller.configure({ count: 0 });
  controller.selectStep(3, () => completed++);
  close(controller.rotation, 540);
  assert.equal(completed, 0);

  controller.configure({ count: 6, reducedMotion: true });
  controller.selectStep(-7, () => completed++);
  close(controller.rotation, -420);
  assert.equal(completed, 1, 'reduced-motion selections complete immediately at the exact requested turn');
});
