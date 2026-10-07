import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PerspectiveCamera, Vector3 } from 'three';

const filename = new URL('../src/projects/orbit-geometry.ts', import.meta.url);
const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
vm.runInNewContext(code, { exports, module: { exports } }, { filename: filename.pathname });
const geometry = exports;
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`);
const hubFilename = new URL('../src/projects/hub-geometry.ts', import.meta.url);
const hubCode = ts.transpileModule(readFileSync(hubFilename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const hubGeometry = {};
vm.runInNewContext(hubCode, {
  exports: hubGeometry, module: { exports: hubGeometry },
  require: name => {
    assert.equal(name, './orbit-geometry');
    return geometry;
  },
}, { filename: hubFilename.pathname });
const previewFilename = new URL('../src/projects/project-preview.ts', import.meta.url);
const previewCode = ts.transpileModule(readFileSync(previewFilename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const previewGeometry = {};
vm.runInNewContext(previewCode, {
  exports: previewGeometry, module: { exports: previewGeometry },
  require: name => {
    assert.equal(name, './orbit-geometry');
    return geometry;
  },
}, { filename: previewFilename.pathname });

// Billboard modules remain camera-facing, but their physical front/back faces
// have different perspective footprints. Include the selected module's pickup
// lift and the full beveled enclosure rather than only the photographic plane.
function frameBounds(rotation, index, selected, width, height) {
  const layout = previewGeometry.getProjectPreviewLayout(geometry.ORBIT_PREVIEW_WIDTH, geometry.getOrbitPreviewHeight(width, height));
  const anchor = geometry.projectSlotPosition(index, 6, rotation, width, height);
  const scale = selected ? previewGeometry.PROJECT_PREVIEW_ACTIVE_SCALE : 1;
  const lift = selected ? previewGeometry.PROJECT_PREVIEW_FRONT_LIFT : 0;
  const faceDepth = layout.depth / 2 + layout.bevel + .01;
  const faces = [-1, 1].map(sign => {
    const screen = geometry.modelScreenPosition({ ...anchor, z: anchor.z + lift + sign * faceDepth * scale }, width, height);
    return { ...screen, halfWidth: layout.width * scale / screen.unitsPerPixel / 2, halfHeight: layout.height * scale / screen.unitsPerPixel / 2 };
  });
  const left = Math.min(...faces.map(face => face.x - face.halfWidth));
  const right = Math.max(...faces.map(face => face.x + face.halfWidth));
  const top = Math.min(...faces.map(face => face.y - face.halfHeight));
  const bottom = Math.max(...faces.map(face => face.y + face.halfHeight));
  return { x: (left + right) / 2, y: (top + bottom) / 2, halfWidth: (right - left) / 2, halfHeight: (bottom - top) / 2 };
}

test('HTML hit targets project onto the same perspective camera coordinates at every depth and viewport shape', () => {
  for (const [width, height] of [[1200, 700], [390, 640], [640, 640]]) {
    const camera = new PerspectiveCamera(geometry.getOrbitCameraFov(width, height), width / height, .1, 60);
    camera.position.set(0, 0, geometry.ORBIT_CAMERA_Z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (const position of [{ x: 2, y: -1, z: -3 }, { x: -1, y: 2, z: 0 }, { x: 1, y: 1, z: 3 }]) {
      const projected = new Vector3(position.x, position.y, position.z).project(camera);
      const target = geometry.modelScreenPosition(position, width, height);
      close(target.x, projected.x * width / 2);
      close(target.y, -projected.y * height / 2);
    }
  }
});

test('drag conversion follows the pointer equally at the front and back of the 3D orbit', () => {
  for (const [width, height] of [[1100, 600], [390, 500]]) {
    const front = geometry.modelScreenPosition({ x: 1, y: 1, z: 3 }, width, height);
    const back = geometry.modelScreenPosition({ x: 1, y: 1, z: -3 }, width, height);
    assert.ok(front.scale > 1 && back.scale < 1);
    assert.ok(front.unitsPerPixel < back.unitsPerPixel);
    for (const z of [-3, 0, 3]) {
      const start = { x: .3, y: -.4, z };
      const before = geometry.modelScreenPosition(start, width, height);
      const after = geometry.modelScreenPosition({
        x: start.x + 27 * before.unitsPerPixel,
        y: start.y - 19 * before.unitsPerPixel,
        z,
      }, width, height);
      close(after.x - before.x, 27);
      close(after.y - before.y, 19);
    }
  }
});

test('held and thrown model silhouettes stay within the viewport even beyond their orbital lane', () => {
  const offsets = [[24, 24, .8], [-24, -24, -.8], [24, -24, .8], [-24, 24, -.8], [0, 0, 0]];
  for (const [width, height] of [[1190, 505], [372, 399], [320, 220], [1190, 230]]) {
    for (let index = 0; index < 7; index++) {
      for (const held of [0, .5, 1]) for (const offset of offsets) {
        const pose = geometry.getModelPose(index, 13, offset, width, height, { active: 1, hover: 1 }, { free: true, held });
        const projected = geometry.modelScreenPosition(pose.position, width, height);
        const half = geometry.ORBIT_MODEL_SIZE * pose.scale / projected.unitsPerPixel / 2;
        assert.ok(Object.values(pose.position).every(Number.isFinite));
        assert.ok(Number.isFinite(pose.scale) && pose.scale > 0);
        assert.ok(Math.abs(projected.x) + half < width / 2, `held horizontal containment ${width}x${height}, model ${index}, held ${held}`);
        assert.ok(Math.abs(projected.y) + half < height / 2, `held vertical containment ${width}x${height}, model ${index}, held ${held}`);
      }
    }
  }
});

test('only free models can cross the selector instead of being forced back into the outer lane', () => {
  for (const [width, height] of [[1190, 505], [372, 399]]) {
    for (let index = 0; index < 7; index++) {
      const emphasis = { active: 0, hover: 0 };
      const normal = geometry.getModelPose(index, 7, [0, 0, 0], width, height, emphasis);
      const offset = [-normal.position.x + .1, -normal.position.y + .1, 0];
      const free = geometry.getModelPose(index, 7, offset, width, height, emphasis, { free: true, held: 1 });
      const projected = geometry.modelScreenPosition(free.position, width, height);
      assert.ok(Math.hypot(projected.x, projected.y) < 4, 'a dragged body must be able to reach the center');
      close(free.scale, normal.scale * 1.08);
      close(free.position.z, normal.position.z + .3);
      const idle = geometry.modelScreenPosition(normal.position, width, height);
      assert.ok(Math.hypot(idle.x, idle.y) > Math.hypot(projected.x, projected.y) + 20);
    }
  }
});

test('free model HTML targets match the renderer camera, pickup scale and each body orbital clock', () => {
  for (const [width, height] of [[1190, 505], [372, 399], [640, 640]]) {
    const camera = new PerspectiveCamera(geometry.getOrbitCameraFov(width, height), width / height, .1, 60);
    camera.position.set(0, 0, geometry.ORBIT_CAMERA_Z);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const bodies = Array.from({ length: 7 }, (_, index) => ({ offset: [3.2 - index * .2, -1.5 + index * .15, .4], orbitTime: index + 2, free: true, held: index / 6 }));
    const emphasis = bodies.map((_, index) => ({ active: index === 3 ? 1 : 0, hover: index === 4 ? 1 : 0 }));
    const targets = geometry.getModelPositions({ time: 47, get: index => bodies[index] }, width, height, emphasis);
    targets.forEach((target, index) => {
      const body = bodies[index];
      const pose = geometry.getModelPose(index, body.orbitTime, body.offset, width, height, emphasis[index], body);
      const actual = new Vector3(pose.position.x, pose.position.y, pose.position.z).project(camera);
      close(target.x, actual.x * width / 2);
      close(target.y, -actual.y * height / 2);
      close(target.size, geometry.ORBIT_MODEL_SIZE * pose.scale / target.unitsPerPixel);
    });
  }
});

test('one slow shared orbital path stays on a clean projected ellipse with restrained depth', () => {
  assert.equal(geometry.ATOMIC_PLANES.length, 1);
  assert.ok(geometry.ORBIT_MODEL_SPEED <= .03);
  for (const [width, height] of [[1024, 472], [372, 399]]) {
    const project = angle => geometry.modelScreenPosition(geometry.controlledOrbitPosition(angle, width, height), width, height);
    const xRadius = project(0).x, yRadius = -project(Math.PI / 2).y;
    for (let step = 0; step < 64; step++) {
      const angle = step / 64 * Math.PI * 2;
      const point = project(angle);
      close((point.x / xRadius) ** 2 + (point.y / yRadius) ** 2, 1);
      assert.ok(Math.abs(geometry.controlledOrbitPosition(angle, width, height).z) <= .6);
    }
  }
});

test('floating model hit targets remain finite and within desktop and mobile camera bounds', () => {
  for (const [width, height] of [[1200, 650], [390, 460], [320, 350]]) {
    for (let index = 0; index < 7; index++) {
      for (const time of [0, 7, 18, 32, 60]) {
        for (const offset of [[0, 0, 0], [.45, 0, 0], [0, -.45, 0]]) {
          const position = geometry.floatingModelPosition(index, time, offset, width, height);
          const screen = geometry.modelScreenPosition(position, width, height);
          assert.ok(Object.values(screen).every(Number.isFinite));
          assert.ok(Math.abs(screen.x) < width / 2 - 10);
          assert.ok(Math.abs(screen.y) < height / 2 - 10);
        }
      }
    }
  }
});

test('large active models remain outside the selector, clear of neighbours, and wholly within every viewport', () => {
  const offsets = [[0, 0, 0], [.45, 0, 0], [-.45, 0, 0], [0, .45, 0], [0, -.45, 0], [.318, .318, 0], [-.318, -.318, 0]];
  for (const [width, height] of [[1190, 505], [372, 399], [640, 640], [840, 600], [960, 600], [1775, 865]]) {
    const ringBoundary = [];
    const previewBoundary = [];
    const tilt = geometry.getOrbitTilt(width, height);
    for (let degree = 0; degree < 360; degree += 3) {
      const angle = degree * Math.PI / 180;
      const y = Math.sin(angle) * geometry.ORBIT_OUTER_RADIUS;
      for (const depth of [-geometry.ORBIT_DEPTH / 2, geometry.ORBIT_DEPTH / 2]) {
        ringBoundary.push(geometry.modelScreenPosition({
          x: Math.cos(angle) * geometry.ORBIT_OUTER_RADIUS,
          y: y * Math.cos(tilt) - depth * Math.sin(tilt),
          z: y * Math.sin(tilt) + depth * Math.cos(tilt),
        }, width, height));
      }
    }
    for (let rotation = 0; rotation < 360; rotation += 10) {
      for (let index = 0; index < 6; index++) {
        previewBoundary.push(frameBounds(rotation, index, true, width, height));
      }
    }
    const period = Math.PI * 2 / geometry.ORBIT_MODEL_SPEED;
    for (let phase = 0; phase < 36; phase++) {
      const time = phase / 36 * period;
      for (let active = 0; active < 7; active++) {
        for (const offset of offsets) {
          const models = Array.from({ length: 7 }, (_, index) => {
            const pose = geometry.getModelPose(index, time, index === active ? offset : [0, 0, 0], width, height, { active: index === active ? 1 : 0, hover: 0 });
            const point = geometry.modelScreenPosition(pose.position, width, height);
            return { ...point, half: geometry.ORBIT_MODEL_SIZE * pose.scale / point.unitsPerPixel / 2 };
          });
          for (let index = 0; index < 7; index++) {
            const model = models[index];
            const context = `${width}x${height}, phase ${phase}, active ${active}, model ${index}, offset ${offset}`;
            assert.ok(Math.abs(model.x) + model.half < width / 2, `horizontal viewport clearance: ${context}`);
            assert.ok(Math.abs(model.y) + model.half < height / 2, `vertical viewport clearance: ${context}`);
            for (const point of ringBoundary) {
              assert.ok(Math.abs(point.x - model.x) > model.half || Math.abs(point.y - model.y) > model.half, `ring/model silhouettes must not intersect: ${context}`);
            }
            for (const slot of previewBoundary) {
              assert.ok(Math.abs(slot.x - model.x) > model.half + slot.halfWidth || Math.abs(slot.y - model.y) > model.half + slot.halfHeight, `preview/model silhouettes must not intersect: ${context}`);
            }
            for (let next = index + 1; next < 7; next++) {
              const other = models[next];
              assert.ok(Math.abs(model.x - other.x) > model.half + other.half || Math.abs(model.y - other.y) > model.half + other.half, `model silhouettes ${index}/${next} must not intersect: ${context}`);
            }
          }
        }
      }
    }
  }
});

test('the larger selector keeps the landscape composition dominant and adds the requested breathing room', () => {
  const width = 1190, height = 505;
  const priorRingDiameter = 2 * 7.4 * height / 20.2;
  const priorSlotDiameter = 2 * 6.4 * height / 20.2;
  const ringDiameter = 2 * geometry.ORBIT_OUTER_RADIUS * height / geometry.getOrbitViewSize(width, height);
  const slotDiameter = 2 * geometry.ORBIT_RING_RADIUS * height / geometry.getOrbitViewSize(width, height);
  assert.ok(ringDiameter / priorRingDiameter >= 1.35 && ringDiameter / priorRingDiameter <= 1.6,
    'the physical ring must grow visibly rather than having its enlargement cancelled by the camera');
  assert.ok(slotDiameter / priorSlotDiameter >= 1.35 && slotDiameter / priorSlotDiameter <= 1.6,
    'the six preview positions must move farther from the center in screen space');
  for (let phase = 0; phase < 36; phase++) {
    const time = phase / 36 * Math.PI * 2 / geometry.ORBIT_MODEL_SPEED;
    const models = geometry.getModelPositions({ time, get: () => ({ offset: [0, 0, 0] }) }, width, height, 0);
    const minX = Math.min(...models.map(model => model.x - model.size / 2));
    const maxX = Math.max(...models.map(model => model.x + model.size / 2));
    const minY = Math.min(...models.map(model => model.y - model.size / 2));
    const maxY = Math.max(...models.map(model => model.y + model.size / 2));
    assert.ok((maxX - minX) / width >= .74, `horizontal occupancy at phase ${phase}`);
    assert.ok((maxY - minY) / height >= .89, `vertical occupancy at phase ${phase}`);
  }
});

test('all six finished project frames, including active emphasis, remain separate and clear of the hub through a full turn', () => {
  for (const [width, height] of [[1190, 505], [1190, 462], [372, 399], [372, 351], [640, 640], [840, 600], [960, 600], [320, 220], [1190, 230]]) {
    const hubRadius = hubGeometry.getHubLayout(width, height).diameterPx / 2;
    const minimumGap = Math.min(8, Math.min(width, height) * .025);
    for (let rotation = 0; rotation < 360; rotation++) {
      for (let active = 0; active < 6; active++) {
        const slots = Array.from({ length: 6 }, (_, index) => frameBounds(rotation, index, index === active, width, height));
        assert.equal(slots.length, 6);
        for (let index = 0; index < slots.length; index++) {
          const slot = slots[index];
          const context = `${width}x${height}, rotation ${rotation}, active ${active}, slot ${index}`;
          assert.ok(Math.abs(slot.x) + slot.halfWidth < width / 2, `horizontal frame containment: ${context}`);
          assert.ok(Math.abs(slot.y) + slot.halfHeight < height / 2, `vertical frame containment: ${context}`);
          // Measure the finished frame rather than its smaller image aperture.
          // The closest rectangle edge must clear the complete circular hub.
          // The core's physical disc and accessible circle share the same
          // screen-space uplift. Include vertical alignment when it falls
          // inside the pulse: that is the nearest intermediate rectangle edge.
          const peakLift = hubGeometry.getHubScreenPulse({ liftPx: 8, rotationY: Math.PI }, height).liftPx;
          const nearestLift = Math.max(0, Math.min(peakLift, -slot.y));
          for (const lift of [0, peakLift, nearestLift]) {
            const closestX = Math.max(0, Math.abs(slot.x) - slot.halfWidth);
            const closestY = Math.max(0, Math.abs(slot.y + lift) - slot.halfHeight);
            const hubGap = Math.hypot(closestX, closestY) - hubRadius;
            assert.ok(hubGap >= minimumGap,
              `${context}, uplift ${lift}px: ${hubGap}px hub gap must be at least ${minimumGap}px`);
          }
          for (let next = index + 1; next < slots.length; next++) {
            const other = slots[next];
            assert.ok(Math.abs(slot.x - other.x) > slot.halfWidth + other.halfWidth || Math.abs(slot.y - other.y) > slot.halfHeight + other.halfHeight, `frame separation ${index}/${next}: ${context}`);
          }
        }
      }
    }
  }
});

test('project slots use the current division count and return to focus at the matching rotation', () => {
  for (const count of [1, 3, 5, 7]) {
    const initial = geometry.getProjectPositions(0, count, 1000, 600);
    assert.equal(initial.length, count);
    assert.equal(new Set(initial.map(point => `${point.x.toFixed(3)},${point.y.toFixed(3)}`)).size, count);
    for (let index = 0; index < count; index++) {
      const rotated = geometry.getProjectPositions(index / count * 360, count, 1000, 600);
      close(rotated[index].x, initial[0].x);
      close(rotated[index].y, initial[0].y);
      close(rotated[index].scale, initial[0].scale);
    }
  }
  for (const count of [0, -1, NaN, Infinity]) assert.equal(geometry.getProjectPositions(0, count, 390, 500).length, 0);
});
