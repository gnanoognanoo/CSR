// A single calm division orbit surrounds the independent mechanical selector.
export const ORBIT_CAMERA_Z = 40
export const ORBIT_VIEW_SIZE = 22.5
export const ORBIT_CAMERA_FOV = 2 * Math.atan(ORBIT_VIEW_SIZE / (2 * ORBIT_CAMERA_Z)) * 180 / Math.PI
// A slightly more open pitch preserves hub clearance around the larger screens.
export const ORBIT_TILT = -.90
export const ORBIT_Y_SCALE = Math.cos(ORBIT_TILT)
export const ORBIT_RING_RADIUS = 10.24
export const ORBIT_MODEL_RADIUS = 10.5
export const ORBIT_DIVISION_COUNT = 7
export const ORBIT_OUTER_RADIUS = 11.2
export const ORBIT_INNER_RADIUS = 8.4
export const ORBIT_DEPTH = .4
export const ORBIT_PREVIEW_WIDTH = 6.35
export const ORBIT_PREVIEW_HEIGHT = 3.0
export const ORBIT_MODEL_SIZE = 4.8
export const ORBIT_ACTIVE_SCALE = 1.14
export const ORBIT_ACTIVE_LIFT = .55
export const ORBIT_MODEL_MARGIN = .13
export const ORBIT_MODEL_SPEED = .025

export type ModelPosition = { x: number; y: number; z: number }
export type ModelScreenPosition = { x: number; y: number; scale: number; unitsPerPixel: number; size?: number }
export type ProjectScreenPosition = ModelScreenPosition & { rotation: number }
export type ModelEmphasis = { active: number; hover: number }
export type ModelPose = { position: ModelPosition; scale: number }
export type ModelFreeMotion = { free?: boolean; held?: number }
type ModelProjectionSource = { readonly time: number; get: (index: number) => { offset: readonly number[]; orbitTime?: number } & ModelFreeMotion }

// A single shallow plane gives depth without crossing the project selector.
export const ATOMIC_PLANES = [{ x: .09, y: 0, z: 0 }] as const
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))

const landscapeBlend = (width: number, height: number) => Math.max(0, Math.min(1, (width / Math.max(1, height) - 1.15) / .6))

/** Landscape gets a broad, close composition; portrait retains room for all seven bodies. */
export function getOrbitViewSize(width: number, height: number): number {
  return 33.5 + (ORBIT_VIEW_SIZE - 33.5) * landscapeBlend(width, height)
}

export function getOrbitTilt(width: number, height: number): number {
  return -.32 + (ORBIT_TILT + .32) * landscapeBlend(width, height)
}

/** Portrait needs a taller plate to retain readable previews at its wider frustum. */
export function getOrbitPreviewHeight(width: number, height: number): number {
  return 3.4 + (ORBIT_PREVIEW_HEIGHT - 3.4) * landscapeBlend(width, height)
}

/** The render camera and projected controls use this same responsive frustum. */
export function getOrbitCameraFov(width: number, height: number): number {
  const verticalSpan = getOrbitViewSize(width, height) * Math.max(1, height / Math.max(1, width))
  return 2 * Math.atan(verticalSpan / (2 * ORBIT_CAMERA_Z)) * 180 / Math.PI
}

type ProtectedEllipse = { xRadius: number; yRadius: number; centerY: number; padX: number; padY: number }

function projectedEllipse(radius: number, depth: number, tilt: number, padX = 0, padY = 0): ProtectedEllipse {
  const cosine = Math.cos(tilt), sine = Math.sin(tilt)
  const denominator = 1 - depth * cosine / ORBIT_CAMERA_Z
  const perspective = radius * sine / ORBIT_CAMERA_Z / denominator
  const ellipseDenominator = 1 - perspective * perspective
  return {
    xRadius: radius / (denominator * Math.sqrt(ellipseDenominator)),
    yRadius: (radius * cosine - depth * sine * perspective) / denominator / ellipseDenominator,
    centerY: (-depth * sine + radius * cosine * perspective) / denominator / ellipseDenominator,
    padX, padY,
  }
}

/** Bounds include the beveled ring and the upright preview plates through a full turn. */
function protectedEllipses(width: number, height: number): ProtectedEllipse[] {
  const tilt = getOrbitTilt(width, height)
  const previewDepth = ORBIT_DEPTH / 2 + .051
  const nearestPreview = ORBIT_CAMERA_Z - ORBIT_RING_RADIUS * Math.abs(Math.sin(tilt)) - previewDepth * Math.cos(tilt)
  const previewScale = ORBIT_CAMERA_Z / nearestPreview * 1.14
  return [
    projectedEllipse(ORBIT_OUTER_RADIUS + .03, -ORBIT_DEPTH / 2 - .02, tilt),
    projectedEllipse(ORBIT_OUTER_RADIUS + .03, ORBIT_DEPTH / 2 + .02, tilt),
    projectedEllipse(ORBIT_RING_RADIUS, previewDepth, tilt, ORBIT_PREVIEW_WIDTH * previewScale / 2, getOrbitPreviewHeight(width, height) * previewScale / 2),
  ]
}

function crossesSelector(x: number, y: number, modelHalf: number, ellipses: readonly ProtectedEllipse[]): boolean {
  return ellipses.some(ellipse => {
    const dx = Math.max(0, Math.abs(x) - modelHalf - ellipse.padX - ORBIT_MODEL_MARGIN)
    const dy = Math.max(0, Math.abs(y - ellipse.centerY) - modelHalf - ellipse.padY - ORBIT_MODEL_MARGIN)
    return (dx / ellipse.xRadius) ** 2 + (dy / ellipse.yRadius) ** 2 < 1
  })
}

/** Aspect-aware projected orbit. The shallow depth is compensated to preserve spacing. */
export function controlledOrbitPosition(angle: number, width: number, height: number): ModelPosition {
  const shortest = Math.max(1, Math.min(width, height))
  const viewSize = getOrbitViewSize(width, height)
  const halfWidth = width / shortest * viewSize / 2
  const halfHeight = height / shortest * viewSize / 2
  const maximumHalf = ORBIT_MODEL_SIZE * ORBIT_ACTIVE_SCALE * ORBIT_CAMERA_Z / (ORBIT_CAMERA_Z - 1.1) / 2
  // Wider screens expand the lane instead of leaving unused horizontal space.
  const minimumLane = ORBIT_MODEL_RADIUS + 2.85 * landscapeBlend(width, height)
  const xRadius = Math.min(20.5, halfWidth - maximumHalf - .12, Math.max(minimumLane, halfWidth * .82 - maximumHalf))
  const yRadius = halfHeight - maximumHalf - .12
  const z = Math.sin(angle) * .5
  const depthCompensation = 1 - z / ORBIT_CAMERA_Z
  return { x: Math.cos(angle) * xRadius * depthCompensation, y: Math.sin(angle) * yRadius * depthCompensation, z }
}

/** Retained scene-path helper, now representing the one controlled orbit. */
export function atomicOrbitPosition(_planeIndex: number, angle: number, radius = ORBIT_MODEL_RADIUS): ModelPosition {
  const position = controlledOrbitPosition(angle, 1, 1)
  const relative = radius / ORBIT_MODEL_RADIUS
  return { x: position.x * relative, y: position.y * relative, z: position.z * relative }
}

/** Shared final pose for the renderer and its accessible HTML hit target. */
export function getModelPose(index: number, time: number, offset: readonly number[], width: number, height: number, emphasis: ModelEmphasis = { active: 0, hover: 0 }, motion: ModelFreeMotion = {}): ModelPose {
  if (motion.free || (motion.held ?? 0) > 0) {
    // Only the normal orbit is confined to its lane. A held/thrown object may
    // cross the selector, and returns to this same moving anchor continuously.
    const normal = getModelPose(index, time, [0, 0, 0], width, height, emphasis)
    const held = Math.max(0, Math.min(1, motion.held ?? 0))
    const scale = normal.scale * (1 + held * .08)
    const position = {
      x: normal.position.x + (offset[0] ?? 0),
      y: normal.position.y + (offset[1] ?? 0),
      z: normal.position.z + held * .3 + clamp(offset[2] ?? 0, .8),
    }
    const perspective = ORBIT_CAMERA_Z / (ORBIT_CAMERA_Z - position.z)
    const shortest = Math.max(1, Math.min(width, height))
    const view = getOrbitViewSize(width, height)
    const modelHalf = ORBIT_MODEL_SIZE * scale * perspective / 2
    position.x = clamp(position.x * perspective, Math.max(.1, width / shortest * view / 2 - modelHalf - .025)) / perspective
    position.y = clamp(position.y * perspective, Math.max(.1, height / shortest * view / 2 - modelHalf - .025)) / perspective
    return { position, scale }
  }
  const angle = -Math.PI / 2 + index * Math.PI * 2 / ORBIT_DIVISION_COUNT - time * ORBIT_MODEL_SPEED
  const anchor = controlledOrbitPosition(angle, width, height)
  const active = Math.max(0, Math.min(1, emphasis.active))
  const hover = Math.max(0, Math.min(1, emphasis.hover))
  const emphasisScale = 1 + (ORBIT_ACTIVE_SCALE - 1) * active + .025 * hover * (1 - active)
  const position = { ...anchor, z: anchor.z + ORBIT_ACTIVE_LIFT * active + clamp(offset[2] ?? 0, .05) }
  // Active objects move closer without drifting toward the edge of the viewport.
  const compensate = (ORBIT_CAMERA_Z - position.z) / (ORBIT_CAMERA_Z - anchor.z)
  position.x = anchor.x * compensate + (offset[0] ?? 0)
  position.y = anchor.y * compensate + (offset[1] ?? 0) + Math.sin(time * .3 + index) * .008
  const depthScale = ORBIT_CAMERA_Z / (ORBIT_CAMERA_Z - position.z)
  const anchorX = position.x * depthScale
  const anchorY = position.y * depthScale
  // Compare the full model footprint against the perspective ellipse and
  // camera-facing cards. This avoids excessive padding at diagonal positions.
  const ellipses = protectedEllipses(width, height)
  const shortest = Math.max(1, Math.min(width, height))
  const viewSize = getOrbitViewSize(width, height)
  const halfWidth = width / shortest * viewSize / 2
  const halfHeight = height / shortest * viewSize / 2
  let screenX = anchorX, screenY = anchorY
  const place = (scale: number): boolean => {
    const modelHalf = ORBIT_MODEL_SIZE * scale * depthScale / 2
    let multiplier = 1
    if (crossesSelector(anchorX, anchorY, modelHalf, ellipses)) {
      let low = 1, high = 2
      while (crossesSelector(anchorX * high, anchorY * high, modelHalf, ellipses)) high *= 2
      for (let step = 0; step < 24; step++) {
        const middle = (low + high) / 2
        if (crossesSelector(anchorX * middle, anchorY * middle, modelHalf, ellipses)) low = middle
        else high = middle
      }
      multiplier = high
    }
    screenX = clamp(anchorX * multiplier, Math.max(.1, halfWidth - modelHalf - .025))
    screenY = clamp(anchorY * multiplier, Math.max(.1, halfHeight - modelHalf - .025))
    return !crossesSelector(screenX, screenY, modelHalf, ellipses)
  }
  let scale = emphasisScale
  if (!place(scale)) {
    // Preserve full-size bodies wherever space permits. At narrower parts of
    // the orbit, fit smoothly into the remaining lane instead of clamping a
    // large body back onto the selector. Rendering and hit targets share this.
    let low = emphasisScale * .1, high = emphasisScale
    for (let step = 0; step < 12; step++) {
      const middle = (low + high) / 2
      if (place(middle)) low = middle
      else high = middle
    }
    scale = low
    place(scale)
  }
  position.x = screenX / depthScale
  position.y = screenY / depthScale
  return { position, scale }
}

/** World position. All bodies use the same angular clock and equal phase spacing. */
export function floatingModelPosition(index: number, time: number, offset: readonly number[], width: number, height: number, emphasis?: ModelEmphasis): ModelPosition {
  return getModelPose(index, time, offset, width, height, emphasis).position
}

/** Center-relative screen pixels for the straight-on perspective camera. */
export function modelScreenPosition(position: ModelPosition, width: number, height: number): ModelScreenPosition {
  const depthScale = ORBIT_CAMERA_Z / (ORBIT_CAMERA_Z - position.z)
  const pixelsPerUnit = Math.max(1, Math.min(width, height)) / getOrbitViewSize(width, height) * depthScale
  return { x: position.x * pixelsPerUnit, y: -position.y * pixelsPerUnit, scale: depthScale, unitsPerPixel: 1 / pixelsPerUnit }
}

export function getModelPositions(motion: ModelProjectionSource, width: number, height: number, emphasis: number | readonly ModelEmphasis[] = -1): ModelScreenPosition[] {
  return Array.from({ length: ORBIT_DIVISION_COUNT }, (_, index) => {
    const body = motion.get(index)
    const state = typeof emphasis === 'number' ? { active: emphasis === index ? 1 : 0, hover: 0 } : emphasis[index]
    const pose = getModelPose(index, body.orbitTime ?? motion.time, body.offset, width, height, state, body)
    const projected = modelScreenPosition(pose.position, width, height)
    return { ...projected, size: ORBIT_MODEL_SIZE * pose.scale / projected.unitsPerPixel }
  })
}

export function projectSlotPosition(index: number, count: number, rotation: number, width = 1000, height = 500): ModelPosition {
  const angle = -Math.PI / 2 + index / Math.max(1, count) * Math.PI * 2 - rotation * Math.PI / 180
  const x = Math.cos(angle) * ORBIT_RING_RADIUS
  const y = Math.sin(angle) * ORBIT_RING_RADIUS
  const z = ORBIT_DEPTH / 2 + .051
  const tilt = getOrbitTilt(width, height)
  return { x, y: y * Math.cos(tilt) - z * Math.sin(tilt), z: y * Math.sin(tilt) + z * Math.cos(tilt) }
}

export function getProjectPositions(rotation: number, count: number, width: number, height: number): ProjectScreenPosition[] {
  const length = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  return Array.from({ length }, (_, index) => ({
    ...modelScreenPosition(projectSlotPosition(index, length, rotation, width, height), width, height),
    rotation: rotation - index / length * 360,
  }))
}
