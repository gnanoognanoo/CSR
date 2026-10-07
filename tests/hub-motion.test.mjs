import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../src/projects/hub-motion.ts', import.meta.url));
const exports = {};
const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(source, { exports, module: { exports } }, { filename });
const { getHubPulsePose, createHubMotionController } = exports;
const almostEqual = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`);
const assertRest = pose => {
  assert.equal(pose.liftPx, 0);
  assert.equal(pose.rotationY, 0);
};
const advance = (controller, seconds, frameRate = 60) => {
  for (let frame = 0; frame < Math.round(seconds * frameRate); frame++) controller.tick(1 / frameRate);
};

test('the first pulse waits two seconds and subsequent pulses repeat at a two-second cadence', () => {
  for (const elapsed of [0, .5, 1, 1.99, 2]) assertRest(getHubPulsePose(elapsed));
  assert.ok(getHubPulsePose(2.1).liftPx > 0);
  for (let cycle = 1; cycle < 50; cycle++) {
    for (const phase of [.1, .20, .35, .6, .8]) {
      const first = getHubPulsePose(2 + phase);
      const repeated = getHubPulsePose(2 + cycle * 2 + phase);
      almostEqual(repeated.liftPx, first.liftPx);
      almostEqual(repeated.rotationY, first.rotationY);
    }
  }
});

test('each pulse lifts in 0.20 seconds, turns on Y for 0.65 seconds, then settles for 0.30 seconds', () => {
  for (const elapsed of [2.20, 2.35, 2.5, 2.70]) assert.equal(getHubPulsePose(elapsed).liftPx, 8);
  assert.equal(getHubPulsePose(2.05).rotationY, 0);
  almostEqual(getHubPulsePose(2.375).rotationY, Math.PI);
  assert.ok(getHubPulsePose(2.69).rotationY < Math.PI * 2);
  assert.equal(getHubPulsePose(2.70).rotationY, Math.PI * 2);
  almostEqual(getHubPulsePose(2.85).liftPx, 4);
  assert.equal(getHubPulsePose(2.85).rotationY, Math.PI * 2, 'the completed turn remains at its starting orientation while settling');
  for (const elapsed of [3, 3.5, 3.999, 4, 5, 5.5]) assertRest(getHubPulsePose(elapsed));
  let restingSamples = 0;
  for (let frame = 0; frame < 200; frame++) {
    const pose = getHubPulsePose(2 + frame / 100);
    assert.ok(pose.liftPx >= 0 && pose.liftPx <= 8);
    assert.ok(pose.rotationY >= 0 && pose.rotationY <= Math.PI * 2);
    if (pose.liftPx === 0 && pose.rotationY === 0) restingSamples++;
  }
  assert.ok(restingSamples >= 100, 'the hub must remain stationary for at least half of each two-second cycle');
  const pose = getHubPulsePose(2.375);
  assert.ok('rotationY' in pose);
  assert.ok(!('rotationZ' in pose), 'the pulse must not expose a screen-space Z-axis spin');
});

test('pulse poses remain visually continuous through the turn reset and cycle boundaries', () => {
  let previous = getHubPulsePose(1.99);
  for (let frame = 0; frame < 603; frame++) {
    const current = getHubPulsePose(1.99 + frame / 120);
    assert.ok(Math.abs(current.liftPx - previous.liftPx) < 1, 'lift must not jump between frames');
    const angularDistance = Math.hypot(Math.cos(current.rotationY) - Math.cos(previous.rotationY), Math.sin(current.rotationY) - Math.sin(previous.rotationY));
    assert.ok(angularDistance < .2, 'orientation must not jump when 360 degrees returns to zero');
    previous = current;
  }
});

test('the controller keeps one stable shared pose and is independent of ordinary frame rate', () => {
  const atRate = frameRate => {
    const controller = createHubMotionController();
    const sharedPose = controller.pose;
    advance(controller, 2.4, frameRate);
    assert.equal(controller.pose, sharedPose);
    assert.equal(controller.tick(0), sharedPose);
    return { ...controller.pose };
  };
  const desktop = atRate(60), mobile = atRate(30), highRefresh = atRate(120);
  for (const pose of [mobile, highRefresh]) {
    almostEqual(pose.liftPx, desktop.liftPx);
    almostEqual(pose.rotationY, desktop.rotationY);
  }
  const controller = createHubMotionController();
  advance(controller, 1000.4);
  const reference = getHubPulsePose(2.4);
  almostEqual(controller.pose.liftPx, reference.liftPx);
  almostEqual(controller.pose.rotationY, reference.rotationY, 1e-7);
});

test('overlay pause freezes an in-progress pose and resumes from the same phase', () => {
  const controller = createHubMotionController();
  advance(controller, 2.3);
  const frozen = { ...controller.pose };
  controller.pause(true);
  for (let frame = 0; frame < 300; frame++) controller.tick(100);
  assert.equal(controller.pose.liftPx, frozen.liftPx);
  assert.equal(controller.pose.rotationY, frozen.rotationY);
  controller.pause(false);
  controller.tick(.025);
  const expected = getHubPulsePose(2.325);
  almostEqual(controller.pose.liftPx, expected.liftPx);
  almostEqual(controller.pose.rotationY, expected.rotationY);
});

test('a large background-tab delta cannot skip the delay or jump through the animation', () => {
  const controller = createHubMotionController();
  controller.tick(90);
  assertRest(controller.pose);
  advance(controller, 2.2);
  controller.tick(90);
  const expected = getHubPulsePose(2.3);
  almostEqual(controller.pose.liftPx, expected.liftPx);
  almostEqual(controller.pose.rotationY, expected.rotationY);
  const before = { ...controller.pose };
  for (const invalid of [-5, NaN, Infinity]) controller.tick(invalid);
  assert.equal(controller.pose.liftPx, before.liftPx);
  assert.equal(controller.pose.rotationY, before.rotationY);
});

test('reduced motion cancels an active pulse and restoring motion waits a fresh two seconds', () => {
  const controller = createHubMotionController();
  advance(controller, 2.3);
  assert.ok(controller.pose.rotationY > 0);
  controller.pause(true);
  controller.tick(1 / 60, true);
  assertRest(controller.pose);
  controller.pause(false);
  for (let frame = 0; frame < 200; frame++) controller.tick(1 / 60, true);
  advance(controller, 1.99, 100);
  assertRest(controller.pose);
  controller.tick(.01);
  assertRest(controller.pose);
  controller.tick(.025);
  assert.ok(controller.pose.liftPx > 0);
});

test('invalid elapsed values remain at rest and custom lift values are bounded', () => {
  for (const elapsed of [-5, NaN, Infinity]) assertRest(getHubPulsePose(elapsed));
  assert.equal(getHubPulsePose(2.3, 12).liftPx, 12);
  assert.equal(getHubPulsePose(2.3, -10).liftPx, 0);
  assert.equal(getHubPulsePose(2.3, NaN).liftPx, 8);
});
