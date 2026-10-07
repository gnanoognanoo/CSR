import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const modules = new Map();
function loadGeometry(relativePath) {
  const filename = new URL(relativePath, import.meta.url);
  if (modules.has(filename.href)) return modules.get(filename.href);
  const exports = {};
  modules.set(filename.href, exports);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports, module: { exports },
    require: name => {
      assert.equal(name, './orbit-geometry');
      return loadGeometry('../src/projects/orbit-geometry.ts');
    },
  }, { filename: filename.pathname });
  return exports;
}

const preview = loadGeometry('../src/projects/project-preview.ts');
const geometry = loadGeometry('../src/projects/orbit-geometry.ts');
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`);
const viewports = [[1190, 462], [1775, 865], [840, 600], [640, 640], [372, 351], [320, 220], [1190, 230]];
const frameLayout = (width, height) => preview.getProjectPreviewLayout(geometry.ORBIT_PREVIEW_WIDTH, geometry.getOrbitPreviewHeight(width, height));
test('the wide display aperture clears the structural rails and thicker technical footer', () => {
  for (const [width, height] of viewports) {
    const layout = frameLayout(width, height);
    close(layout.height, geometry.getOrbitPreviewHeight(width, height));
    assert.ok(layout.width / layout.height >= 1.8, 'every viewport must retain a wide rectangular display');
    assert.ok(layout.imageWidth / layout.imageHeight > layout.width / layout.height,
      'the top and bottom structural bars must keep a broad screen opening');
    assert.ok(layout.imageWidth > 0 && layout.imageHeight > 0);
    assert.ok(layout.imageWidth < layout.width - 2 * layout.bevel, 'the image needs a visible side mat');
    assert.ok(Math.abs(layout.imageY) + layout.imageHeight / 2 < layout.height / 2 - layout.bevel,
      'the image must remain inset vertically');
    assert.ok(layout.footerY > -layout.height / 2 + layout.bevel, 'metadata must clear the lower beveled edge');
    assert.ok(layout.footerY < layout.imageY - layout.imageHeight / 2, 'metadata must sit below the image aperture');
    const topClearance = layout.height / 2 - (layout.imageY + layout.imageHeight / 2);
    const bottomClearance = layout.imageY - layout.imageHeight / 2 + layout.height / 2;
    close(topClearance, layout.topBar);
    close(bottomClearance, layout.bottomBar);
    assert.ok(bottomClearance > topClearance * 1.5, 'the bottom bar must read as a thicker physical sill');
    assert.ok(layout.bevel > 0 && layout.bevel < Math.min(layout.width, layout.height) / 2);
    assert.ok(layout.depth > 0 && layout.depth < geometry.ORBIT_DEPTH, 'a module should have subtle physical depth');
  }
  close(frameLayout(1190, 462).height, 3.0);
  close(frameLayout(372, 351).height, 3.4);
});

test('wide, square and portrait source images retain their aspect ratio inside both responsive apertures', () => {
  for (const [width, height] of [[1190, 462], [372, 351]]) {
    const layout = frameLayout(width, height);
    for (const [imageWidth, imageHeight] of [[1920, 1080], [1536, 1024], [600, 600], [405, 525], [300, 900], [2400, 300]]) {
      const crop = preview.getProjectPreviewCrop(imageWidth, imageHeight, layout.imageWidth, layout.imageHeight);
      for (const key of ['repeatX', 'repeatY', 'offsetX', 'offsetY']) assert.ok(Number.isFinite(crop[key]));
      assert.ok(crop.repeatX > 0 && crop.repeatX <= 1);
      assert.ok(crop.repeatY > 0 && crop.repeatY <= 1);
      assert.ok(crop.offsetX >= 0 && crop.offsetX + crop.repeatX <= 1);
      assert.ok(crop.offsetY >= 0 && crop.offsetY + crop.repeatY <= 1);
      close(crop.offsetX, (1 - crop.repeatX) / 2);
      close(crop.offsetY, (1 - crop.repeatY) / 2);
      close(Math.max(crop.repeatX, crop.repeatY), 1);
      close(imageWidth * crop.repeatX / (imageHeight * crop.repeatY), layout.imageWidth / layout.imageHeight,
        1e-9);
    }
    const identical = preview.getProjectPreviewCrop(layout.imageWidth, layout.imageHeight, layout.imageWidth, layout.imageHeight);
    close(identical.repeatX, 1);
    close(identical.repeatY, 1);
    close(identical.offsetX, 0);
    close(identical.offsetY, 0);
  }
});

test('active scale, physical face depth and pickup lift remain inside the preview clearance', () => {
  close(preview.PROJECT_PREVIEW_ACTIVE_SCALE, 1.12);
  for (const [width, height] of viewports) {
    const layout = frameLayout(width, height);
    // The closest visible face includes the bevel and forward active lift.
    const faceDepth = layout.depth / 2 + layout.bevel + preview.PROJECT_PREVIEW_FRONT_LIFT + .01;
    const frontPerspective = geometry.ORBIT_CAMERA_Z / (geometry.ORBIT_CAMERA_Z - faceDepth);
    const emphasizedScale = preview.PROJECT_PREVIEW_ACTIVE_SCALE * frontPerspective;
    assert.ok(layout.width * emphasizedScale <= geometry.ORBIT_PREVIEW_WIDTH * 1.14);
    assert.ok(layout.height * emphasizedScale <= geometry.getOrbitPreviewHeight(width, height) * 1.14);
  }
});
