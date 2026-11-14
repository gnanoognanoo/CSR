import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { CanvasTexture, Color, Group, LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, type PerspectiveCamera } from 'three'
import type { OrbitPhysicsController } from '../projects/useOrbitPhysics'
import type { HubMotionController } from '../projects/hub-motion'
import ProjectHub from '../projects/ProjectHub'
import { getMemberHubLayout, getMemberHubViewSize, getMemberHubUnitsPerPixel } from './hub-geometry'
import type { Member } from './data'
import { createMemberBadgeGeometry, type MemberBadgeGeometry } from './badge-geometry'
import { getDivisionAccent, type DivisionAccent } from './division-accent'
import {
  getMemberBadgePose, getMemberCameraFov, getMemberOrbitLayout, projectMemberSlots,
  MEMBER_BADGE_DEPTH, MEMBER_CAMERA_Z, type MemberHoverState, type MemberOrbitSlot, type MemberScreenPosition,
} from './orbit-geometry'

export type { MemberHoverState, MemberOrbitSlot, MemberScreenPosition } from './orbit-geometry'

export interface MemberOrbitSceneProps {
  slots: readonly MemberOrbitSlot[]
  physics: OrbitPhysicsController
  hubMotion: HubMotionController
  hubHover: MutableRefObject<{ liftPx: number }>
  focusedPosition: number
  compact: boolean
  reducedMotion: boolean
  pointer: { x: number; y: number }
  hover?: MemberHoverState | null
  /** 0 hides the outgoing roster; 1 brings the new roster into the orbit. */
  transition: number
  onMemberClick: (member: Member) => void
  onFrame: (rotation: number, width: number, height: number, positions: MemberScreenPosition[]) => void
  onReady?: () => void
  onFailure?: () => void
}

/** Surface graphics only: member identity is sharp, accessible live DOM text. */
function withAlpha(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1), 16)
  return `rgba(${value >> 16 & 255},${value >> 8 & 255},${value & 255},${alpha})`
}

function hexPath(context: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  context.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i
    const x = cx + radius * Math.cos(angle), y = cy + radius * Math.sin(angle) * .875
    if (i === 0) context.moveTo(x, y); else context.lineTo(x, y)
  }
  context.closePath()
}

function badgeTexture(ordinal: number, focused: boolean, accent: DivisionAccent): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 904; canvas.height = 800
  const context = canvas.getContext('2d')!
  const printScale = canvas.width / 1024
  context.scale(printScale, printScale)
  const H = canvas.height / printScale, cx = 512, cy = H / 2
  const mono = (weight: number, size: number) => `${weight} ${size}px "IBM Plex Mono", monospace`

  // Face: bright centre fading into a soft division tint.
  const face = context.createRadialGradient(cx, cy - 40, 60, cx, cy, 620)
  face.addColorStop(0, '#FFFFFF'); face.addColorStop(.42, '#FAFCFD'); face.addColorStop(1, withAlpha(accent.accent, focused ? .26 : .2))
  context.fillStyle = '#F4F8FB'; context.fillRect(0, 0, 1024, H)
  context.fillStyle = face; context.fillRect(0, 0, 1024, H)

  // Blueprint grid, faded toward the centre so the monogram stays clean.
  context.save()
  context.strokeStyle = withAlpha(accent.accent, .12); context.lineWidth = 3
  context.beginPath()
  for (let x = 32; x < 1024; x += 64) { context.moveTo(x, 0); context.lineTo(x, H) }
  for (let y = 21; y < H; y += 64) { context.moveTo(0, y); context.lineTo(1024, y) }
  context.stroke()
  const clear = context.createRadialGradient(cx, cy, 80, cx, cy, 330)
  clear.addColorStop(0, 'rgba(255,255,255,.95)'); clear.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = clear; context.fillRect(0, 0, 1024, H)
  context.restore()

  // Concentric hex rings around the monogram.
  context.lineWidth = 6; context.strokeStyle = withAlpha(accent.accent, focused ? .42 : .3)
  hexPath(context, cx, cy, 300); context.stroke()
  context.setLineDash([16, 16]); context.lineWidth = 4; context.strokeStyle = withAlpha(accent.accent, .32)
  hexPath(context, cx, cy, 360); context.stroke(); context.setLineDash([])

  // Corner brackets framing the initials.
  context.strokeStyle = accent.accent; context.lineWidth = focused ? 12 : 10; context.lineCap = 'round'
  const bx = 250, by = 175
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const x = cx + sx * bx, y = cy + sy * by
    context.beginPath(); context.moveTo(x, y - sy * 72); context.lineTo(x, y); context.lineTo(x - sx * 72, y); context.stroke()
  }

  // Header: serial plate.
  context.textAlign = 'center'; context.textBaseline = 'middle'
  context.fillStyle = '#46515C'; context.font = mono(600, 46)
  context.fillText(`CSR · ${String(ordinal).padStart(3, '0')}`, cx, 104)
  context.fillStyle = accent.accent
  for (const x of [cx - 190, cx + 190]) { context.save(); context.translate(x, 104); context.rotate(Math.PI / 4); context.fillRect(-11, -11, 22, 22); context.restore() }
  context.fillRect(cx - 170, 156, 340, focused ? 12 : 10)

  // Monogram underline.
  const underline = context.createLinearGradient(cx - 90, 0, cx + 90, 0)
  underline.addColorStop(0, withAlpha(accent.accent, 0)); underline.addColorStop(.5, accent.accent); underline.addColorStop(1, withAlpha(accent.accent, 0))
  context.fillStyle = underline; context.fillRect(cx - 130, cy + 118, 260, focused ? 10 : 8)

  // Footer: division plate.
  const label = accent.label.toUpperCase()
  context.font = mono(700, 54)
  const textWidth = context.measureText(label).width
  const plateW = textWidth + 84, plateY = cy + 222
  context.fillStyle = accent.accent
  context.beginPath()
  if (typeof context.roundRect === 'function') context.roundRect(cx - plateW / 2, plateY - 44, plateW, 88, 44)
  else { context.arc(cx - plateW / 2 + 44, plateY, 44, Math.PI / 2, Math.PI * 1.5); context.arc(cx + plateW / 2 - 44, plateY, 44, -Math.PI / 2, Math.PI / 2); context.closePath() }
  context.fill()
  context.fillStyle = '#FFFFFF'; context.fillText(label, cx, plateY + 3)
  context.strokeStyle = withAlpha(accent.accent, .55); context.lineWidth = 6
  context.beginPath()
  context.moveTo(cx - plateW / 2 - 110, plateY); context.lineTo(cx - plateW / 2 - 22, plateY)
  context.moveTo(cx + plateW / 2 + 22, plateY); context.lineTo(cx + plateW / 2 + 110, plateY)
  context.stroke()

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4
  return texture
}

function badgeShadowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 448
  const context = canvas.getContext('2d')!
  const hex = (inset: number) => {
    const w = 512 - inset * 2, h = 448 - inset * 2
    context.beginPath(); context.moveTo(inset + w * .25, inset); context.lineTo(inset + w * .75, inset)
    context.lineTo(inset + w, inset + h / 2); context.lineTo(inset + w * .75, inset + h)
    context.lineTo(inset + w * .25, inset + h); context.lineTo(inset, inset + h / 2); context.closePath(); context.fill()
  }
  context.filter = 'blur(20px)'; context.fillStyle = 'rgba(16,62,91,.22)'; hex(85)
  context.filter = 'blur(7px)'; context.fillStyle = 'rgba(18,40,60,.16)'; hex(93)
  context.filter = 'blur(11px)'; context.strokeStyle = 'rgba(54,206,232,.48)'; context.lineWidth = 10; context.stroke()
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

type MotionState = MutableRefObject<number>

function MemberBadge({ slot, scene, visibility, shadowTexture, geometry }: { slot: MemberOrbitSlot; scene: MemberOrbitSceneProps; visibility: MotionState; shadowTexture: CanvasTexture; geometry: MemberBadgeGeometry }) {
  const group = useRef<Group>(null)
  const { size } = useThree()
  const layout = getMemberOrbitLayout(size.width, size.height, scene.compact)
  const focused = slot.position === scene.focusedPosition
  const accent = useMemo(() => getDivisionAccent(slot.member), [slot.member])
  const texture = useMemo(() => badgeTexture(slot.logicalIndex + 1, focused, accent), [accent, slot.logicalIndex, focused])
  const textureBlend = useRef(1)
  const interaction = useRef(0)
  const materials = useMemo(() => [
    new MeshStandardMaterial({ color: '#D8E1E7', roughness: .29, metalness: .28, transparent: true }),
    new MeshStandardMaterial({ color: '#91AAB9', roughness: .23, metalness: .64, transparent: true }),
  ], [])
  const edgeColors = useMemo(() => ({ neutral: new Color('#91AAB9'), active: new Color(accent.accent) }), [accent])
  const bodyColors = useMemo(() => ({ neutral: new Color('#D8E1E7'), active: new Color('#FFFFFF') }), [])
  const backing = useMemo(() => new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, toneMapped: false }), [])
  const armor = useMemo(() => new MeshStandardMaterial({ color: '#D8E1E7', metalness: .5, roughness: .25, transparent: true }), [])
  const outerTrace = useMemo(() => new MeshBasicMaterial({ color: '#118AC6', transparent: true, depthWrite: false, toneMapped: false }), [])
  const innerTrace = useMemo(() => new MeshBasicMaterial({ color: '#91AAB9', transparent: true, depthWrite: false, toneMapped: false }), [])
  const tracks = useMemo(() => new LineBasicMaterial({ color: '#118AC6', transparent: true, depthWrite: false, toneMapped: false }), [])
  const nodes = useMemo(() => new MeshBasicMaterial({ color: '#4AC3E8', transparent: true, depthWrite: false, toneMapped: false }), [])
  const shadow = useMemo(() => new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false, opacity: .6 }), [shadowTexture])
  // Printed labels keep their intended contrast; the bevelled badge remains lit.
  const face = useMemo(() => new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }), [])
  const outgoingFace = useMemo(() => new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }), [])
  useLayoutEffect(() => {
    // Circuit traces and nodes carry the member's division colour.
    outerTrace.color.set(accent.accent); tracks.color.set(accent.accent); nodes.color.set(accent.glow)
    armor.color.set('#D8E1E7').lerp(new Color(accent.accent), .22)
  }, [accent, outerTrace, tracks, nodes, armor])
  useLayoutEffect(() => {
    // Replace only the recycled rear badge, crossfading its labels as it revolves.
    // This temporary second texture never creates another card or dataset-wide mesh.
    if (face.map === texture) return
    outgoingFace.map?.dispose()
    outgoingFace.map = face.map
    textureBlend.current = face.map && !scene.reducedMotion ? 0 : 1
    face.map = texture
    face.needsUpdate = true
    outgoingFace.needsUpdate = true
  }, [texture, face, outgoingFace])
  useEffect(() => () => { face.map?.dispose(); outgoingFace.map?.dispose(); face.dispose(); outgoingFace.dispose() }, [face, outgoingFace])
  useEffect(() => () => { materials.forEach(material => material.dispose()) }, [materials])
  useEffect(() => () => { [backing, armor, outerTrace, innerTrace, tracks, nodes].forEach(material => material.dispose()) }, [backing, armor, outerTrace, innerTrace, tracks, nodes])
  useEffect(() => () => { shadow.dispose() }, [shadow])
  useFrame((_, delta) => {
    const pose = getMemberBadgePose(slot.position, scene.physics.rotation, scene.physics.count, size.width, size.height, scene.focusedPosition, scene.compact, scene.pointer, visibility.current, scene.reducedMotion ? null : scene.hover)
    if (group.current) {
      group.current.position.set(pose.x, pose.y, pose.z)
      group.current.rotation.set(pose.pitch, pose.yaw, pose.roll)
      group.current.scale.setScalar(pose.scale)
    }
    textureBlend.current += (1 - textureBlend.current) * (scene.reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, .1) * 14))
    const hovered = scene.hover?.position === slot.position && !scene.reducedMotion ? 1 : 0
    interaction.current += (hovered - interaction.current) * (1 - Math.exp(-Math.min(delta, .1) * 12))
    const illumination = Math.min(1, pose.focus + interaction.current * .6)
    const opacity = visibility.current * (.90 + pose.frontness * .06 + pose.focus * .04)
    materials.forEach(material => { material.opacity = opacity })
    materials[1].color.lerpColors(edgeColors.neutral, edgeColors.active, illumination)
    materials[0].color.lerpColors(bodyColors.neutral, bodyColors.active, illumination)
    materials[1].roughness = .3 - illumination * .1
    backing.opacity = armor.opacity = opacity
    outerTrace.opacity = opacity * (.78 + illumination * .22)
    innerTrace.opacity = opacity * (.70 + illumination * .30)
    tracks.opacity = opacity * (.75 + illumination * .25)
    nodes.opacity = opacity
    shadow.opacity = opacity * (.64 + pose.frontness * .18 + illumination * .18)
    face.opacity = opacity * textureBlend.current
    outgoingFace.opacity = opacity * (1 - textureBlend.current)
    if (outgoingFace.map && textureBlend.current > .999) {
      outgoingFace.map.dispose(); outgoingFace.map = null; outgoingFace.needsUpdate = true
    }
  }, -1)
  const front = MEMBER_BADGE_DEPTH / 2
  return <group ref={group} name="hexagonal-member-badge" onClick={event => { event.stopPropagation(); if (!scene.physics.isDragging) scene.onMemberClick(slot.member) }}>
    <mesh position={[.05, -.17, -MEMBER_BADGE_DEPTH / 2 - .045]} material={shadow}>
      <planeGeometry args={[layout.cardWidth * 1.6, layout.cardHeight * 1.5]} />
    </mesh>
    <mesh geometry={geometry.body} material={materials} dispose={null} />
    <mesh geometry={geometry.backing} position={[0, 0, front + .010]} material={backing} dispose={null} />
    <mesh geometry={geometry.armor} position={[0, 0, front + .028]} material={armor} dispose={null} />
    <mesh geometry={geometry.outerTrace} position={[0, 0, front + .031]} material={outerTrace} dispose={null} />
    <mesh geometry={geometry.innerTrace} position={[0, 0, front + .032]} material={innerTrace} dispose={null} />
    <lineSegments geometry={geometry.tracks} position={[0, 0, front + .034]} material={tracks} dispose={null} />
    <mesh geometry={geometry.nodes} position={[0, 0, front + .036]} material={nodes} dispose={null} />
    <mesh geometry={geometry.face} position={[0, 0, front + .025]} material={outgoingFace} dispose={null} />
    <mesh geometry={geometry.face} position={[0, 0, front + .026]} material={face} dispose={null} />
  </group>
}

/** Every physical slot reuses the same small geometry set at a viewport size. */
function MemberBadges({ scene, visibility, shadowTexture }: { scene: MemberOrbitSceneProps; visibility: MotionState; shadowTexture: CanvasTexture }) {
  const { size } = useThree()
  const layout = getMemberOrbitLayout(size.width, size.height, scene.compact)
  const geometry = useMemo(() => createMemberBadgeGeometry(layout.cardWidth, layout.cardHeight, MEMBER_BADGE_DEPTH), [layout.cardWidth, layout.cardHeight])
  useEffect(() => () => { Object.values(geometry).forEach(part => part.dispose()) }, [geometry])
  return scene.slots.map(slot => <MemberBadge key={slot.position} slot={slot} scene={scene} visibility={visibility} shadowTexture={shadowTexture} geometry={geometry} />)
}

function MemberMotion({ scene, visibility }: { scene: MemberOrbitSceneProps; visibility: MotionState }) {
  const { camera, size, gl } = useThree()
  useLayoutEffect(() => {
    const perspective = camera as PerspectiveCamera
    perspective.fov = getMemberCameraFov(size.width, size.height, scene.compact)
    perspective.aspect = size.width / Math.max(1, size.height)
    perspective.updateProjectionMatrix()
  }, [camera, size.width, size.height, scene.compact])
  useEffect(() => {
    scene.onReady?.()
    const canvas = gl.domElement
    const lost = (event: Event) => { event.preventDefault(); scene.onFailure?.() }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [gl, scene.onReady, scene.onFailure])
  useFrame((state, delta) => {
    const blend = scene.reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, .1) * 13)
    visibility.current += (scene.transition - visibility.current) * blend
    scene.physics.tick(delta)
    scene.hubMotion.tick(document.hidden ? 0 : delta, scene.reducedMotion)
    scene.onFrame(scene.physics.rotation, state.size.width, state.size.height,
      projectMemberSlots(scene.physics.rotation, scene.physics.count, state.size.width, state.size.height, scene.focusedPosition, scene.compact, scene.pointer, visibility.current, scene.reducedMotion ? null : scene.hover))
  }, -2)
  return null
}

function MemberHub({ scene }: { scene: MemberOrbitSceneProps }) {
  const { size } = useThree()
  const hoverLift = useRef<Group>(null)
  const layout = getMemberHubLayout(size.width, size.height, scene.compact)
  useFrame(() => {
    if (hoverLift.current) hoverLift.current.position.y = scene.hubHover.current.liftPx * getMemberHubUnitsPerPixel(size.width, size.height, scene.compact, layout.z)
  }, -1)
  return <group ref={hoverLift} name="member-hub-directory-hover">
    <ProjectHub motion={scene.hubMotion} layout={layout}
      viewSize={getMemberHubViewSize(size.width, size.height, scene.compact)} cameraZ={MEMBER_CAMERA_Z} restLiftPx={6} label="MEMBER PORTFOLIO" />
  </group>
}

class MemberSceneBoundary extends Component<{ onFailure?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure?.() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function MemberOrbitScene(scene: MemberOrbitSceneProps) {
  const visibility = useRef(scene.transition)
  const shadowTexture = useMemo(badgeShadowTexture, [])
  useEffect(() => () => { shadowTexture.dispose() }, [shadowTexture])
  return <MemberSceneBoundary onFailure={scene.onFailure}>
    <Canvas camera={{ position: [0, 0, MEMBER_CAMERA_Z], fov: 31, near: .1, far: 80 }} dpr={scene.compact ? [1, 1.35] : [1, 1.6]} gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}>
      <ambientLight intensity={.38} />
      <hemisphereLight args={['#FFFFFF', '#8FA3B8', .55]} />
      <directionalLight position={[-8, 10, 14]} color="#FFFFFF" intensity={2.1} />
      <directionalLight position={[12, -4, 8]} color="#E8F1F7" intensity={.65} />
      <directionalLight position={[-12, 4, -6]} color="#4AC3E8" intensity={1.3} />
      <Suspense fallback={null}>
        <Environment resolution={scene.compact ? 64 : 128} frames={1} environmentIntensity={.5}>
          <Lightformer form="rect" intensity={2} color="#FFFFFF" position={[-6, 7, 8]} scale={[10, 5, 1]} />
          <Lightformer form="rect" intensity={1.3} color="#E6F2FA" position={[8, 3, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[7, 9, 1]} />
          <Lightformer form="rect" intensity={1.4} color="#FFFFFF" position={[0, -6, 5]} rotation={[Math.PI / 3, 0, 0]} scale={[9, 3, 1]} />
        </Environment>
        <MemberHub scene={scene} />
      </Suspense>
      <MemberMotion scene={scene} visibility={visibility} />
      <MemberBadges scene={scene} visibility={visibility} shadowTexture={shadowTexture} />
    </Canvas>
  </MemberSceneBoundary>
}
