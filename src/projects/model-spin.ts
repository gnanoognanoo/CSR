/** Independent self-spin: orbital position remains owned by model-motion. */
export const MODEL_SELF_SPIN_SPEEDS = [.12, .13, .14, .15, .16, .17, .18] as const
export type ModelSpinState = { angle: number; speed: number }
export type ModelSpinOptions = { index: number; hovered?: boolean; paused?: boolean; dragging?: boolean; reducedMotion?: boolean }
export type SpinEnvelope = { radius: number; verticalSupport: number }
// The expanded outer lane can put a body well away from the lens axis.
// Account for that perspective shift through the model's complete self-turn.
export const MODEL_MAX_CAMERA_SLOPE = .55

export function createModelSpin(index: number): ModelSpinState {
  return { angle: 0, speed: MODEL_SELF_SPIN_SPEEDS[index % MODEL_SELF_SPIN_SPEEDS.length] ?? MODEL_SELF_SPIN_SPEEDS[0] }
}

/** Exact exponential speed integration preserves monotonic full turns at any frame rate. */
export function advanceModelSpin(state: ModelSpinState, seconds: number, options: ModelSpinOptions): ModelSpinState {
  if (options.paused || options.dragging || options.reducedMotion || !Number.isFinite(seconds) || seconds <= 0) return state
  const delta = Math.min(seconds, .1)
  const baseSpeed = MODEL_SELF_SPIN_SPEEDS[options.index % MODEL_SELF_SPIN_SPEEDS.length] ?? MODEL_SELF_SPIN_SPEEDS[0]
  const targetSpeed = baseSpeed * (options.hovered ? .24 : 1)
  const response = 5
  const decay = Math.exp(-response * delta)
  return {
    angle: state.angle + targetSpeed * delta + (state.speed - targetSpeed) * (1 - decay) / response,
    speed: targetSpeed + (state.speed - targetSpeed) * decay,
  }
}

/** Accumulate the exact yaw sweep of an authored, centered vertex. */
export function includeSpinVertex(envelope: SpinEnvelope, x: number, y: number, z: number, targetSize: number, maximumScale: number, closestDistance: number): void {
  const radius = Math.hypot(x, z)
  envelope.radius = Math.max(envelope.radius, radius)
  // Vertical perspective expansion is greatest when this vertex faces the camera.
  envelope.verticalSupport = Math.max(envelope.verticalSupport,
    2 * Math.abs(y) * closestDistance + (2 * closestDistance * MODEL_MAX_CAMERA_SLOPE + targetSize * maximumScale) * radius)
}

/** Largest constant scale whose complete turn fits the published square footprint. */
export function fullSpinNormalization(envelope: SpinEnvelope, targetSize: number, maximumScale: number, closestDistance: number): number {
  const horizontalScale = envelope.radius > 0
    ? targetSize * closestDistance / (2 * envelope.radius * Math.hypot(closestDistance, closestDistance * MODEL_MAX_CAMERA_SLOPE + targetSize * maximumScale / 2))
    : Infinity
  const verticalScale = envelope.verticalSupport > 0 ? targetSize * closestDistance / envelope.verticalSupport : Infinity
  const scale = Math.min(horizontalScale, verticalScale)
  // Small raster margin protects antialiased silhouette edges at the viewport boundary.
  return Number.isFinite(scale) && scale > 0 ? scale * .985 : 1
}
