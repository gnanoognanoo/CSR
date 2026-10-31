import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Color, Group, Mesh, MeshStandardMaterial, Vector3, PointLight } from 'three'
import { getModelPose, ORBIT_ACTIVE_SCALE, ORBIT_CAMERA_Z, ORBIT_MODEL_SIZE, type ModelEmphasis, type ModelScreenPosition, type ProjectScreenPosition } from './orbit-geometry'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { OrbitPhysicsController } from './useOrbitPhysics'
import type { ModelMotionController } from './model-motion'
import type { Project } from './data'
import type { ProjectSlot } from './project-slots'
import { advanceModelSpin, createModelSpin, fullSpinNormalization, includeSpinVertex } from './model-spin'

type V3 = [number, number, number]

export type DivisionModelsProps = {
  projectPhysics: OrbitPhysicsController
  modelMotion: ModelMotionController
  selectedDivision: number
  projectCount: number
  projects?: readonly Project[]
  projectSlots?: readonly ProjectSlot[]
  selectedProject?: number
  reducedMotion: boolean
  compact: boolean
  pointer: { x: number; y: number }
  modelHoverIndex?: number | null
  modelEmphasis?: ModelEmphasis[]
  onSelect?: (index: number) => void
  onProjectClick?: (project: Project) => void
  onPlaceholderClick?: (index: number) => void
  onFrame?: (projectAngle: number, width: number, height: number, models: ModelScreenPosition[], slots: ProjectScreenPosition[]) => void
  onReady?: () => void
  onFailure?: () => void
}

// Original materials retain the supplied objects' physical surface detail.
const models: { id: string; orientation: V3 }[] = [
  { id: 'ai', orientation: [.12, -.28, 0] },
  { id: 'embedded', orientation: [.8, -.12, -.04] },
  { id: 'robotics', orientation: [.65, -.3, 0] },
  { id: 'software', orientation: [.2, Math.PI * 1.5 - .3, 0] },
  { id: 'iot', orientation: [.06, -.18, 0] },
  { id: 'research', orientation: [.8, -.4, -.04] },
  { id: 'operations', orientation: [.8, -.18, .04] },
]

function ModelRegistration({ failed = false }: { failed?: boolean }) {
  const positions = useMemo(() => new Float32Array([
    -.25, -.16, 0, -.25, -.25, 0, -.25, -.25, 0, -.16, -.25, 0,
    .16, -.25, 0, .25, -.25, 0, .25, -.25, 0, .25, -.16, 0,
    -.25, .16, 0, -.25, .25, 0, -.25, .25, 0, -.16, .25, 0,
    .16, .25, 0, .25, .25, 0, .25, .25, 0, .25, .16, 0,
  ]), [])
  return <lineSegments>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <lineBasicMaterial color="#65c7f3" transparent opacity={failed ? .5 : .7} />
  </lineSegments>
}

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <ModelRegistration failed /> : this.props.children }
}

function SuppliedModel({ index, compact, modelEmphasis, modelMotion }: { index: number; compact: boolean; modelEmphasis?: ModelEmphasis[]; modelMotion: ModelMotionController }) {
  const { id, orientation } = models[index]
  const { scene } = useGLTF(`/models/projects/${id}${compact ? '-mobile' : ''}.glb`, false, true)
  const normalized = useMemo(() => {
    const facing = new Group()
    const object = clone(scene)
    const materials: { material: MeshStandardMaterial; color: Color; environment: number }[] = []
    object.traverse(child => {
      if (!(child instanceof Mesh)) return
      child.castShadow = false
      child.receiveShadow = !compact
      const copy = (source: MeshStandardMaterial) => {
        const material = source.clone()
        if (material instanceof MeshStandardMaterial) {
          // The supplied brain uses emission strength 10, which overwhelms its
          // normal map. Keep its authored texture while exposing lit surfaces.
          if (id === 'ai') material.emissiveIntensity = Math.min(material.emissiveIntensity, .65)
          materials.push({ material, color: material.color.clone(), environment: material.envMapIntensity })
        }
        return material
      }
      child.material = Array.isArray(child.material) ? child.material.map(copy) : copy(child.material)
    })
    facing.add(object)
    facing.rotation.set(...orientation)
    facing.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(facing, true)
    const center = bounds.getCenter(new Vector3())
    facing.position.copy(center).multiplyScalar(-1)
    const result = new Group()
    result.add(facing)
    result.updateMatrixWorld(true)
    // Derive the full yaw envelope from actual vertices, rather than rotated
    // box corners, so the large product silhouettes retain as much size as possible.
    const envelope = { radius: 0, verticalSupport: 0 }
    const closestDistance = ORBIT_CAMERA_Z - 1.1
    const vertex = new Vector3()
    object.traverse(child => {
      if (!(child instanceof Mesh)) return
      const positions = child.geometry.getAttribute('position')
      if (!positions) return
      for (let index = 0; index < positions.count; index++) {
        child.getVertexPosition(index, vertex).applyMatrix4(child.matrixWorld)
        includeSpinVertex(envelope, vertex.x, vertex.y, vertex.z, ORBIT_MODEL_SIZE, ORBIT_ACTIVE_SCALE, closestDistance)
      }
    })
    result.scale.setScalar(fullSpinNormalization(envelope, ORBIT_MODEL_SIZE, ORBIT_ACTIVE_SCALE, closestDistance))
    return { object: result, materials }
  }, [scene, orientation, compact])
  useFrame(() => {
    const active = modelEmphasis?.[index]?.active ?? 0
    const hover = modelEmphasis?.[index]?.hover ?? 0
    const held = modelMotion.get(index).held
    normalized.materials.forEach(({ material, color, environment }) => {
      material.color.copy(color).multiplyScalar(1 + active * (index === 0 ? .025 : .08) + hover * .04 + held * .06)
      material.envMapIntensity = Math.max(.8, environment) * (1 + active * .22 + held * .3)
    })
  })
  useEffect(() => () => normalized.materials.forEach(({ material }) => material.dispose()), [normalized])
  return <primitive object={normalized.object} dispose={null} />
}

function DivisionObject({ index, modelMotion, selectedDivision, modelHoverIndex, modelEmphasis, reducedMotion, compact, onSelect }: DivisionModelsProps & { index: number }) {
  const anchor = useRef<Group>(null)
  const body = useRef<Group>(null)
  const rim = useRef<PointLight>(null)
  const spin = useRef(createModelSpin(index))
  const selected = index === selectedDivision
  const hovered = modelHoverIndex === index
  useFrame(({ size }, delta) => {
    if (!anchor.current || !body.current) return
    const motion = modelMotion.get(index)
    const time = motion.orbitTime
    const emphasis = modelEmphasis?.[index] ?? { active: selected ? 1 : 0, hover: hovered ? 1 : 0 }
    const pose = getModelPose(index, time, motion.offset, size.width, size.height, emphasis, motion)
    anchor.current.position.set(pose.position.x, pose.position.y, pose.position.z)
    const highlighted = hovered || motion.hovered
    body.current.scale.setScalar(pose.scale)
    spin.current = advanceModelSpin(spin.current, delta * modelMotion.speed, {
      index, hovered: highlighted, paused: modelMotion.paused, dragging: motion.dragging, reducedMotion,
    })
    // A complete, monotonic local turn exposes front, sides and back. It has
    // its own clock and never changes the orbital anchor or project selection.
    body.current.rotation.set(0, spin.current.angle, 0)
    if (rim.current) {
      const activeLight = (index === 0 ? 1.5 : 3) * emphasis.active
      rim.current.intensity = 2.2 + activeLight + 1.6 * emphasis.hover * (1 - emphasis.active) + 2 * motion.held
    }
  })

  const select = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect?.(index) }
  return <group ref={anchor} name={`floating-division-${models[index].id}`}>
    <group ref={body} onClick={select}>
      <ModelBoundary key={`${models[index].id}-${compact ? 'mobile' : 'desktop'}`}>
        <Suspense fallback={<ModelRegistration />}><SuppliedModel index={index} compact={compact} modelEmphasis={modelEmphasis} modelMotion={modelMotion} /></Suspense>
      </ModelBoundary>
    </group>
    {/* Light follows the orbit, but stays outside the rotating body so its
        highlights travel across the object's changing surface normals. */}
    <pointLight ref={rim} position={[1.8, 1.7, 2.4]} intensity={2.2} distance={6} decay={2} color="#c3eaff" />
  </group>
}

export default function DivisionModels(props: DivisionModelsProps) {
  return <>{models.map((model, index) => <DivisionObject key={model.id} index={index} {...props} />)}</>
}
