import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { CanvasTexture, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, Shape, SRGBColorSpace } from 'three'
import { getHubLayout, getHubScreenPulse, type HubLayout } from './hub-geometry'
import { getOrbitViewSize, ORBIT_CAMERA_Z } from './orbit-geometry'
import type { HubMotionController } from './hub-motion'

/** A circular physical core with its own brief activation pulse. */
export default function ProjectHub({ motion, layout: suppliedLayout, viewSize, cameraZ = ORBIT_CAMERA_Z, restLiftPx = 0, label = 'PROJECT ARCHIVE' }: {
  motion: HubMotionController; layout?: HubLayout; viewSize?: number; cameraZ?: number; restLiftPx?: number; label?: string
}) {
  const { size } = useThree()
  const layout = suppliedLayout ?? getHubLayout(size.width, size.height)
  const root = useRef<Group>(null), spin = useRef<Group>(null)
  const contactShadow = useRef<Mesh>(null), shadowMaterial = useRef<MeshBasicMaterial>(null)
  useFrame(() => {
    const pulse = getHubScreenPulse(motion.pose, size.height)
    const unitsPerPixel = (viewSize ?? getOrbitViewSize(size.width, size.height)) / Math.max(1, Math.min(size.width, size.height)) * (1 - layout.z / cameraZ)
    const lift = pulse.liftPx * unitsPerPixel
    if (root.current) root.current.position.y = restLiftPx * unitsPerPixel + lift
    if (spin.current) spin.current.rotation.y = pulse.rotationY
    // The soft contact stays beneath the resting core as the disc rises.
    if (contactShadow.current) {
      contactShadow.current.position.y = -.2 - lift
      contactShadow.current.scale.setScalar(1 + pulse.liftPx * .004)
    }
    if (shadowMaterial.current) shadowMaterial.current.opacity = 1 - pulse.liftPx * .012
  })
  const emblem = useTexture('/brand/rit-emblem.png')
  const body = useMemo(() => {
    const face = new Shape()
    face.absarc(0, 0, layout.radius, 0, Math.PI * 2, false)
    const geometry = new ExtrudeGeometry(face, {
      depth: layout.depth, steps: 1, curveSegments: 96,
      bevelEnabled: true, bevelSize: layout.bevel,
      bevelThickness: layout.bevel, bevelSegments: 5,
    })
    geometry.translate(0, 0, -layout.depth / 2)
    return geometry
  }, [layout.radius, layout.depth, layout.bevel])
  useEffect(() => () => body.dispose(), [body])

  const print = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1024
    const context = canvas.getContext('2d')!
    const paint = () => {
      context.clearRect(0, 0, 1024, 1024)
      // The official mark is drawn as supplied, with its original colors.
      context.save()
      context.beginPath()
      context.arc(512, 362, 200, 0, Math.PI * 2)
      context.clip()
      context.drawImage(emblem.image as HTMLImageElement, 312, 162, 400, 400)
      context.restore()
      context.textAlign = 'center'
      context.fillStyle = '#101820'
      context.font = '650 140px "Manrope Variable", Arial, sans-serif'
      context.fillText('CSR-RIT', 512, 716)
      context.fillStyle = '#657686'
      context.font = '54px "IBM Plex Mono", monospace'
      context.fillText(label, 512, 802)
    }
    paint()
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    return { texture, paint }
  }, [emblem, label])
  useEffect(() => {
    let mounted = true
    void document.fonts.ready.then(() => {
      if (mounted) { print.paint(); print.texture.needsUpdate = true }
    })
    return () => { mounted = false; print.texture.dispose() }
  }, [print])

  const shadow = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const context = canvas.getContext('2d')!
    const gradient = context.createRadialGradient(64, 64, 12, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(16,24,32,.24)')
    gradient.addColorStop(.52, 'rgba(16,24,32,.13)')
    gradient.addColorStop(.8, 'rgba(16,24,32,.04)')
    gradient.addColorStop(1, 'rgba(16,24,32,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)
    return new CanvasTexture(canvas)
  }, [])
  useEffect(() => () => shadow.dispose(), [shadow])

  const front = layout.depth / 2 + layout.bevel
  return <group ref={root} name="csr-rit-circular-core" position={[0, 0, layout.z]}>
    <mesh ref={contactShadow} position={[.08, -.2, -layout.depth / 2 - .15]}>
      <planeGeometry args={[(layout.radius + layout.bevel) * 2.85, (layout.radius + layout.bevel) * 2.85]} />
      <meshBasicMaterial ref={shadowMaterial} map={shadow} transparent depthWrite={false} toneMapped={false} />
    </mesh>
    <group rotation={[layout.pitch, layout.yaw, 0]}>
    <group ref={spin} name="csr-rit-local-y-spin">
      <mesh geometry={body} castShadow receiveShadow dispose={null}>
        <meshStandardMaterial attach="material-0" color="#FFFEFC" metalness={.1} roughness={.34} />
        <meshStandardMaterial attach="material-1" color="#8FA3B8" metalness={.6} roughness={.3} />
      </mesh>
      {[0, Math.PI].map((faceRotation, index) => <group key={index} rotation={[0, faceRotation, 0]} name={index === 0 ? 'csr-rit-front-face' : 'csr-rit-reverse-face'}>
        <mesh position={[0, 0, front + .004]}>
          <torusGeometry args={[layout.radius - .035, .026, 10, 128]} />
          <meshStandardMaterial color="#52758D" metalness={.64} roughness={.29} />
        </mesh>
        <mesh position={[0, 0, front + .006]}>
          <torusGeometry args={[layout.radius - .11, .012, 8, 128]} />
          <meshStandardMaterial color="#D0DCE5" metalness={.35} roughness={.4} />
        </mesh>
        <mesh position={[0, 0, front + .012]}>
          <circleGeometry args={[layout.radius - .15, 128]} />
          <meshBasicMaterial map={print.texture} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </group>)}
      <mesh>
        <torusGeometry args={[layout.radius + layout.bevel * .6, .021, 8, 128]} />
        <meshStandardMaterial color="#0B4F8A" metalness={.68} roughness={.25} />
      </mesh>
    </group>
    </group>
  </group>
}
