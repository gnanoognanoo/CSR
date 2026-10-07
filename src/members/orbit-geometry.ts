import type { Member } from './data'

export const MEMBER_CAMERA_Z = 30
export const MEMBER_ORBIT_TILT = 16 * Math.PI / 180
export const MEMBER_BADGE_DEPTH = .36
export const MEMBER_DESKTOP_SLOTS = 12
export const MEMBER_MOBILE_SLOTS = 6

export interface MemberOrbitSlot {
  position: number
  member: Member
  logicalIndex: number
}

export interface MemberHoverState {
  position: number
  x: number
  y: number
}

export interface MemberScreenPosition {
  position: number
  x: number
  y: number
  width: number
  height: number
  scale: number
  depth: number
  opacity: number
  frontness: number
  yaw: number
  roll: number
}

export interface MemberOrbitLayout {
  viewHeight: number
  radiusX: number
  radiusY: number
  cardWidth: number
  cardHeight: number
}

export interface MemberBadgePose {
  x: number
  y: number
  z: number
  scale: number
  pitch: number
  yaw: number
  roll: number
  opacity: number
  frontness: number
  focus: number
  width: number
  height: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** The camera and hit targets share this fit, including the full extruded badge. */
export function getMemberOrbitLayout(width: number, height: number, compact = width < 760): MemberOrbitLayout {
  const aspect = Math.max(1, width) / Math.max(1, height)
  const viewHeight = compact ? 14.4 : 17.8
  const radiusFactor = compact || aspect < 2.2 ? .48 : .42
  const radiusX = Math.min(44, Math.max(3, viewHeight * aspect * radiusFactor - (compact ? 1.55 : 1.65)))
  const shortStage = height < (compact ? 290 : 330)
  const cardHeight = compact ? shortStage ? 3.05 : 3.2 : shortStage ? 3 : 3.4
  return {
    viewHeight,
    radiusX,
    radiusY: compact ? shortStage ? 4.85 : 4.7 : 7.15,
    cardWidth: cardHeight * 1.13,
    cardHeight,
  }
}

export function getMemberCameraFov(width: number, height: number, compact = width < 760): number {
  return 2 * Math.atan(getMemberOrbitLayout(width, height, compact).viewHeight / (2 * MEMBER_CAMERA_Z)) * 180 / Math.PI
}

/** Index zero begins at the lower/front focus, matching the shared inertia controller. */
export function getMemberBadgePose(
  position: number,
  rotation: number,
  count: number,
  width: number,
  height: number,
  _focusedPosition = 0,
  compact = width < 760,
  pointer = { x: 0, y: 0 },
  transition = 1,
  hover?: MemberHoverState | null,
): MemberBadgePose {
  const layout = getMemberOrbitLayout(width, height, compact)
  const angle = (rotation - position * 360 / Math.max(1, count)) * Math.PI / 180
  const frontness = (Math.cos(angle) + 1) / 2
  // Continuous emphasis avoids a size jump when the nearest physical slot changes.
  const focus = Math.pow(frontness, 18)
  const px = compact ? 0 : clamp(pointer.x, -1, 1)
  const py = compact ? 0 : clamp(pointer.y, -1, 1)
  const visible = clamp(transition, 0, 1)
  // The hex badges retain separation near the sides of the oval.
  // Ease its front/rear apex inward so the larger focus badge still fits the stage.
  const verticalInset = compact ? 0 : Math.pow(Math.cos(angle), 5) * (height < 330 ? .35 : .65)
  const verticalOutset = 1 + (compact ? .32 : .08) * Math.sin(angle) ** 2
  const hovered = !compact && hover?.position === position
  const hx = hovered ? clamp(hover.x, -1, 1) : 0
  const hy = hovered ? clamp(hover.y, -1, 1) : 0
  const scale = .84 + frontness * .16 + focus * .25 + (hovered ? .015 : 0)
  return {
    x: Math.sin(angle) * layout.radiusX + px * (.16 + frontness * .16),
    y: -Math.cos(angle) * layout.radiusY * Math.cos(MEMBER_ORBIT_TILT) * verticalOutset + verticalInset + (compact ? Math.pow(1 - frontness, 8) * .42 : .75 - focus * .07) + py * .025,
    z: Math.cos(angle) * layout.radiusY * Math.sin(MEMBER_ORBIT_TILT) + focus * .65 + (hovered ? .2 : 0) - (1 - visible) * 1.4,
    scale,
    pitch: -hy * .055,
    yaw: Math.sin(angle) * .18 + px * .035 + hx * .055,
    roll: Math.sin(angle) * -.035 + py * .015,
    opacity: (.76 + frontness * .08 + focus * .16) * visible,
    frontness,
    focus,
    width: layout.cardWidth,
    height: layout.cardHeight,
  }
}

/** Match the badge Euler transform before perspective-projecting its footprint. */
export function projectMemberBadgePoint(pose: MemberBadgePose, point: readonly number[], width: number, height: number, compact = width < 760) {
  const [x, y, z] = point.map(value => value * pose.scale)
  const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw)
  const cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch)
  const cr = Math.cos(pose.roll), sr = Math.sin(pose.roll)
  const worldX = pose.x + cy * cr * x - cy * sr * y + sy * z
  const turnedY = sr * x + cr * y
  const turnedZ = -sy * cr * x + sy * sr * y + cy * z
  const worldY = pose.y + cp * turnedY - sp * turnedZ
  const worldZ = pose.z + sp * turnedY + cp * turnedZ
  const perspective = MEMBER_CAMERA_Z / (MEMBER_CAMERA_Z - worldZ)
  const pixels = height / getMemberOrbitLayout(width, height, compact).viewHeight
  return { x: width / 2 + worldX * perspective * pixels, y: height / 2 - worldY * perspective * pixels }
}

export function projectMemberSlots(
  rotation: number,
  count: number,
  width: number,
  height: number,
  focusedPosition = 0,
  compact = width < 760,
  pointer = { x: 0, y: 0 },
  transition = 1,
  hover?: MemberHoverState | null,
): MemberScreenPosition[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, position) => {
    const pose = getMemberBadgePose(position, rotation, count, width, height, focusedPosition, compact, pointer, transition, hover)
    const center = projectMemberBadgePoint(pose, [0, 0, 0], width, height, compact)
    const corners = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => projectMemberBadgePoint(pose,
      [x * (pose.width / 2 + .045), y * (pose.height / 2 + .045), z * (MEMBER_BADGE_DEPTH / 2 + .045)], width, height, compact))))
    return {
      position,
      x: center.x,
      y: center.y,
      width: 2 * Math.max(...corners.map(point => Math.abs(point.x - center.x))),
      height: 2 * Math.max(...corners.map(point => Math.abs(point.y - center.y))),
      scale: pose.scale,
      depth: pose.z,
      opacity: pose.opacity,
      frontness: pose.frontness,
      yaw: pose.yaw,
      roll: pose.roll,
    }
  })
}
