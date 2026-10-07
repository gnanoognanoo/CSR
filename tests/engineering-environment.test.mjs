import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/background/environment-model.ts', import.meta.url), 'utf8');
const exports = {};
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(compiled, { exports, module: { exports } });
const { getEnvironmentBudget, createSignals } = exports;

test('background raster work stays capped on high-density and oversized displays', () => {
  for (const [width, height] of [[390, 667], [1280, 720], [1920, 1080], [3840, 2160], [16000, 9000]]) {
    for (const compact of [false, true]) {
      for (const devicePixelRatio of [0.75, 1, 2, 4]) {
        const budget = getEnvironmentBudget(width, height, compact, devicePixelRatio);
        const maxPixels = compact ? 600000 : 1600000;
        assert.ok(Number.isFinite(budget.pixelRatio) && budget.pixelRatio > 0);
        assert.ok(budget.pixelRatio <= devicePixelRatio);
        assert.ok(width * height * budget.pixelRatio ** 2 <= maxPixels * 1.01);
        assert.ok(Number.isInteger(budget.signalCount) && budget.signalCount > 0);
        assert.ok(Number.isInteger(budget.panelCount) && budget.panelCount >= 0);
        assert.ok(budget.frameInterval >= 1000 / 30 - 0.001);
      }
    }
  }
});

test('mobile budgets reduce both signal and translucent geometry work', () => {
  const desktop = getEnvironmentBudget(1280, 720, false, 2);
  const mobile = getEnvironmentBudget(390, 667, true, 3);
  assert.ok(mobile.signalCount < desktop.signalCount * 0.75);
  assert.ok(mobile.panelCount <= desktop.panelCount);
  assert.ok(mobile.signalCount <= 100);
});

test('resize transients and invalid pixel ratios produce a usable finite budget', () => {
  for (const [width, height, devicePixelRatio] of [[0, 0, 1], [-1, 720, 0], [NaN, 720, NaN], [1280, Infinity, Infinity]]) {
    for (const compact of [true, false]) {
      const budget = getEnvironmentBudget(width, height, compact, devicePixelRatio);
      assert.ok(Number.isFinite(budget.pixelRatio) && budget.pixelRatio > 0);
      assert.ok(Number.isInteger(budget.signalCount) && budget.signalCount > 0);
      assert.ok(Number.isFinite(budget.frameInterval) && budget.frameInterval > 0);
    }
  }
});

test('signal layout is stable between remounts and every depth sample remains bounded', () => {
  for (const count of [0, 1, 72, 220]) {
    const signals = createSignals(count);
    assert.equal(signals.length, count);
    assert.equal(JSON.stringify(signals), JSON.stringify(createSignals(count)));
    for (const signal of signals) {
      assert.ok(Number.isFinite(signal.u) && signal.u >= -1 && signal.u <= 1);
      assert.ok(Number.isFinite(signal.v) && signal.v >= -1 && signal.v <= 1);
      assert.ok(Number.isFinite(signal.depth) && signal.depth >= 0 && signal.depth <= 1);
      assert.ok(Number.isFinite(signal.phase) && signal.phase >= 0 && signal.phase <= Math.PI * 2);
      assert.ok(Number.isFinite(signal.tone) && signal.tone >= 0 && signal.tone <= 1);
    }
  }
});

test('the stable signal field supplies multiple depth planes and spatial coverage', () => {
  const signals = createSignals(220);
  const depths = signals.map(signal => signal.depth);
  assert.ok(Math.max(...depths) - Math.min(...depths) > 0.6);
  for (const [x, y] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
    assert.ok(signals.some(signal => Number(signal.u >= 0) === x && Number(signal.v >= 0) === y));
  }
});
