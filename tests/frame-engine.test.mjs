import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tick = () => new Promise(resolve => setImmediate(resolve));

function loadTypeScript(filename, globals = {}, imports = {}) {
  const source = readFileSync(path.join(root, 'src', filename), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  const context = { exports, module: { exports }, require: name => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  }, ...globals };
  vm.runInNewContext(code, context, { filename });
  return context.module.exports;
}

const sequences = loadTypeScript('sequences.ts');

function harness(mobile = false, reduced = false) {
  const requests = [], bitmaps = [], draws = [], ready = [];
  const timers = new Map(), idle = new Map(), animations = new Map();
  let id = 0, activeRequests = 0, maxActiveRequests = 0;
  const schedule = map => callback => { const key = ++id; map.set(key, callback); return key; };
  const context2d = { setTransform() {}, drawImage(bitmap) {
    assert.equal(bitmap.closed, false, 'A closed bitmap must never be drawn');
    draws.push(bitmap.url);
  } };
  const canvas = { getContext: () => context2d, dataset: {} };
  const globals = {
    AbortController, performance,
    window: { innerWidth: mobile ? 390 : 1440, innerHeight: 900, devicePixelRatio: 1,
      createImageBitmap: true, requestIdleCallback: schedule(idle) },
    navigator: { hardwareConcurrency: 8 },
    requestAnimationFrame: schedule(animations), cancelAnimationFrame: key => animations.delete(key),
    setTimeout: schedule(timers), clearTimeout: key => timers.delete(key),
    createImageBitmap: async blob => {
      const bitmap = { url: blob.url, width: mobile ? 768 : 1920, height: mobile ? 432 : 1080,
        closed: false, close() { this.closed = true; } };
      bitmaps.push(bitmap); return bitmap;
    },
    fetch: (url, { signal }) => new Promise((resolve, reject) => {
      activeRequests++; maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      const request = { url, signal, settled: false, finish() {
        if (request.settled) return;
        request.settled = true; activeRequests--;
        resolve({ ok: true, blob: async () => ({ url }) });
      } };
      signal.addEventListener('abort', () => {
        if (request.settled) return;
        request.settled = true; activeRequests--; reject(new Error('Aborted'));
      }, { once: true });
      requests.push(request);
    }),
  };
  const { FrameEngine } = loadTypeScript('frame-engine.ts', globals, { './sequences': sequences });
  const engine = new FrameEngine(canvas, mobile, reduced, ok => ready.push(ok));
  function runCallbacks(map) {
    const callbacks = [...map.values()]; map.clear(); callbacks.forEach(callback => callback());
  }
  async function drain() {
    for (let attempt = 0; attempt < 500; attempt++) {
      const pending = requests.filter(request => !request.settled);
      if (!pending.length) { runCallbacks(animations); return; }
      pending.forEach(request => request.finish()); await tick();
    }
    assert.fail('Frame requests did not settle');
  }
  return { engine, requests, bitmaps, draws, ready, drain, timers, idle, animations,
    runCallbacks, maxActive: () => maxActiveRequests };
}

test('mobile endpoints and their neighbours only request supplied image files', async () => {
  const h = harness(true);
  try {
    for (let scene = 0; scene < 4; scene++) {
      h.engine.update(scene, 1); await h.drain();
      assert.ok(h.requests.some(request => request.url === sequences.frameUrl(scene, 239, true)));
      assert.ok(h.bitmaps.filter(bitmap => !bitmap.closed).length <= 18, 'Mobile decoded cache stays bounded');
    }
    h.engine.update(4, .75); await h.drain();
    assert.ok(h.requests.length > 10, 'Exercise endpoint neighbours, not only one still');
    for (const { url } of h.requests) {
      assert.match(url, /\/mobile\/frame_\d{4}\.jpg$/);
      assert.ok(existsSync(path.resolve(root, 'public', `.${url}`)), `Missing mobile asset: ${url}`);
    }
    assert.ok(h.maxActive() <= 4, 'Fetch concurrency must remain bounded');
  } finally { h.engine.destroy(); await tick(); }
});

test('the next scene remains drawable after the current decoded cache fills', async () => {
  const h = harness();
  try {
    for (const progress of [.2, .3, .4, .5, .6, .7, .8, .9]) {
      h.engine.update(0, progress); await h.drain();
    }
    assert.ok(h.bitmaps.some(bitmap => bitmap.closed), 'Exercise eviction before the transition');
    h.draws.length = 0;
    h.engine.update(0, .98); await h.drain();
    assert.ok(h.draws.includes(sequences.frameUrl(1, 0, false)), 'Crossfade must draw the next scene');
    assert.ok(h.bitmaps.filter(bitmap => !bitmap.closed).length <= 24, 'Decoded cache stays bounded');
  } finally { h.engine.destroy(); await tick(); }
});

test('destroy aborts requests, closes decoded images and prevents late idle work', async () => {
  const h = harness();
  h.engine.update(0, .2); await h.drain();
  assert.ok(h.bitmaps.some(bitmap => !bitmap.closed));
  h.engine.update(0, .7);
  h.runCallbacks(h.timers); // Leave an idle callback queued when disposal occurs.
  const pending = h.requests.filter(request => !request.settled);
  assert.ok(pending.length > 0);
  const requestedBefore = h.requests.length, drawnBefore = h.draws.length, readyBefore = h.ready.length;
  h.engine.destroy();
  h.runCallbacks(h.idle); h.runCallbacks(h.timers); h.runCallbacks(h.animations);
  await tick();
  assert.ok(pending.every(request => request.signal.aborted));
  assert.ok(h.bitmaps.every(bitmap => bitmap.closed));
  assert.equal(h.requests.length, requestedBefore);
  assert.equal(h.draws.length, drawnBefore);
  assert.equal(h.ready.length, readyBefore);
});

test('a fast scrub prioritizes the newest target as soon as a fetch slot opens', async () => {
  const h = harness();
  try {
    h.engine.update(0, .1);
    h.engine.update(0, .4);
    h.engine.update(0, .8);
    const before = h.requests.length;
    assert.equal(before, 4, 'Keep all fetch slots busy while targets change');
    h.requests[0].finish(); await tick();
    const expected = sequences.frameUrl(0, sequences.frameAt(.8, 240), false);
    assert.equal(h.requests[before]?.url, expected, 'Obsolete urgent frames must not delay the current target');
  } finally { h.engine.destroy(); await tick(); }
});

test('frame mapping clamps bounds, reverses monotonically and stays still at unchanged progress', async () => {
  for (const step of [1, 2]) {
    assert.equal(sequences.frameAt(-1, 240, step), 0);
    assert.equal(sequences.frameAt(2, 240, step), 239);
    assert.equal(sequences.frameAt(.5, 240, step), 120);
    assert.equal(sequences.frameAt(.5, 1, step), 0);
    const reverse = Array.from({ length: 101 }, (_, i) => sequences.frameAt(1 - i / 100, 240, step));
    assert.ok(reverse.every((frame, i) => i === 0 || frame <= reverse[i - 1]));
  }
  const h = harness();
  try {
    h.engine.update(0, .5); await h.drain();
    const requested = h.requests.length, drawn = h.draws.length;
    h.engine.update(0, .5); await h.drain();
    assert.equal(h.requests.length, requested, 'Unchanged progress does not request later frames');
    assert.equal(h.draws.length, drawn, 'Unchanged progress does not advance the canvas');
  } finally { h.engine.destroy(); await tick(); }
});

test('reduced motion requests only representative stills including the static fifth endpoint', async () => {
  const h = harness(false, true);
  try {
    for (let scene = 0; scene < 5; scene++) {
      h.engine.update(scene, .95); await h.drain();
      h.engine.update(scene, .2); await h.drain();
    }
    assert.deepEqual(h.requests.map(request => request.url),
      Array.from({ length: 5 }, (_, scene) => sequences.frameUrl(scene, 0, false)));
    assert.equal(h.timers.size, 0, 'Reduced motion does not schedule sequence warming');
  } finally { h.engine.destroy(); await tick(); }
});
