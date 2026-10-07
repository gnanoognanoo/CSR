import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = file => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const fieldExports = {};
vm.runInNewContext(compile('../src/background/particle-field.ts'), { exports: fieldExports, module: { exports: fieldExports } });
const componentCode = compile('../src/background/EngineeringEnvironment.tsx');

function eventSurface() {
  const listeners = [];
  const unmatchedRemovals = [];
  const capture = options => typeof options === 'boolean' ? options : Boolean(options?.capture);
  return {
    listeners, unmatchedRemovals,
    addEventListener(type, callback, options) {
      listeners.push({ type, callback, capture: capture(options), passive: Boolean(options?.passive) });
    },
    removeEventListener(type, callback, options) {
      const index = listeners.findIndex(item => item.type === type && item.callback === callback && item.capture === capture(options));
      if (index < 0) unmatchedRemovals.push(type); else listeners.splice(index, 1);
    },
    dispatch(type, data = {}) {
      const event = {
        ...data,
        preventDefault() { assert.fail('The background must not consume a foreground gesture'); },
        stopPropagation() { assert.fail('The background must not block foreground event propagation'); },
      };
      for (const item of [...listeners]) if (item.type === type) item.callback(event);
    },
  };
}

// Minimal hook commit semantics let prop changes exercise the real effect cleanup.
// Canvas operations are recorded as rendered dots/dashes, rather than accessing
// private particle or cursor state inside the component.
function mountBackground(overrides = {}) {
  const window = Object.assign(eventSurface(), { devicePixelRatio: 3 });
  const document = Object.assign(eventSurface(), { hidden: false });
  const bounds = { left: 0, top: 0, width: 800, height: 600 };
  const drawings = [];
  const context = {
    setTransform(...transform) { this.transform = transform; },
    clearRect() {
      this.current = { dots: [], dashes: [], transform: [...this.transform] };
      drawings.push(this.current);
    },
    beginPath() { this.start = null; this.end = null; },
    rect(x, y, width, height) { this.current.dots.push({ x: x + width / 2, y: y + height / 2 }); },
    fill() {},
    moveTo(x, y) { this.start = { x, y }; },
    lineTo(x, y) { this.end = { x, y }; },
    stroke() {
      this.current.dashes.push({
        x: (this.start.x + this.end.x) / 2, y: (this.start.y + this.end.y) / 2,
        length: Math.hypot(this.end.x - this.start.x, this.end.y - this.start.y),
        color: this.strokeStyle, opacity: this.globalAlpha,
      });
    },
  };
  const canvas = { getContext: () => context, getBoundingClientRect: () => bounds, width: 0, height: 0 };
  const frames = new Map();
  let frameId = 0, time = 0, hookIndex = 0;
  const hooks = [], effects = [], observers = [];
  const react = {
    useRef(initial) {
      const index = hookIndex++;
      return hooks[index] ??= { current: initial };
    },
    useEffect(callback, dependencies) {
      const index = hookIndex++;
      const old = hooks[index];
      if (!old || dependencies.some((value, axis) => !Object.is(value, old.dependencies[axis]))) {
        effects.push({ index, callback, dependencies });
      }
    },
  };
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe(target) { assert.equal(target, canvas); }
    disconnect() { this.disconnected = true; }
  }
  const exports = {};
  vm.runInNewContext(componentCode, {
    exports, module: { exports }, window, document, ResizeObserver,
    requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === './particle-field') return fieldExports;
      if (name === './environment.css') return {};
      throw new Error(`Unexpected component dependency: ${name}`);
    },
  });
  let props = { variant: 'projects', motion: { rotation: 0 }, compact: false, reducedMotion: false, paused: false, ...overrides };
  const render = changes => {
    props = { ...props, ...changes };
    hookIndex = 0;
    const tree = exports.default(props);
    tree.props.children.props.ref.current = canvas;
    for (const item of effects) hooks[item.index]?.cleanup?.();
    for (const item of effects) hooks[item.index] = { dependencies: item.dependencies, cleanup: item.callback() };
    effects.length = 0;
  };
  const tick = () => {
    time += 1000 / 60;
    const pending = [...frames];
    for (const [id, callback] of pending) { frames.delete(id); callback(time); }
    return pending.length;
  };
  const settle = () => {
    let count = 0;
    while (frames.size && count < 400) { tick(); count++; }
    assert.equal(frames.size, 0, 'Background must stop scheduling frames after its field settles');
    return count;
  };
  render({});
  return {
    window, document, canvas, bounds, drawings, frames, observers, render, tick, settle,
    latest: () => drawings.at(-1),
    unmount() { for (const hook of hooks) hook.cleanup?.(); },
  };
}

test('initial home grid draws once and does not schedule perpetual idle animation', () => {
  const app = mountBackground();
  const idle = app.latest();
  assert.ok(idle.dots.length > 500);
  assert.equal(idle.dashes.length, 0);
  assert.equal(app.canvas.width, 1600);
  assert.equal(app.canvas.height, 1200);
  assert.deepEqual(idle.transform, [2, 0, 0, 2, 0, 0]);
  assert.ok(app.settle() <= 2);
  const drawCount = app.drawings.length;
  assert.equal(app.tick(), 0);
  assert.equal(app.drawings.length, drawCount);
  app.unmount();
});

test('both route backgrounds capture pointer movement over cards without consuming their gestures', () => {
  const projects = mountBackground({ variant: 'projects' });
  const members = mountBackground({ variant: 'members' });
  for (const app of [projects, members]) {
    app.settle();
    for (const type of ['mousemove', 'touchstart', 'touchmove', 'touchend', 'touchcancel']) {
      const handler = app.window.listeners.find(item => item.type === type);
      assert.ok(handler?.capture, `${type} must observe foreground input during capture`);
      assert.ok(handler?.passive, `${type} must leave gesture defaults to the foreground`);
    }
    app.window.dispatch('mousemove', { clientX: 360, clientY: 270, target: { role: 'member-or-project-card' } });
    assert.ok(app.settle() > 10, 'A new pointer location must ease into its displaced field');
    assert.ok(app.latest().dashes.length > 100);
  }
  assert.deepEqual(projects.latest(), members.latest());
  projects.unmount();
  members.unmount();
});

test('a stationary pointer holds a visible cavity, stops animation, and restores home dots on exit', () => {
  const app = mountBackground();
  app.settle();
  const home = app.latest().dots;
  const cursor = { clientX: 400, clientY: 300 };
  const nearestHome = Math.min(...home.map(dot => Math.hypot(dot.x - cursor.clientX, dot.y - cursor.clientY)));
  app.window.dispatch('mousemove', cursor);
  app.settle();
  const displaced = app.latest();
  const nearestDash = Math.min(...displaced.dashes.map(dash => Math.hypot(dash.x - cursor.clientX, dash.y - cursor.clientY)));
  assert.ok(nearestDash > nearestHome + 40, 'Radial displacement must visibly open the pointer cavity');
  assert.ok(displaced.dashes.every(dash => dash.length >= 2 && dash.length <= 10));
  const drawCount = app.drawings.length;
  assert.equal(app.tick(), 0);
  assert.equal(app.drawings.length, drawCount, 'The settled cavity is retained without redrawing');
  app.window.dispatch('mouseout', { relatedTarget: null });
  app.settle();
  assert.equal(app.latest().dashes.length, 0);
  assert.equal(app.latest().dots.length, home.length);
  app.latest().dots.forEach((dot, index) => {
    assert.ok(Math.abs(dot.x - home[index].x) < .05);
    assert.ok(Math.abs(dot.y - home[index].y) < .05);
  });
  app.unmount();
});

test('touch gestures use a smaller field on tablets and restore after the final touch ends', () => {
  const app = mountBackground();
  app.settle();
  app.window.dispatch('mousemove', { clientX: 400, clientY: 300 });
  app.settle();
  const mouseDashCount = app.latest().dashes.length;
  app.window.dispatch('blur');
  app.settle();
  app.window.dispatch('touchstart', { touches: [{ clientX: 400, clientY: 300 }], target: { role: 'card' } });
  app.settle();
  assert.ok(app.latest().dashes.length > 0);
  assert.ok(app.latest().dashes.length < mouseDashCount, 'Touch footprint must be smaller even above the compact breakpoint');
  const first = app.latest();
  app.window.dispatch('touchmove', { touches: [{ clientX: 500, clientY: 350 }] });
  app.settle();
  assert.notDeepEqual(app.latest(), first);
  app.window.dispatch('touchend', { touches: [{ clientX: 520, clientY: 370 }] });
  app.settle();
  assert.ok(app.latest().dashes.length > 0, 'Remaining fingers keep the field active');
  app.window.dispatch('touchend', { touches: [] });
  app.settle();
  assert.equal(app.latest().dashes.length, 0);
  app.unmount();
});

test('hidden and paused states cancel pending frames and resume without perpetual background work', () => {
  const app = mountBackground();
  app.window.dispatch('mousemove', { clientX: 400, clientY: 300 });
  app.tick();
  assert.ok(app.frames.size > 0);
  app.document.hidden = true;
  app.document.dispatch('visibilitychange');
  assert.equal(app.frames.size, 0);
  const hiddenDrawCount = app.drawings.length;
  app.window.dispatch('mousemove', { clientX: 200, clientY: 100 });
  app.tick();
  assert.equal(app.drawings.length, hiddenDrawCount);
  app.document.hidden = false;
  app.document.dispatch('visibilitychange');
  app.settle();
  assert.equal(app.latest().dashes.length, 0);
  app.window.dispatch('mousemove', { clientX: 300, clientY: 200 });
  app.tick();
  app.render({ paused: true });
  assert.equal(app.frames.size, 0);
  const pausedDrawCount = app.drawings.length;
  app.window.dispatch('mousemove', { clientX: 600, clientY: 400 });
  assert.equal(app.frames.size, 0);
  assert.equal(app.drawings.length, pausedDrawCount);
  app.render({ paused: false });
  app.settle();
  assert.ok(app.latest().dashes.length > 0);
  app.unmount();
});

test('reduced motion stays static, resize regenerates homes, and unmount removes every listener and observer', () => {
  const app = mountBackground();
  app.window.dispatch('mousemove', { clientX: 400, clientY: 300 });
  app.tick();
  app.render({ reducedMotion: true });
  assert.equal(app.frames.size, 0);
  assert.equal(app.latest().dashes.length, 0);
  app.window.dispatch('mousemove', { clientX: 300, clientY: 200 });
  app.window.dispatch('touchstart', { touches: [{ clientX: 300, clientY: 200 }] });
  assert.equal(app.frames.size, 0);
  const originalCount = app.latest().dots.length;
  app.bounds.width = 390;
  app.bounds.height = 667;
  app.render({ compact: true });
  assert.ok(app.latest().dots.length < originalCount);
  assert.equal(app.canvas.width, 780);
  assert.equal(app.canvas.height, 1334);
  app.bounds.width = 420;
  app.window.dispatch('resize');
  assert.equal(app.canvas.width, 840);
  assert.equal(app.frames.size, 0);
  app.render({ reducedMotion: false });
  app.window.dispatch('touchstart', { touches: [{ clientX: 200, clientY: 300 }] });
  app.tick();
  assert.ok(app.frames.size > 0);
  app.unmount();
  assert.equal(app.frames.size, 0);
  assert.equal(app.window.listeners.length, 0);
  assert.equal(app.document.listeners.length, 0);
  assert.deepEqual(app.window.unmatchedRemovals, []);
  assert.deepEqual(app.document.unmatchedRemovals, []);
  assert.ok(app.observers.every(observer => observer.disconnected));
});
