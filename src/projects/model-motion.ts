type Vector3 = [number, number, number];

export type ModelMotionState = Readonly<{
  offset: Readonly<Vector3>;
  velocity: Readonly<Vector3>;
  orbitTime: number;
  dragging: boolean;
  hovered: boolean;
  /** Free bodies bypass the orbital lane until their soft return settles. */
  free: boolean;
  /** Smooth pickup/release emphasis for depth, scale, and light. */
  held: number;
}>;

export type ModelMotionController = {
  readonly time: number;
  readonly paused: boolean;
  readonly speed: number;
  get: (index: number) => ModelMotionState;
  tick: (delta: number, reducedMotion?: boolean) => void;
  pause: (paused: boolean) => void;
  slow: (speed: number) => void;
  beginDrag: (index: number) => void;
  dragBy: (index: number, dx: number, dy: number, elapsedSeconds: number, dz?: number) => void;
  endDrag: (index: number) => void;
  cancelDrag: (index: number) => void;
  setHovered: (index: number, hovered: boolean) => void;
};

type MutableModelState = {
  offset: Vector3;
  velocity: Vector3;
  target: Vector3;
  pointerVelocity: Vector3;
  orbitTime: number;
  dragging: boolean;
  hovered: boolean;
  free: boolean;
  held: number;
  dragMotionAge: number;
  releaseAge: number;
};

// Enough travel to cross the composition, with a finite safety limit for lost pointers.
export const MAX_MODEL_OFFSET = 24;
export const MAX_MODEL_THROW_SPEED = 12;
export const MODEL_DRAG_THRESHOLD_PX = 8;
const FOLLOW_FREQUENCY = 24;
const RETURN_FREQUENCY = 5.6;
const FLOAT_SECONDS = .14;
const FLOAT_DAMPING = 3.4;
const MAX_FRAME_TIME = .1;

export const isModelDrag = (dx: number, dy: number) => Math.hypot(dx, dy) >= MODEL_DRAG_THRESHOLD_PX;

function limitMagnitude(vector: Vector3, maximum: number) {
  const magnitude = Math.hypot(...vector);
  if (magnitude <= maximum) return;
  const scale = maximum / magnitude;
  for (let axis = 0; axis < 3; axis++) vector[axis] *= scale;
}

/** Exact critically damped spring, stable across mobile and desktop frame rates. */
function spring(state: MutableModelState, target: Readonly<Vector3>, frequency: number, elapsed: number) {
  const decay = Math.exp(-frequency * elapsed);
  for (let axis = 0; axis < 3; axis++) {
    const displacement = state.offset[axis] - target[axis];
    const coupled = state.velocity[axis] + frequency * displacement;
    state.offset[axis] = target[axis] + (displacement + coupled * elapsed) * decay;
    state.velocity[axis] = (state.velocity[axis] - frequency * coupled * elapsed) * decay;
  }
}

/** Independent free movement; the other six models retain their moving orbital anchors. */
export function createModelMotionController(count = 7): ModelMotionController {
  const modelCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 7;
  const states: MutableModelState[] = Array.from({ length: modelCount }, () => ({
    offset: [0, 0, 0], velocity: [0, 0, 0], target: [0, 0, 0], pointerVelocity: [0, 0, 0],
    orbitTime: 0, dragging: false, hovered: false, free: false, held: 0,
    dragMotionAge: Infinity, releaseAge: Infinity,
  }));
  let time = 0, paused = false, speed = 1;

  function get(index: number) {
    const state = states[index];
    if (!state) throw new RangeError(`Unknown orbiting model: ${index}`);
    return state;
  }

  return {
    get time() { return time; },
    get paused() { return paused; },
    get speed() { return speed; },
    get,
    pause(value) { paused = value; },
    slow(value) { if (Number.isFinite(value)) speed = Math.max(0, Math.min(1, value)); },
    setHovered(index, hovered) { get(index).hovered = hovered; },
    beginDrag(index) {
      const state = get(index);
      state.dragging = true; state.free = true;
      state.target = [...state.offset];
      state.velocity.fill(0); state.pointerVelocity.fill(0);
      state.dragMotionAge = Infinity;
    },
    dragBy(index, dx, dy, elapsedSeconds, dz = 0) {
      const state = get(index);
      if (!state.dragging || paused || ![dx, dy, dz, elapsedSeconds].every(Number.isFinite)) return;
      const elapsed = Math.max(1 / 240, Math.min(.12, elapsedSeconds));
      const previous = [...state.target];
      state.target[0] += dx; state.target[1] += dy; state.target[2] += dz;
      limitMagnitude(state.target, MAX_MODEL_OFFSET);
      const movement = state.target.map((value, axis) => value - previous[axis]);
      if (Math.hypot(...movement) < .00001) return;
      const blend = Number.isFinite(state.dragMotionAge) ? 1 - Math.exp(-elapsed / .04) : 1;
      for (let axis = 0; axis < 3; axis++) {
        state.pointerVelocity[axis] += (movement[axis] / elapsed - state.pointerVelocity[axis]) * blend;
      }
      limitMagnitude(state.pointerVelocity, MAX_MODEL_THROW_SPEED);
      state.dragMotionAge = 0;
    },
    endDrag(index) {
      const state = get(index);
      if (!state.dragging) return;
      state.dragging = false; state.releaseAge = 0;
      const releaseScale = .82 * Math.exp(-Math.max(0, state.dragMotionAge - .06) * 18);
      state.velocity = state.pointerVelocity.map(value => value * releaseScale) as Vector3;
      limitMagnitude(state.velocity, MAX_MODEL_THROW_SPEED);
    },
    cancelDrag(index) {
      const state = get(index);
      state.dragging = false; state.releaseAge = FLOAT_SECONDS;
      state.velocity.fill(0); state.pointerVelocity.fill(0);
    },
    tick(delta, reducedMotion = false) {
      if (paused || !Number.isFinite(delta) || delta <= 0) return;
      const elapsed = Math.min(delta, MAX_FRAME_TIME) * speed;
      const previousTime = time;
      if (!reducedMotion) time += elapsed;
      for (const state of states) {
        state.dragMotionAge += elapsed;
        const emphasisBlend = reducedMotion ? 1 : 1 - Math.exp(-elapsed * 12);
        state.held += ((state.dragging ? 1 : 0) - state.held) * emphasisBlend;
        if (state.dragging) {
          if (reducedMotion) { state.offset = [...state.target]; state.velocity.fill(0); }
          else spring(state, state.target, FOLLOW_FREQUENCY, elapsed);
          // Only the held body pauses its anchor, so the pointer does not fight orbital drift.
          continue;
        }
        const phaseLag = previousTime - state.orbitTime;
        state.orbitTime = time - phaseLag * Math.exp(-elapsed * 6);
        if (reducedMotion) {
          state.offset.fill(0); state.velocity.fill(0); state.free = false;
          continue;
        }
        // A short inertial float precedes attraction to the model's continuously moving anchor.
        const floatTime = Math.min(elapsed, Math.max(0, FLOAT_SECONDS - state.releaseAge));
        if (floatTime) {
          const decay = Math.exp(-FLOAT_DAMPING * floatTime);
          for (let axis = 0; axis < 3; axis++) {
            state.offset[axis] += state.velocity[axis] * (1 - decay) / FLOAT_DAMPING;
            state.velocity[axis] *= decay;
          }
        }
        state.releaseAge += elapsed;
        if (elapsed > floatTime) spring(state, [0, 0, 0], RETURN_FREQUENCY, elapsed - floatTime);
        limitMagnitude(state.offset, MAX_MODEL_OFFSET);
        if (Math.hypot(...state.offset) < .015 && Math.hypot(...state.velocity) < .06 && time - state.orbitTime < .001) {
          state.offset.fill(0); state.velocity.fill(0); state.free = false; state.orbitTime = time;
        }
      }
    },
  };
}
