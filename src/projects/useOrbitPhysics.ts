import { useLayoutEffect, useRef } from 'react';

/** Degrees are clockwise on screen. Index zero is the fixed bottom focus. */
export interface OrbitPhysicsOptions {
  count: number;
  initialRotation?: number;
  reducedMotion?: boolean;
  onFocus?: (index: number) => void;
  /** Nearest physical slot without wrapping, so carousel data can advance across turns. */
  onFocusStep?: (step: number) => void;
}

export interface OrbitPhysicsState {
  count: number;
  rotation: number;
  velocity: number;
  focus: number;
  isDragging: boolean;
  paused: boolean;
  reducedMotion: boolean;
  inputIdle: number;
  target: number | null;
}

export interface OrbitPhysicsController {
  readonly rotation: number;
  readonly velocity: number;
  readonly focus: number;
  readonly count: number;
  readonly isDragging: boolean;
  readonly isMoving: boolean;
  /** Call once per R3F frame. No internal animation loop or React updates. */
  tick: (deltaSeconds: number) => number;
  /** Supply wheel delta normalized to pixels; positive values turn clockwise. */
  impulse: (wheelPixels: number) => void;
  beginDrag: () => void;
  dragBy: (degrees: number, elapsedSeconds?: number) => void;
  endDrag: () => void;
  /** Cancel a gesture, without running a pending click selection. */
  cancelDrag: () => void;
  /** Take the shortest angular route, calling completion only after settling. */
  select: (index: number, onSettled?: () => void) => void;
  /** Select an explicit unwrapped slot, retaining the requested number of turns. */
  selectStep: (step: number, onSettled?: () => void) => void;
  /** Advance whole slots from the pending selection, preserving direction across turns. */
  step: (delta: number) => void;
  /** Freeze the exact position and momentum while an overlay or other mode owns input. */
  pause: (paused: boolean) => void;
  setRotation: (degrees: number) => void;
  configure: (options: Partial<OrbitPhysicsOptions>) => void;
}

const DRAG_DAMPING = 5.2;
const SNAP_FREQUENCY = 13;
const MAX_VELOCITY = 420;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const validCount = (count: number) => Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
const nearestFocusStep = (rotation: number, count: number) => count && Number.isFinite(rotation)
  ? Math.round(rotation / (360 / count))
  : 0;

export function wrapOrbitIndex(index: number, count: number): number {
  const length = validCount(count);
  return length && Number.isFinite(index) ? ((Math.round(index) % length) + length) % length : 0;
}

export function nearestOrbitIndex(rotation: number, count: number): number {
  const length = validCount(count);
  return length && Number.isFinite(rotation) ? wrapOrbitIndex(Math.round(rotation / (360 / length)), length) : 0;
}

/** Preserve accumulated turns and choose the equivalent target within 180 degrees. */
export function nearestOrbitTarget(rotation: number, index: number, count: number): number {
  const length = validCount(count);
  const current = Number.isFinite(rotation) ? rotation : 0;
  if (!length) return current;
  const target = wrapOrbitIndex(index, length) * 360 / length;
  return target + Math.round((current - target) / 360) * 360;
}

export function createOrbitPhysicsState(options: OrbitPhysicsOptions): OrbitPhysicsState {
  const count = validCount(options.count);
  const rotation = Number.isFinite(options.initialRotation) ? options.initialRotation! : 0;
  return {
    count, rotation, velocity: 0, focus: nearestOrbitIndex(rotation, count),
    isDragging: false, paused: false, reducedMotion: Boolean(options.reducedMotion),
    inputIdle: 1, target: null,
  };
}

/**
 * Deterministic, frame-rate independent decay and critically damped snapping.
 * The controller owns the mutable reference; this pure step is also testable
 * without mounting React or WebGL.
 */
export function advanceOrbitPhysics(previous: OrbitPhysicsState, deltaSeconds: number): OrbitPhysicsState {
  if (previous.paused || !previous.count || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return previous;
  const dt = Math.min(deltaSeconds, 1 / 15); // Do not jump after a suspended browser tab.
  const next = { ...previous, inputIdle: previous.inputIdle + dt };
  if (next.isDragging) {
    // A held pointer should stop carrying the velocity of an old movement.
    if (next.inputIdle > 0.05) next.velocity *= Math.exp(-12 * dt);
    return next;
  }

  if (next.target === null && next.velocity !== 0) {
    const decay = Math.exp(-DRAG_DAMPING * dt);
    next.rotation += next.velocity * (1 - decay) / DRAG_DAMPING;
    next.velocity *= decay;
  }

  if (next.target === null && next.inputIdle >= 0.14 && Math.abs(next.velocity) < 26) {
    const nearest = nearestOrbitTarget(next.rotation, nearestOrbitIndex(next.rotation, next.count), next.count);
    if (Math.abs(next.rotation - nearest) > 0.0001 || next.velocity !== 0) next.target = nearest;
  }

  if (next.target !== null) {
    if (next.reducedMotion) {
      next.rotation = next.target;
      next.velocity = 0;
      next.target = null;
    } else {
      const displacement = next.rotation - next.target;
      const springVelocity = next.velocity + SNAP_FREQUENCY * displacement;
      const decay = Math.exp(-SNAP_FREQUENCY * dt);
      next.rotation = next.target + (displacement + springVelocity * dt) * decay;
      next.velocity = (next.velocity - SNAP_FREQUENCY * springVelocity * dt) * decay;
      if (Math.abs(next.rotation - next.target) < 0.025 && Math.abs(next.velocity) < 0.12) {
        next.rotation = next.target;
        next.velocity = 0;
        next.target = null;
      }
    }
  }
  next.focus = nearestOrbitIndex(next.rotation, next.count);
  return next;
}

export function createOrbitPhysics(options: OrbitPhysicsOptions): OrbitPhysicsController {
  let state = createOrbitPhysicsState(options);
  let onFocus = options.onFocus;
  let onFocusStep = options.onFocusStep;
  let completion: (() => void) | undefined;

  const publish = (next: OrbitPhysicsState) => {
    const changed = next.focus !== state.focus;
    const step = nearestFocusStep(next.rotation, next.count);
    const stepChanged = step !== nearestFocusStep(state.rotation, state.count);
    state = next;
    if (changed) onFocus?.(state.focus);
    if (stepChanged) onFocusStep?.(step);
  };
  const cancelSelection = () => { completion = undefined; state.target = null; };
  const settle = () => {
    const callback = completion;
    completion = undefined;
    callback?.();
  };
  const selectTarget = (target: number, onSettled?: () => void, keepVelocity = false) => {
    cancelSelection();
    state.isDragging = false;
    state.inputIdle = 1;
    const remaining = target - state.rotation;
    // Consecutive steps keep moving smoothly. A reversed command discards
    // opposing momentum; a nearer target cannot inherit an overshooting speed.
    state.velocity = keepVelocity && state.velocity * remaining > 0
      ? Math.sign(remaining) * Math.min(Math.abs(state.velocity), SNAP_FREQUENCY * Math.abs(remaining))
      : 0;
    completion = onSettled;
    if (state.reducedMotion || Math.abs(remaining) < 0.025) {
      publish({ ...state, rotation: target, velocity: 0, focus: nearestOrbitIndex(target, state.count), target: null });
      settle();
    } else {
      state.target = target;
    }
  };

  const controller: OrbitPhysicsController = {
    get rotation() { return state.rotation; },
    get velocity() { return state.velocity; },
    get focus() { return state.focus; },
    get count() { return state.count; },
    get isDragging() { return state.isDragging; },
    get isMoving() { return state.isDragging || state.target !== null || state.velocity !== 0; },
    tick(deltaSeconds) {
      const hadTarget = state.target !== null;
      publish(advanceOrbitPhysics(state, deltaSeconds));
      if (hadTarget && state.target === null && !state.paused) settle();
      return state.rotation;
    },
    impulse(wheelPixels) {
      if (state.paused || state.isDragging || state.count < 2 || !Number.isFinite(wheelPixels) || wheelPixels === 0) return;
      cancelSelection();
      state.inputIdle = 0;
      const delta = clamp(wheelPixels, -240, 240);
      if (state.reducedMotion) {
        const rotation = state.rotation + delta * 0.35;
        publish({ ...state, rotation, velocity: 0, focus: nearestOrbitIndex(rotation, state.count) });
      } else {
        state.velocity = clamp(state.velocity + delta * 1.9, -MAX_VELOCITY, MAX_VELOCITY);
      }
    },
    beginDrag() {
      if (state.paused || state.count < 2) return;
      cancelSelection();
      state.isDragging = true;
      state.velocity = 0;
      state.inputIdle = 0;
    },
    dragBy(degrees, elapsedSeconds = 1 / 60) {
      if (!state.isDragging || state.paused || !Number.isFinite(degrees)) return;
      const duration = Number.isFinite(elapsedSeconds) ? clamp(elapsedSeconds, 1 / 240, 1 / 15) : 1 / 60;
      const rotation = state.rotation + degrees;
      const velocity = state.reducedMotion ? 0 : clamp(state.velocity * 0.65 + degrees / duration * 0.35, -MAX_VELOCITY, MAX_VELOCITY);
      publish({ ...state, rotation, velocity, inputIdle: 0, focus: nearestOrbitIndex(rotation, state.count) });
    },
    endDrag() {
      if (!state.isDragging) return;
      state.isDragging = false;
      state.inputIdle = 0.14;
      if (state.reducedMotion) controller.setRotation(nearestOrbitTarget(state.rotation, state.focus, state.count));
    },
    cancelDrag() {
      state.isDragging = false;
      state.velocity = 0;
      state.inputIdle = 1;
      cancelSelection();
    },
    select(index, onSettled) {
      if (!state.count || !Number.isFinite(index)) return;
      selectTarget(nearestOrbitTarget(state.rotation, index, state.count), onSettled);
    },
    selectStep(step, onSettled) {
      if (!state.count || !Number.isFinite(step)) return;
      const target = step * 360 / state.count;
      if (Number.isFinite(target)) selectTarget(target, onSettled);
    },
    step(delta) {
      if (state.paused || state.count < 2 || !Number.isFinite(delta)) return;
      const steps = Math.trunc(delta);
      if (!steps) return;
      const base = state.target ?? nearestOrbitTarget(state.rotation, state.focus, state.count);
      const target = base + steps * 360 / state.count;
      if (Number.isFinite(target)) selectTarget(target, undefined, true);
    },
    pause(paused) { state.paused = paused; },
    setRotation(degrees) {
      if (!Number.isFinite(degrees)) return;
      cancelSelection();
      publish({ ...state, rotation: degrees, velocity: 0, isDragging: false, inputIdle: 1, focus: nearestOrbitIndex(degrees, state.count) });
    },
    configure(next) {
      if ('onFocus' in next) onFocus = next.onFocus;
      if ('onFocusStep' in next) onFocusStep = next.onFocusStep;
      if ('reducedMotion' in next) state.reducedMotion = Boolean(next.reducedMotion);
      if ('count' in next) {
        const count = validCount(next.count ?? 0);
        if (count !== state.count) {
          cancelSelection();
          publish({ ...state, count, velocity: 0, isDragging: false, focus: nearestOrbitIndex(state.rotation, count) });
        }
      }
    },
  };
  return controller;
}

/** Each hook instance retains its own angle: use one for divisions and one per project context. */
export function useOrbitPhysics(options: OrbitPhysicsOptions): OrbitPhysicsController {
  const controller = useRef<OrbitPhysicsController | null>(null);
  if (!controller.current) controller.current = createOrbitPhysics(options);
  useLayoutEffect(() => { controller.current!.configure(options); });
  return controller.current;
}
