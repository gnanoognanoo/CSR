/** Finished display dimensions include the graphite enclosure and blue trim. */
export const PROJECT_PREVIEW_ACTIVE_SCALE = 1.12
export const PROJECT_PREVIEW_FRONT_LIFT = .12

export function getProjectPreviewLayout(width: number, height: number) {
  const sideRail = .17
  const topBar = .22
  const bottomBar = .40
  return {
    width, height,
    imageWidth: width - sideRail * 2,
    imageHeight: height - topBar - bottomBar,
    imageY: (bottomBar - topBar) / 2,
    footerY: -height / 2 + bottomBar / 2,
    sideRail, topBar, bottomBar,
    bevel: .028,
    depth: .21,
  }
}

/** Crop UVs rather than stretch a photograph into the module's aperture. */
export function getProjectPreviewCrop(imageWidth: number, imageHeight: number, apertureWidth: number, apertureHeight: number) {
  const imageAspect = Math.max(1, imageWidth) / Math.max(1, imageHeight)
  const apertureAspect = apertureWidth / apertureHeight
  const repeatX = Math.min(1, apertureAspect / imageAspect)
  const repeatY = Math.min(1, imageAspect / apertureAspect)
  return { repeatX, repeatY, offsetX: (1 - repeatX) / 2, offsetY: (1 - repeatY) / 2 }
}
