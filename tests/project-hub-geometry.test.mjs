import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { Euler, ExtrudeGeometry, PerspectiveCamera, Shape, Vector3 } from 'three';

const require = createRequire(import.meta.url);
const modules = new Map();
function loadGeometry(relativePath) {
  const filename = new URL(relativePath, import.meta.url);
  if (modules.has(filename.href)) return modules.get(filename.href);
  const exports = {};
  modules.set(filename.href, exports);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const localRequire = name => name === './orbit-geometry'
    ? loadGeometry('../src/projects/orbit-geometry.ts')
    : require(name);
  vm.runInNewContext(code, { exports, module: { exports }, require: localRequire }, { filename: filename.pathname });
  return exports;
}

const { getHubLayout, getHubScreenPulse } = loadGeometry('../src/projects/hub-geometry.ts');
const geometry = loadGeometry('../src/projects/orbit-geometry.ts');
const viewports = [[1190, 462], [1775, 865], [840, 600], [640, 640], [372, 351], [320, 220], [1190, 230]];
// Recorded projected diameters before the selector's camera was widened.
const priorHubDiameters = new Map([
  ['1190x462', 112.20051055505671],
  ['1775x865', 210.07238448078797],
  ['840x600', 152.85961771796448],
  ['640x640', 167.25486945138536],
  ['372x351', 91.72884246474416],
  ['320x220', 55.69280773976115],
  ['1190x230', 55.857397029573676],
]);

test('the core retains its established screen size while the selector camera widens', () => {
  const landscape = getHubLayout(1190, 462);
  const portrait = getHubLayout(372, 351);
  assert.ok(landscape.radius > 2.2 && portrait.radius > 3.4,
    'the complete disc must compensate physically for the wider camera');
  const intermediate = getHubLayout(840, 600);
  assert.ok(intermediate.radius > landscape.radius && intermediate.radius < portrait.radius);
  for (const [width, height] of viewports) {
    const layout = getHubLayout(width, height);
    const priorDiameter = priorHubDiameters.get(`${width}x${height}`);
    assert.ok(Math.abs(layout.diameterPx - priorDiameter) < 1e-6,
      `${width}x${height}: the ring refinement must preserve the prior ${priorDiameter}px hub diameter`);
    assert.ok(layout.depth > 0 && layout.bevel > 0 && layout.bevel < layout.depth / 2);
    assert.ok(Object.values(layout).every(Number.isFinite));
    assert.ok(layout.diameterPx > 0 && layout.diameterPx < Math.min(width, height) / 3);
  }
});

test('the translated circular control contains the beveled disc through its complete activation spin', () => {
  for (const [width, height] of viewports) {
    const layout = getHubLayout(width, height);
    const camera = new PerspectiveCamera(geometry.getOrbitCameraFov(width, height), width / height, .1, 50);
    camera.position.set(0, 0, geometry.ORBIT_CAMERA_Z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const rotation = new Euler(layout.pitch, layout.yaw, 0, 'XYZ');
    const hitRadius = layout.diameterPx / 2;
    // Cover front/back faces and the bevel envelope, including the cardinal
    // directions. The renderer translates its extrusion by -depth / 2.
    for (const pulseLift of [0, 8]) {
      for (let spin = 0; spin < 360; spin += 15) {
        const pulse = getHubScreenPulse({ liftPx: pulseLift, rotationY: spin * Math.PI / 180 }, height);
        const centerProjection = geometry.modelScreenPosition({ x: 0, y: 0, z: layout.z }, width, height);
        const liftWorld = pulse.liftPx * centerProjection.unitsPerPixel;
        const localRotation = new Euler(0, pulse.rotationY, 0);
        for (const depth of [-layout.depth / 2 - layout.bevel, 0, layout.depth / 2 + layout.bevel]) {
          for (let step = 0; step < 360; step++) {
            const angle = step * Math.PI / 180;
            const projected = new Vector3(
              Math.cos(angle) * (layout.radius + layout.bevel),
              Math.sin(angle) * (layout.radius + layout.bevel),
              depth,
            ).applyEuler(localRotation).applyEuler(rotation);
            projected.y += liftWorld;
            projected.z += layout.z;
            projected.project(camera);
            const distance = Math.hypot(projected.x * width / 2, -projected.y * height / 2 + pulse.liftPx);
            assert.ok(distance <= hitRadius + 1e-7,
              `${width}×${height}, spin ${spin}°, lift ${pulse.liftPx}px: ${distance} exceeds circular hit radius ${hitRadius}`);
          }
        }
      }
    }
  }
});

test('a local axial turn exposes the physical edge and back before returning to the same resting silhouette', () => {
  for (const [width, height] of viewports) {
    const layout = getHubLayout(width, height);
    const face = new Shape();
    face.absarc(0, 0, layout.radius, 0, Math.PI * 2, false);
    const body = new ExtrudeGeometry(face, {
      depth: layout.depth, steps: 1, curveSegments: 96,
      bevelEnabled: true, bevelSize: layout.bevel,
      bevelThickness: layout.bevel, bevelSegments: 5,
    });
    body.translate(0, 0, -layout.depth / 2);
    const camera = new PerspectiveCamera(geometry.getOrbitCameraFov(width, height), width / height, .1, 50);
    camera.position.set(0, 0, geometry.ORBIT_CAMERA_Z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const rest = new Euler(layout.pitch, layout.yaw, 0, 'XYZ');
    const positions = body.getAttribute('position');
    const silhouette = angle => {
      const axialTurn = new Euler(0, angle, 0);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let minDepth = Infinity, maxDepth = -Infinity;
      for (let index = 0; index < positions.count; index++) {
        const point = new Vector3().fromBufferAttribute(positions, index).applyEuler(axialTurn).applyEuler(rest);
        minDepth = Math.min(minDepth, point.z);
        maxDepth = Math.max(maxDepth, point.z);
        point.z += layout.z;
        point.project(camera);
        minX = Math.min(minX, point.x * width / 2);
        maxX = Math.max(maxX, point.x * width / 2);
        minY = Math.min(minY, -point.y * height / 2);
        maxY = Math.max(maxY, -point.y * height / 2);
      }
      return { width: maxX - minX, height: maxY - minY, depth: maxDepth - minDepth };
    };
    try {
      const front = silhouette(0);
      const edge = silhouette(Math.PI / 2);
      const back = silhouette(Math.PI);
      const otherEdge = silhouette(Math.PI * 1.5);
      const settled = silhouette(Math.PI * 2);
      assert.ok(edge.width < front.width * .65 && otherEdge.width < front.width * .65,
        `${width}×${height}: a true axial quarter-turn must reveal a substantially narrower disc edge`);
      assert.ok(edge.depth > front.depth * 1.8,
        `${width}×${height}: the axial turn must move the circular face through depth rather than rotate it in screen space`);
      for (const key of ['width', 'height', 'depth']) {
        assert.ok(Math.abs(back[key] - front[key]) < 1e-5, `${width}×${height}: the back has the same circular body silhouette`);
        assert.ok(Math.abs(settled[key] - front[key]) < 1e-7, `${width}×${height}: the full turn must settle at the original ${key}`);
      }
    } finally {
      body.dispose();
    }
  }
});

test('the circular core control never covers a project preview center through a complete selector turn', () => {
  for (const [width, height] of viewports) {
    const hitRadius = getHubLayout(width, height).diameterPx / 2;
    for (const lift of [0, getHubScreenPulse({ liftPx: 8, rotationY: 0 }, height).liftPx]) {
      for (let rotation = 0; rotation < 360; rotation++) {
        for (const position of geometry.getProjectPositions(rotation, 6, width, height)) {
          assert.ok(Math.hypot(position.x, position.y + lift) > hitRadius,
            `${width}×${height}, rotation ${rotation}, lift ${lift}px: the center control would steal a project center`);
        }
      }
    }
  }
});

test('unmeasured or invalid viewport dimensions leave the hub layout finite', () => {
  for (const [width, height] of [[0, 0], [NaN, Infinity], [-10, -10]]) {
    const layout = getHubLayout(width, height);
    assert.ok(Object.values(layout).every(Number.isFinite));
    assert.ok(layout.radius > 0 && layout.diameterPx > 0);
  }
});
