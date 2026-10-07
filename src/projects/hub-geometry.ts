import { getOrbitViewSize, ORBIT_CAMERA_Z } from './orbit-geometry'
import type { HubPulsePose } from './hub-motion'

/** Keep the lift small when the available scene is shorter than desktop. */
export function getHubScreenPulse(pose: HubPulsePose, height: number): HubPulsePose {
  const liftScale = Number.isFinite(height) ? Math.max(0, Math.min(1, height / 462)) : 0
  return { liftPx: pose.liftPx * liftScale, rotationY: pose.rotationY }
}

export type HubLayout = {
  radius: number
  depth: number
  bevel: number
  pitch: number
  yaw: number
  z: number
  diameterPx: number
}

/** Stable, camera-facing core, sized to the selector's responsive opening. */
export function getHubLayout(width: number, height: number): HubLayout {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1
  const viewSize = getOrbitViewSize(safeWidth, safeHeight)
  const landscape = Math.max(0, Math.min(1, (safeWidth / safeHeight - 1.15) / .6))
  const previousViewSize = 28.5 + (20.2 - 28.5) * landscape
  const baseRadius = 3.4 - 1.2 * landscape
  const pitch = -.18, yaw = .22
  const depthSlope = Math.hypot(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch))
  const baseNearestZ = .70 + (baseRadius + .09) * depthSlope + .49 * Math.abs(Math.cos(pitch) * Math.cos(yaw))
  // The wider selector camera should leave the established core's screen
  // footprint intact. Compensate its complete physical silhouette uniformly.
  const cameraScale = viewSize * ORBIT_CAMERA_Z / (previousViewSize * ORBIT_CAMERA_Z + (viewSize - previousViewSize) * baseNearestZ)
  const radius = baseRadius * cameraScale
  const depth = .8 * cameraScale, bevel = .09 * cameraScale, z = .70 * cameraScale

  // The extruded disc is centered in depth before the shallow XYZ rotation.
  // Bound the complete beveled silhouette, including its closest camera edge,
  // so the circular HTML control contains the physical object after projection.
  const radialExtent = radius + bevel
  const axialExtent = depth / 2 + bevel
  const nearestZ = z + radialExtent * depthSlope + axialExtent * Math.abs(Math.cos(pitch) * Math.cos(yaw))
  const perspective = ORBIT_CAMERA_Z / Math.max(1, ORBIT_CAMERA_Z - nearestZ)
  const pixelsPerUnit = Math.min(safeWidth, safeHeight) / viewSize
  const diameterPx = 2 * Math.hypot(radialExtent, axialExtent) * perspective * pixelsPerUnit

  return { radius, depth, bevel, pitch, yaw, z, diameterPx }
}
