import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { Matrix4, PerspectiveCamera, Vector3 } from 'three';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function load(filename, imports = {}) {
  const code = ts.transpileModule(readFileSync(path.join(root, 'src', filename), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, module: { exports }, require: name => {
    assert.ok(name in imports, `Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}

const { getProjectSlots, getProjectFocusStep, updateProjectWindow, PROJECT_SLOT_COUNT, PROJECT_PLACEHOLDER_IMAGE } = load('projects/project-slots.ts');
const physics = load('projects/useOrbitPhysics.ts', { react: {} });
const geometry = load('projects/orbit-geometry.ts');
const recordsFor = count => Array.from({ length: count }, (_, index) => ({ id: `project-${index + 1}`, title: `Project ${index + 1}` }));
const orderedProjectIndices = slots => [...slots].sort((a, b) => a.logicalIndex - b.logicalIndex).map(slot => slot.projectIndex);

test('eight project records initially occupy six stable display positions without changing the archive', () => {
  assert.equal(PROJECT_SLOT_COUNT, 6);
  const records = recordsFor(8);
  const before = JSON.stringify(records);
  const slots = getProjectSlots(records, 'archive');
  assert.equal(slots.length, 6);
  assert.equal(new Set(slots.map(slot => slot.id)).size, 6);
  slots.forEach((slot, index) => {
    assert.equal(slot.index, index);
    assert.equal(slot.logicalIndex, index);
    assert.equal(slot.projectIndex, index);
    assert.equal(slot.project, records[index]);
    assert.equal(slot.title, records[index].title);
  });
  assert.equal(records.length, 8);
  assert.equal(JSON.stringify(records), before, 'building ring slots cannot alter the archive');
  assert.ok(existsSync(path.join(root, 'public', PROJECT_PLACEHOLDER_IMAGE)));
});

test('a smaller dataset pads six positions without manufacturing project records', () => {
  const records = recordsFor(3);
  const slots = getProjectSlots(records, 'small', 17);
  assert.equal(slots.length, 6);
  slots.forEach((slot, index) => {
    assert.equal(slot.logicalIndex, index);
    assert.equal(slot.projectIndex, index < 3 ? index : null);
    assert.equal(slot.project, index < 3 ? records[index] : null);
    assert.equal(slot.title, index < 3 ? records[index].title : 'Coming Soon');
  });
  assert.equal(updateProjectWindow({ start: 17 }, 200, 3).start, 0);
});

test('empty divisions still have six stable positions without manufacturing archive records', () => {
  const slots = getProjectSlots([], 'future-division');
  assert.equal(slots.length, 6);
  assert.ok(slots.every(slot => slot.project === null && slot.title === 'Coming Soon'));
  const repeated = getProjectSlots([], 'future-division');
  assert.deepEqual(slots.map(slot => slot.id), repeated.map(slot => slot.id));
  assert.ok(getProjectSlots([], 'another-division').every((slot, index) => slot.id !== slots[index].id));
});

test('a complete six-project division occupies all six positions without placeholders', () => {
  const records = recordsFor(PROJECT_SLOT_COUNT);
  const slots = getProjectSlots(records, 'complete');
  assert.equal(slots.length, 6);
  assert.equal(new Set(slots.map(slot => slot.id)).size, 6);
  assert.ok(slots.every((slot, index) => slot.project === records[index] && slot.title === records[index].title));
});

test('all six slots, including placeholders, snap by sixty degrees and preserve the same physical focus position', () => {
  const slots = getProjectSlots(recordsFor(3), 'small');
  const controller = physics.createOrbitPhysics({ count: PROJECT_SLOT_COUNT, reducedMotion: true });
  const focus = geometry.getProjectPositions(0, PROJECT_SLOT_COUNT, 1024, 472)[0];
  for (const slot of slots) {
    controller.select(slot.index);
    controller.tick(1 / 60);
    assert.equal(controller.focus, slot.index);
    assert.equal(physics.nearestOrbitIndex(controller.rotation, PROJECT_SLOT_COUNT), slot.index);
    const projected = geometry.getProjectPositions(controller.rotation, PROJECT_SLOT_COUNT, 1024, 472);
    assert.equal(projected.length, 6);
    assert.ok(Math.abs(projected[slot.index].x - focus.x) < 1e-7);
    assert.ok(Math.abs(projected[slot.index].y - focus.y) < 1e-7);
  }
  assert.equal(physics.nearestOrbitIndex(360, PROJECT_SLOT_COUNT), 0);
  assert.equal(physics.nearestOrbitIndex(-60, PROJECT_SLOT_COUNT), 5);
});

test('the first six selections preserve the initial window, then projects seven and eight replace its oldest entries', () => {
  const records = recordsFor(8);
  let window = { start: 0 };
  const initialIds = getProjectSlots(records, 'archive').map(slot => slot.id);
  for (let focus = 0; focus < 6; focus++) {
    const previous = window;
    window = updateProjectWindow(window, focus, records.length);
    assert.equal(window, previous, 'selection within the window does not replace previews');
    assert.deepEqual(orderedProjectIndices(getProjectSlots(records, 'archive', window.start)), [0, 1, 2, 3, 4, 5]);
  }
  window = updateProjectWindow(window, 6, records.length);
  let slots = getProjectSlots(records, 'archive', window.start);
  assert.equal(window.start, 1);
  assert.deepEqual(orderedProjectIndices(slots), [1, 2, 3, 4, 5, 6]);
  assert.equal(slots[0].project, records[6]);
  assert.deepEqual(slots.map(slot => slot.id), initialIds, 'record replacement cannot remount a physical position');
  window = updateProjectWindow(window, 7, records.length);
  slots = getProjectSlots(records, 'archive', window.start);
  assert.equal(window.start, 2);
  assert.deepEqual(orderedProjectIndices(slots), [2, 3, 4, 5, 6, 7]);
  assert.equal(slots[1].project, records[7]);
  assert.equal(new Set(slots.map(slot => slot.project.id)).size, 6);
});

test('continuous forward traversal wraps the eight-record archive independently of six physical positions', () => {
  const records = recordsFor(8);
  let window = { start: 0 };
  for (let focus = 0; focus <= 200; focus++) {
    window = updateProjectWindow(window, focus, records.length);
    const slots = getProjectSlots(records, 'archive', window.start);
    assert.equal(slots.length, 6);
    assert.equal(new Set(slots.map(slot => slot.projectIndex)).size, 6);
    assert.equal(slots[focus % 6].logicalIndex, focus);
    assert.equal(slots[focus % 6].project, records[focus % 8]);
  }
  window = updateProjectWindow({ start: 2 }, 8, records.length);
  assert.deepEqual(orderedProjectIndices(getProjectSlots(records, 'archive', window.start)), [3, 4, 5, 6, 7, 0]);
});

test('reverse traversal retains the visible window until selection passes its beginning and wraps through project eight', () => {
  const records = recordsFor(8);
  let window = { start: 2 };
  for (let focus = 7; focus >= 2; focus--) {
    const previous = window;
    window = updateProjectWindow(window, focus, records.length);
    assert.equal(window, previous);
  }
  window = updateProjectWindow(window, 1, records.length);
  assert.deepEqual(orderedProjectIndices(getProjectSlots(records, 'archive', window.start)), [1, 2, 3, 4, 5, 6]);
  window = updateProjectWindow(window, 0, records.length);
  assert.deepEqual(orderedProjectIndices(getProjectSlots(records, 'archive', window.start)), [0, 1, 2, 3, 4, 5]);
  window = updateProjectWindow(window, -1, records.length);
  const slots = getProjectSlots(records, 'archive', window.start);
  assert.deepEqual(orderedProjectIndices(slots), [7, 0, 1, 2, 3, 4]);
  assert.equal(slots[5].logicalIndex, -1);
  assert.equal(slots[5].project, records[7]);
});

test('large frame jumps immediately choose the correct six-record window in either direction', () => {
  const records = recordsFor(8);
  const forward = updateProjectWindow({ start: 0 }, 37, records.length);
  assert.equal(forward.start, 32);
  const slots = getProjectSlots(records, 'archive', forward.start);
  assert.equal(slots[1].logicalIndex, 37);
  assert.equal(slots[1].projectIndex, 5);
  const reverse = updateProjectWindow(forward, -29, records.length);
  assert.equal(reverse.start, -29);
  assert.equal(getProjectSlots(records, 'archive', reverse.start)[1].projectIndex, 3);
});

test('unwrapped focus steps change thirty degrees before each snap instead of losing full revolutions', () => {
  assert.equal(getProjectFocusStep(329), 5);
  assert.equal(getProjectFocusStep(330), 6);
  assert.equal(getProjectFocusStep(360), 6);
  assert.equal(getProjectFocusStep(480), 8);
  assert.equal(getProjectFocusStep(-31), -1);
  assert.equal(getProjectFocusStep(-360), -6);
  assert.equal(getProjectFocusStep(Number.NaN), 0);
});

test('direct selection targets the clicked logical record rather than its shorter physical alias', () => {
  const records = recordsFor(8);
  const initial = getProjectSlots(records, 'archive');
  const controller = physics.createOrbitPhysics({ count: PROJECT_SLOT_COUNT, reducedMotion: true });
  const clicked = initial[5];
  controller.step(clicked.logicalIndex - getProjectFocusStep(controller.rotation));
  assert.equal(controller.rotation, 300);
  assert.equal(getProjectFocusStep(controller.rotation), clicked.logicalIndex);
  const window = updateProjectWindow({ start: 0 }, getProjectFocusStep(controller.rotation), records.length);
  assert.equal(getProjectSlots(records, 'archive', window.start)[controller.focus].project, clicked.project);
  const advanced = getProjectSlots(records, 'archive', 2);
  const wrappedClicked = advanced[1];
  controller.step(wrappedClicked.logicalIndex - getProjectFocusStep(controller.rotation));
  assert.equal(controller.rotation, 420);
  assert.equal(getProjectSlots(records, 'archive', 2)[controller.focus].project, records[7]);
});

test('six billboard centers align with their tilted sectors and responsive camera through a full revolution', () => {
  for (const [width, height] of [[1190, 505], [390, 420], [840, 600], [1775, 865]]) {
    const camera = new PerspectiveCamera(geometry.getOrbitCameraFov(width, height), width / height, .1, 60);
    camera.position.set(0, 0, geometry.ORBIT_CAMERA_Z);
    camera.updateMatrixWorld();
    for (let rotation = -360; rotation <= 360; rotation += 17) {
      const positions = geometry.getProjectPositions(rotation, PROJECT_SLOT_COUNT, width, height);
      assert.equal(positions.length, 6);
      for (let index = 0; index < PROJECT_SLOT_COUNT; index++) {
        const sector = new Matrix4().makeRotationZ(index * Math.PI / 3 - rotation * Math.PI / 180);
        const tilt = new Matrix4().makeRotationX(geometry.getOrbitTilt(width, height));
        const projected = new Vector3(0, -geometry.ORBIT_RING_RADIUS, geometry.ORBIT_DEPTH / 2 + .051)
          .applyMatrix4(sector).applyMatrix4(tilt).project(camera);
        assert.ok(Math.abs(positions[index].x - projected.x * width / 2) < 1e-7);
        assert.ok(Math.abs(positions[index].y + projected.y * height / 2) < 1e-7);
      }
    }
  }
});

test('ordinary scroll momentum visits placeholder positions and settles on sixty-degree boundaries', () => {
  const controller = physics.createOrbitPhysics({ count: PROJECT_SLOT_COUNT });
  for (let index = 1; index <= PROJECT_SLOT_COUNT; index++) {
    controller.impulse(100);
    assert.ok(controller.isMoving);
    for (let frame = 0; frame < 240; frame++) controller.tick(1 / 60);
    assert.equal(controller.focus, index % PROJECT_SLOT_COUNT);
    assert.ok(Math.abs(controller.rotation - index * 60) < 1e-7);
    assert.equal(controller.isMoving, false);
  }
});
