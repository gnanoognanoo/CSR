import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Billboard, Environment, Lightformer, useTexture } from '@react-three/drei'
import { BufferGeometry, CanvasTexture, ExtrudeGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Path, Shape, ShapeGeometry, SRGBColorSpace, PCFSoftShadowMap, type PerspectiveCamera } from 'three'
import DivisionModels, { type DivisionModelsProps } from './DivisionModels'
import ProjectHub from './ProjectHub'
import { getModelPositions, getProjectPositions, getOrbitCameraFov, getOrbitTilt, getOrbitPreviewHeight, ORBIT_CAMERA_FOV, ORBIT_CAMERA_Z, ORBIT_DEPTH, ORBIT_INNER_RADIUS, ORBIT_OUTER_RADIUS, ORBIT_PREVIEW_WIDTH, ORBIT_RING_RADIUS, type ModelEmphasis } from './orbit-geometry'
import { projectDivisions, type Project } from './data'
import { getProjectSlots, PROJECT_SLOT_COUNT, type ProjectSlot } from './project-slots'
import { getProjectPreviewCrop, getProjectPreviewLayout, PROJECT_PREVIEW_ACTIVE_SCALE, PROJECT_PREVIEW_FRONT_LIFT } from './project-preview'
import type { HubMotionController } from './hub-motion'

type OrbitSceneProps = DivisionModelsProps & { hubMotion: HubMotionController }

function CameraPerspective() {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    const perspective = camera as PerspectiveCamera
    perspective.fov = getOrbitCameraFov(size.width, size.height)
    perspective.aspect = size.width / Math.max(1, size.height)
    perspective.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

function MotionFrame({ modelMotion, modelEmphasis, modelHoverIndex, selectedDivision, projectPhysics, hubMotion, reducedMotion, onFrame, onReady, onFailure }: OrbitSceneProps) {
  const { gl } = useThree()
  useEffect(() => {
    onReady?.()
    const lost = (event: Event) => { event.preventDefault(); onFailure?.() }
    const restored = () => onReady?.()
    const canvas = gl.domElement
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    return () => {
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
    }
  }, [gl, onReady, onFailure])
  useFrame(({ size }, delta) => {
    projectPhysics.tick(delta)
    modelMotion.tick(delta, reducedMotion)
    hubMotion.tick(document.hidden ? 0 : delta, reducedMotion)
    modelEmphasis?.forEach((state, index) => {
      const blend = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, .1) * 8)
      state.active += ((index === selectedDivision ? 1 : 0) - state.active) * blend
      state.hover += ((index === modelHoverIndex || modelMotion.get(index).dragging ? 1 : 0) - state.hover) * blend
    })
    onFrame?.(projectPhysics.rotation, size.width, size.height, getModelPositions(modelMotion, size.width, size.height, modelEmphasis ?? selectedDivision), getProjectPositions(projectPhysics.rotation, PROJECT_SLOT_COUNT, size.width, size.height))
  }, -1)
  return null
}

function createSector(count: number) {
  const step = Math.PI * 2 / Math.max(1, count)
  const gap = count > 1 ? .032 : .003
  const from = -Math.PI / 2 - step / 2 + gap / 2
  const to = -Math.PI / 2 + step / 2 - gap / 2
  const shape = new Shape()
  shape.moveTo(Math.cos(from) * ORBIT_OUTER_RADIUS, Math.sin(from) * ORBIT_OUTER_RADIUS)
  shape.absarc(0, 0, ORBIT_OUTER_RADIUS, from, to, false)
  shape.lineTo(Math.cos(to) * ORBIT_INNER_RADIUS, Math.sin(to) * ORBIT_INNER_RADIUS)
  shape.absarc(0, 0, ORBIT_INNER_RADIUS, to, from, true)
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, {
    depth: ORBIT_DEPTH, steps: 1, curveSegments: 80,
    bevelEnabled: true, bevelSize: .019, bevelThickness: .02, bevelSegments: 3,
  })
  geometry.translate(0, 0, -ORBIT_DEPTH / 2)
  const points: number[] = []
  const add = (a: number, b: number, radius: number) => points.push(Math.cos(a) * radius, Math.sin(a) * radius, ORBIT_DEPTH / 2 + .022, Math.cos(b) * radius, Math.sin(b) * radius, ORBIT_DEPTH / 2 + .022)
  const divisions = 96
  for (let index = 0; index < divisions; index++) {
    const start = from + (to - from) * index / divisions
    const end = from + (to - from) * (index + 1) / divisions
    add(start, end, ORBIT_OUTER_RADIUS - .025)
    add(start, end, ORBIT_INNER_RADIUS + .025)
  }
  for (const angle of [from, to]) points.push(Math.cos(angle) * ORBIT_INNER_RADIUS, Math.sin(angle) * ORBIT_INNER_RADIUS, ORBIT_DEPTH / 2 + .022, Math.cos(angle) * ORBIT_OUTER_RADIUS, Math.sin(angle) * ORBIT_OUTER_RADIUS, ORBIT_DEPTH / 2 + .022)
  const outline = new BufferGeometry()
  outline.setAttribute('position', new Float32BufferAttribute(points, 3))
  return { geometry, outline }
}

/** Straight structural rails with small machined corner cuts. */
function showcaseShape(width: number, height: number, cut = .14) {
  const x = width / 2, y = height / 2
  const shape = new Shape()
  shape.moveTo(-x + cut, -y)
  shape.lineTo(x - cut, -y)
  shape.lineTo(x, -y + cut)
  shape.lineTo(x, y - cut)
  shape.lineTo(x - cut, y)
  shape.lineTo(-x + cut, y)
  shape.lineTo(-x, y - cut)
  shape.lineTo(-x, -y + cut)
  shape.closePath()
  return shape
}

function PreviewTexture({ src, width, height, reducedMotion, selected }: { src: string; width: number; height: number; reducedMotion: boolean; selected: boolean }) {
  const texture = useTexture(src)
  useLayoutEffect(() => { texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4; texture.needsUpdate = true }, [texture])
  // Center-crop UVs preserve photographic proportions; the dossier shows the full image.
  const geometry = useMemo(() => {
    const result = new ShapeGeometry(showcaseShape(width, height, .018), 1)
    const image = texture.image as { width: number; height: number }
    const { repeatX, repeatY, offsetX, offsetY } = getProjectPreviewCrop(image.width, image.height, width, height)
    const positions = result.getAttribute('position')
    const uv = result.getAttribute('uv')
    for (let index = 0; index < uv.count; index++) uv.setXY(index,
      offsetX + (positions.getX(index) / width + .5) * repeatX,
      offsetY + (positions.getY(index) / height + .5) * repeatY)
    return result
  }, [texture, width, height])
  const geometries = useRef(new Set<ShapeGeometry>())
  geometries.current.add(geometry)
  const previousFace = useRef<Mesh>(null), currentFace = useRef<Mesh>(null)
  const previousMaterial = useRef<MeshBasicMaterial>(null), currentMaterial = useRef<MeshBasicMaterial>(null)
  useLayoutEffect(() => {
    const previous = previousMaterial.current, current = currentMaterial.current
    return () => {
      geometries.current.forEach(item => item.dispose())
      previous?.dispose()
      current?.dispose()
    }
  }, [])
  const transition = useRef({ from: { texture, geometry }, to: { texture, geometry }, progress: 1 })
  useLayoutEffect(() => {
    const state = transition.current
    if (state.to.texture !== texture || state.to.geometry !== geometry) {
      state.from = state.to
      state.to = { texture, geometry }
      state.progress = reducedMotion ? 1 : 0
    }
    geometries.current.forEach(item => {
      if (item !== state.from.geometry && item !== state.to.geometry) { item.dispose(); geometries.current.delete(item) }
    })
    if (previousFace.current) previousFace.current.geometry = state.from.geometry
    if (currentFace.current) currentFace.current.geometry = geometry
    if (previousMaterial.current) {
      previousMaterial.current.map = state.from.texture
      previousMaterial.current.opacity = 1 - state.progress
      previousMaterial.current.needsUpdate = true
    }
    if (currentMaterial.current) {
      currentMaterial.current.map = texture
      currentMaterial.current.opacity = state.progress
      currentMaterial.current.needsUpdate = true
    }
  }, [texture, geometry, reducedMotion])
  useFrame((_, delta) => {
    const state = transition.current
    state.progress = reducedMotion ? 1 : Math.min(1, state.progress + Math.min(delta, .05) / .24)
    const blend = state.progress * state.progress * (3 - 2 * state.progress)
    if (previousMaterial.current) previousMaterial.current.opacity = 1 - blend
    if (currentMaterial.current) currentMaterial.current.opacity = blend
    if (state.progress === 1 && state.from.geometry !== state.to.geometry) {
      state.from.geometry.dispose()
      geometries.current.delete(state.from.geometry)
      state.from = state.to
      if (previousFace.current) previousFace.current.geometry = state.to.geometry
      if (previousMaterial.current) previousMaterial.current.map = state.to.texture
    }
  })
  return <>
    <mesh ref={previousFace} geometry={geometry} renderOrder={23} dispose={null}>
      <meshBasicMaterial ref={previousMaterial} map={texture} color={selected ? '#ffffff' : '#e5ebef'} transparent opacity={0} toneMapped={false} depthTest={false} depthWrite={false} />
    </mesh>
    <mesh ref={currentFace} geometry={geometry} position={[0, 0, .002]} renderOrder={24} dispose={null}>
      <meshBasicMaterial ref={currentMaterial} map={texture} color={selected ? '#ffffff' : '#e5ebef'} transparent toneMapped={false} depthTest={false} depthWrite={false} />
    </mesh>
  </>
}

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

function ComingSoonPlate({ index, selected, width, height }: { index: number; selected: boolean; width: number; height: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 384
    const context = canvas.getContext('2d')
    if (context) {
      context.fillStyle = '#F6F5F2'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.strokeStyle = '#BCC5CB'
      context.lineWidth = 2
      context.strokeRect(18, 18, 604, 348)
      context.fillStyle = '#657686'
      context.font = '32px monospace'
      context.fillText(String(index + 1).padStart(2, '0'), 43, 64)
      context.strokeStyle = '#146EB4'
      context.lineWidth = 3
      context.beginPath()
      context.moveTo(280, 125)
      context.lineTo(260, 145)
      context.lineTo(280, 165)
      context.moveTo(360, 125)
      context.lineTo(380, 145)
      context.lineTo(360, 165)
      context.moveTo(331, 122)
      context.lineTo(309, 168)
      context.stroke()
      context.textAlign = 'center'
      context.fillStyle = '#101820'
      context.font = '34px monospace'
      context.fillText('COMING SOON', 320, 236)
      context.fillStyle = '#146EB4'
      context.fillRect(265, 278, 110, 2)
    }
    const result = new CanvasTexture(canvas)
    result.colorSpace = SRGBColorSpace
    result.anisotropy = 4
    return result
  }, [index])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh renderOrder={23}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={texture} color={selected ? '#ffffff' : '#f3f1ec'} transparent toneMapped={false} depthTest={false} depthWrite={false} />
  </mesh>
}

function polygonShape(points: readonly (readonly [number, number])[]) {
  const shape = new Shape()
  points.forEach(([x, y], index) => { if (index) shape.lineTo(x, y); else shape.moveTo(x, y) })
  shape.closePath()
  return shape
}

/** A physical dark display screen, with machined rails and restrained blue trim. */
function PreviewModule({ slot, selected, height, reducedMotion }: { slot: ProjectSlot; selected: boolean; height: number; reducedMotion: boolean }) {
  const layout = getProjectPreviewLayout(ORBIT_PREVIEW_WIDTH, height)
  const module = useRef<Group>(null)
  const initialActive = useRef(selected)
  const body = useMemo(() => {
    const shell = showcaseShape(layout.width - layout.bevel * 2, layout.height - layout.bevel * 2, .10)
    const x = (layout.imageWidth + .015) / 2, y = layout.imageHeight / 2
    const opening = new Path()
    opening.moveTo(-x, layout.imageY - y)
    opening.lineTo(-x, layout.imageY + y)
    opening.lineTo(x, layout.imageY + y)
    opening.lineTo(x, layout.imageY - y)
    opening.closePath()
    shell.holes.push(opening)
    const geometry = new ExtrudeGeometry(shell, {
      depth: layout.depth, steps: 1, curveSegments: 1,
      bevelEnabled: true, bevelSize: layout.bevel, bevelThickness: layout.bevel, bevelSegments: 3,
    })
    geometry.translate(0, 0, -layout.depth / 2)
    return geometry
  }, [layout.width, layout.height, layout.imageWidth, layout.imageHeight, layout.imageY, layout.bevel, layout.depth])
  const rim = useMemo(() => {
    const shell = showcaseShape(layout.imageWidth + .055, layout.imageHeight + .055, .025)
    shell.holes.push(showcaseShape(layout.imageWidth, layout.imageHeight, .018))
    return new ShapeGeometry(shell)
  }, [layout.imageWidth, layout.imageHeight])
  const trim = useMemo(() => {
    const x = layout.width / 2, y = layout.height / 2
    const shapes: Shape[] = []
    // The two interrupted top strips, beveled ends and narrow side rails
    // reproduce the reference's blue hardware rather than a glowing outline.
    for (const sign of [-1, 1]) {
      shapes.push(polygonShape([
        [sign * (x - .035), y - .035], [sign * (x - 1.78), y - .035],
        [sign * (x - 1.89), y - .11], [sign * (x - .105), y - .11],
        [sign * (x - .105), y - .77], [sign * (x - .035), y - .68],
      ]))
      shapes.push(polygonShape([
        [sign * (x - .09), -y + .25], [sign * (x - .09), -y + .80],
        [sign * (x - .035), -y + .88], [sign * (x - .035), -y + .25],
      ]))
    }
    shapes.push(polygonShape([
      [-x + .095, -y + .34], [x - .095, -y + .34], [x - .15, -y + .26],
      [x * .22, -y + .26], [x * .20, -y + .29], [-x * .20, -y + .29],
      [-x * .22, -y + .26], [-x + .15, -y + .26],
    ]))
    return new ShapeGeometry(shapes, 1)
  }, [layout.width, layout.height])
  const facets = useMemo(() => {
    const top = showcaseShape(layout.width - .30, layout.topBar * .50, .025)
    const bottom = showcaseShape(layout.width - .26, layout.bottomBar * .50, .045)
    const topGeometry = new ShapeGeometry(top, 1)
    const bottomGeometry = new ShapeGeometry(bottom, 1)
    topGeometry.translate(0, layout.height / 2 - layout.topBar / 2 - .015, 0)
    bottomGeometry.translate(0, layout.footerY - .045, 0)
    return { top: topGeometry, bottom: bottomGeometry }
  }, [layout.width, layout.height, layout.topBar, layout.bottomBar, layout.footerY])
  const highlights = useMemo(() => {
    const points: number[] = []
    const x = layout.width / 2 - .17, y = layout.height / 2 - .14
    points.push(-x, y, 0, x, y, 0, -x, -layout.height / 2 + .07, 0, x, -layout.height / 2 + .07, 0)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
    return geometry
  }, [layout.width, layout.height])
  useEffect(() => () => {
    body.dispose(); rim.dispose(); trim.dispose(); highlights.dispose(); facets.top.dispose(); facets.bottom.dispose()
  }, [body, rim, trim, highlights, facets])
  const shadow = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = Math.round(256 * (height + .4) / (ORBIT_PREVIEW_WIDTH + .4))
    const context = canvas.getContext('2d')!
    context.shadowColor = 'rgba(7,20,30,.48)'
    context.shadowBlur = 18
    context.shadowOffsetY = 7
    context.fillStyle = 'rgba(7,20,30,.27)'
    context.fillRect(18, 18, canvas.width - 36, canvas.height - 36)
    return new CanvasTexture(canvas)
  }, [height])
  useEffect(() => () => shadow.dispose(), [shadow])
  const number = (slot.projectIndex ?? slot.index) + 1
  const interfacePrint = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 64
    const context = canvas.getContext('2d')!
    const ink = selected ? '#68C6F2' : '#1689CC'
    context.strokeStyle = ink; context.fillStyle = ink; context.lineWidth = 2
    context.beginPath(); context.arc(36, 32, 19, 0, Math.PI * 2); context.stroke()
    context.textAlign = 'center'; context.textBaseline = 'middle'
    context.font = '500 22px "IBM Plex Mono", monospace'
    context.fillText(String(number).padStart(2, '0'), 36, 32)
    // A single recessed status strip and a tiny service icon stay subordinate
    // to the photograph, just like the two details on the supplied reference.
    context.globalAlpha = .5
    context.fillRect(99, 30, 84, 2); context.fillRect(189, 30, 20, 2)
    context.globalAlpha = 1
    context.beginPath(); context.arc(976, 24, 7, 0, Math.PI * 2); context.stroke()
    context.beginPath(); context.moveTo(961, 47); context.lineTo(963, 39)
    context.quadraticCurveTo(976, 29, 989, 39); context.lineTo(991, 47); context.closePath(); context.stroke()
    context.fillRect(1000, 20, 3, 3); context.fillRect(1007, 27, 3, 3)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [number, selected])
  useEffect(() => () => interfacePrint.dispose(), [interfacePrint])
  useFrame((_, delta) => {
    if (!module.current) return
    const blend = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, .1) * 9)
    const scale = selected ? PROJECT_PREVIEW_ACTIVE_SCALE : 1
    module.current.scale.setScalar(module.current.scale.x + (scale - module.current.scale.x) * blend)
    module.current.position.z += ((selected ? PROJECT_PREVIEW_FRONT_LIFT : 0) - module.current.position.z) * blend
  })
  const surfaceZ = layout.depth / 2 + layout.bevel
  return <group ref={module} name="framed-project-module" scale={initialActive.current ? PROJECT_PREVIEW_ACTIVE_SCALE : 1} position={[0, 0, initialActive.current ? PROJECT_PREVIEW_FRONT_LIFT : 0]}>
    <mesh position={[.025, -.06, -.16]} renderOrder={19}>
      <planeGeometry args={[layout.width + .4, layout.height + .4]} />
      <meshBasicMaterial map={shadow} transparent opacity={selected ? .82 : .50} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh geometry={body} renderOrder={20} dispose={null}>
      <meshStandardMaterial attach="material-0" color="#121417" metalness={.24} roughness={.4} transparent depthTest={false} depthWrite={false} />
      <meshStandardMaterial attach="material-1" color="#26333D" metalness={.55} roughness={.28} transparent depthTest={false} depthWrite={false} />
    </mesh>
    <mesh geometry={facets.top} position={[0, 0, surfaceZ + .001]} renderOrder={21} dispose={null}>
      <meshStandardMaterial color="#1D2328" metalness={.3} roughness={.36} transparent depthTest={false} depthWrite={false} />
    </mesh>
    <mesh geometry={facets.bottom} position={[0, 0, surfaceZ + .001]} renderOrder={21} dispose={null}>
      <meshStandardMaterial color="#1D2328" metalness={.3} roughness={.36} transparent depthTest={false} depthWrite={false} />
    </mesh>
    <lineSegments geometry={highlights} position={[0, 0, surfaceZ + .005]} renderOrder={22}>
      <lineBasicMaterial color="#8FA3B8" transparent opacity={selected ? .40 : .26} depthTest={false} depthWrite={false} />
    </lineSegments>
    <mesh geometry={rim} position={[0, layout.imageY, surfaceZ + .002]} renderOrder={22} dispose={null}>
      <meshStandardMaterial color="#93A0AA" metalness={.62} roughness={.25} transparent depthTest={false} depthWrite={false} />
    </mesh>
    <group position={[0, layout.imageY, surfaceZ + .006]}>
      <PreviewBoundary>
        {slot.project?.images[0]?.src ? <Suspense fallback={null}><PreviewTexture src={slot.project.images[0].src} width={layout.imageWidth} height={layout.imageHeight} reducedMotion={reducedMotion} selected={selected} /></Suspense>
          : <ComingSoonPlate index={slot.index} selected={selected} width={layout.imageWidth} height={layout.imageHeight} />}
      </PreviewBoundary>
    </group>
    <mesh geometry={trim} position={[0, 0, surfaceZ + .009]} renderOrder={25} dispose={null}>
      <meshBasicMaterial color={selected ? '#1D9FE8' : '#1689CC'} transparent toneMapped={false} depthTest={false} depthWrite={false} />
    </mesh>
    <mesh position={[0, layout.footerY - .035, surfaceZ + .01]} renderOrder={26}>
      <planeGeometry args={[layout.width - .35, .24]} />
      <meshBasicMaterial map={interfacePrint} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>
}

function ProjectSector({ slot, selected, geometry, outline, reducedMotion, onProjectClick, onPlaceholderClick }: {
  slot: ProjectSlot; selected: boolean; geometry: ExtrudeGeometry; outline: BufferGeometry; reducedMotion: boolean; onProjectClick?: (project: Project) => void; onPlaceholderClick?: (index: number) => void
}) {
  const { size } = useThree()
  const previewHeight = getOrbitPreviewHeight(size.width, size.height)
  const { project, index } = slot
  const open = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (project) onProjectClick?.(project)
    else onPlaceholderClick?.(index)
  }
  return <group rotation={[0, 0, index / PROJECT_SLOT_COUNT * Math.PI * 2]} name={`project-slot-${slot.id}`} onClick={open}>
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial attach="material-0" color={selected ? (project ? '#E8F2FA' : '#ECEAE5') : (project ? '#FFFFFF' : '#F3F1EC')} metalness={.16} roughness={project ? .42 : .55} />
      <meshStandardMaterial attach="material-1" color={selected ? '#7796AA' : (project ? '#B7B8B3' : '#C5C2BB')} metalness={.46} roughness={.35} />
    </mesh>
    <lineSegments geometry={outline}>
      <lineBasicMaterial color={selected ? '#146EB4' : '#91A0AA'} transparent opacity={selected ? .76 : (project ? .42 : .28)} />
    </lineSegments>
    <Billboard position={[0, -ORBIT_RING_RADIUS, ORBIT_DEPTH / 2 + .051]}>
      <PreviewModule slot={slot} selected={selected} height={previewHeight} reducedMotion={reducedMotion} />
    </Billboard>
  </group>
}

function ProjectRing({ projectPhysics, projects = [], projectSlots, selectedDivision, selectedProject = 0, reducedMotion, onProjectClick, onPlaceholderClick }: DivisionModelsProps) {
  const { size } = useThree()
  const rotation = useRef<Group>(null)
  const slots = projectSlots ?? getProjectSlots(projects, projectDivisions[selectedDivision].id)
  useEffect(() => { projects.forEach(project => { if (project.images[0]?.src) useTexture.preload(project.images[0].src) }) }, [projects])
  const { geometry, outline } = useMemo(() => createSector(PROJECT_SLOT_COUNT), [])
  const bearing = useMemo(() => {
    const shape = new Shape()
    shape.absarc(0, 0, ORBIT_OUTER_RADIUS - .02, 0, Math.PI * 2, false)
    const aperture = new Path()
    aperture.absarc(0, 0, ORBIT_INNER_RADIUS + .02, 0, Math.PI * 2, true)
    shape.holes.push(aperture)
    const result = new ExtrudeGeometry(shape, { depth: .05, bevelEnabled: false, curveSegments: 96 })
    result.translate(0, 0, -ORBIT_DEPTH / 2 - .055)
    return result
  }, [])
  useEffect(() => () => { geometry.dispose(); outline.dispose() }, [geometry, outline])
  useEffect(() => () => bearing.dispose(), [bearing])
  useFrame(() => { if (rotation.current) rotation.current.rotation.z = -projectPhysics.rotation * Math.PI / 180 })
  return <group rotation={[getOrbitTilt(size.width, size.height), 0, 0]} name="mechanical-project-selector">
    <mesh geometry={bearing} receiveShadow><meshStandardMaterial color="#C4C0B8" metalness={.42} roughness={.4} /></mesh>
    <group ref={rotation}>
      {slots.map(slot => <ProjectSector key={slot.id} slot={slot} selected={selectedProject === slot.index} geometry={geometry} outline={outline} reducedMotion={reducedMotion} onProjectClick={onProjectClick} onPlaceholderClick={onPlaceholderClick} />)}
    </group>
  </group>
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure?: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure?.() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function OrbitScene(props: OrbitSceneProps) {
  const emphasis = useRef<ModelEmphasis[]>(Array.from({ length: 7 }, (_, index) => ({ active: index === props.selectedDivision ? 1 : 0, hover: 0 })))
  const sceneProps = { ...props, modelEmphasis: emphasis.current }
  return <div className="project-orbit-scene" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
    <SceneBoundary onFailure={props.onFailure}>
      <Canvas camera={{ position: [0, 0, ORBIT_CAMERA_Z], fov: ORBIT_CAMERA_FOV, near: .1, far: 50 }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'auto' }}
        resize={{ scroll: false, debounce: 0 }} shadows={props.compact ? false : { type: PCFSoftShadowMap }}
        dpr={props.compact ? 1 : [1, 1.5]} frameloop="always"
        gl={{ alpha: true, antialias: !props.compact, powerPreference: 'low-power' }} fallback={null}>
        <CameraPerspective />
        <MotionFrame {...sceneProps} />
        <ambientLight intensity={.28} />
        <hemisphereLight args={['#FFFEFC', '#9C958A', .4]} />
        <directionalLight position={[-5, 7, 9]} intensity={2.2} color="#FFFDF8" castShadow={!props.compact} shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-bias={-.0004} shadow-radius={3} />
        <directionalLight position={[5, -3, 3]} intensity={.65} color="#F1F2EF" />
        <directionalLight position={[3, 5, -3]} intensity={1.5} color="#E8F2FA" />
        <directionalLight position={[-6, -2, -4]} intensity={.6} color="#E4E0D8" />
        <Environment resolution={props.compact ? 64 : 128} frames={1} environmentIntensity={.5}>
          <Lightformer form="rect" position={[-4, 5, 6]} scale={[5, 6, 1]} target={[0, 0, 0]} intensity={3} color="#ffffff" />
          <Lightformer form="rect" position={[6, 1, 4]} scale={[4, 7, 1]} target={[0, 0, 0]} intensity={2} color="#F4F3EE" />
          <Lightformer form="rect" position={[-4, -1, -6]} scale={[3, 5, 1]} target={[0, 0, 0]} intensity={.8} color="#E8F2FA" />
        </Environment>
        <ProjectRing {...props} />
        <Suspense fallback={null}><ProjectHub motion={props.hubMotion} /></Suspense>
        <DivisionModels {...sceneProps} />
      </Canvas>
    </SceneBoundary>
  </div>
}
