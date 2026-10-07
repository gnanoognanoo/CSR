import type { HubLayout } from '../projects/hub-geometry'
import { getMemberOrbitLayout, MEMBER_CAMERA_Z } from './orbit-geometry'

function viewport(width: number, height: number) {
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1,
    height: Number.isFinite(height) && height > 0 ? height : 1,
  }
}

/** Adapt the height-based member camera to the shared hub's shorter-axis fit. */
export function getMemberHubViewSize(width: number, height: number, compact = width < 760): number {
  const safe = viewport(width, height)
  const { viewHeight } = getMemberOrbitLayout(safe.width, safe.height, compact)
  return viewHeight * Math.min(safe.width, safe.height) / safe.height
}

/** Use the core's depth so its world lift matches the moving HTML control. */
export function getMemberHubUnitsPerPixel(width: number, height: number, compact = width < 760, z = 0): number {
  const safe = viewport(width, height)
  const { viewHeight } = getMemberOrbitLayout(safe.width, safe.height, compact)
  const depth = Number.isFinite(z) ? Math.min(MEMBER_CAMERA_Z - .1, z) : 0
  return viewHeight / safe.height * (1 - depth / MEMBER_CAMERA_Z)
}

/** A round physical core sized to the existing member orbit's reserved hub. */
export function getMemberHubLayout(width: number, height: number, compact = width < 760): HubLayout {
  const safe = viewport(width, height)
  const { viewHeight } = getMemberOrbitLayout(safe.width, safe.height, compact)
  const diameterPx = Math.min(compact ? 88 : 128, safe.height * (compact ? .3 : 128 / 358))
  const pitch = -.18, yaw = .22

  // Preserve the shared medallion's relative thickness and bevel. Solve its
  // perspective footprint directly, avoiding a diameter that varies by depth.
  const depthRatio = .8 / 2.2, bevelRatio = .09 / 2.2, zRatio = .70 / 2.2
  const radialRatio = 1 + bevelRatio
  const axialRatio = depthRatio / 2 + bevelRatio
  const depthSlope = Math.hypot(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch))
  const nearestRatio = zRatio + radialRatio * depthSlope + axialRatio * Math.abs(Math.cos(pitch) * Math.cos(yaw))
  const pixelsPerUnit = safe.height / viewHeight
  const radius = diameterPx * MEMBER_CAMERA_Z
    / (2 * Math.hypot(radialRatio, axialRatio) * MEMBER_CAMERA_Z * pixelsPerUnit + diameterPx * nearestRatio)

  return {
    radius,
    depth: radius * depthRatio,
    bevel: radius * bevelRatio,
    pitch, yaw,
    z: radius * zRatio,
    diameterPx,
  }
}
