import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'

const modules = new Map()
function load(relativePath) {
  const filename = new URL(relativePath, import.meta.url)
  if (modules.has(filename.href)) return modules.get(filename.href)
  const exports = {}
  modules.set(filename.href, exports)
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(code, {
    exports, module: { exports },
    require: name => name === 'three' ? THREE : load(new URL(`${name}.ts`, filename).href),
  })
  return exports
}

const orbit = load('../src/members/orbit-geometry.ts')
const hub = load('../src/members/hub-geometry.ts')
const pulseGeometry = load('../src/projects/hub-geometry.ts')
const badges = load('../src/members/badge-geometry.ts')
const { Euler, PerspectiveCamera, Vector3, Shape, ExtrudeGeometry, TorusGeometry, CircleGeometry } = THREE
const viewports = [[1190, 358, false], [1775, 750, false], [1775, 296, false], [800, 400, false], [372, 303, true], [372, 351, true], [320, 280, true]]

function memberCamera(width, height, compact) {
  const camera = new PerspectiveCamera(orbit.getMemberCameraFov(width, height, compact), width / height, .1, 80)
  camera.position.z = orbit.MEMBER_CAMERA_Z
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  return camera
}

test('the member medallion fits its existing reserved hub with physical depth and responsive screen size', () => {
  for (const [width, height, compact] of viewports) {
    const layout = hub.getMemberHubLayout(width, height, compact)
    assert.ok(Object.values(layout).every(Number.isFinite))
    assert.ok(layout.diameterPx > 80 && layout.diameterPx <= (compact ? 88 : 128))
    assert.ok(layout.depth > .45 && layout.bevel > 0 && layout.bevel < layout.depth / 2)
    assert.ok(Math.abs(layout.depth / layout.radius - .8 / 2.2) < 1e-10)
    assert.equal(layout.pitch, -.18)
    assert.equal(layout.yaw, .22)
    assert.ok(layout.z > layout.depth / 2)
  }
  assert.equal(hub.getMemberHubLayout(1190, 358, false).diameterPx, 128)
  assert.equal(hub.getMemberHubLayout(372, 303, true).diameterPx, 88)
  assert.equal(hub.getMemberHubLayout(320, 280, true).diameterPx, 84)
  assert.ok(hub.getMemberHubLayout(1775, 296, false).diameterPx < 110)
})

test('the shared shorter-axis adapter matches the member camera and control during both spin pulses and directory hover lift', () => {
  for (const [width, height, compact] of [...viewports, [372, 640, true]]) {
    const layout = hub.getMemberHubLayout(width, height, compact)
    const camera = memberCamera(width, height, compact)
    for (const hoverLift of [0, 4]) for (const lift of [0, 8]) {
      const pulse = pulseGeometry.getHubScreenPulse({ liftPx: lift, rotationY: 0 }, height)
      const worldPerPixel = hub.getMemberHubUnitsPerPixel(width, height, compact, layout.z)
      const genericPerPixel = hub.getMemberHubViewSize(width, height, compact) / Math.min(width, height) * (1 - layout.z / orbit.MEMBER_CAMERA_Z)
      assert.ok(Math.abs(worldPerPixel - genericPerPixel) < 1e-10)
      const center = new Vector3(0, (6 + pulse.liftPx + hoverLift) * genericPerPixel, layout.z).project(camera)
      assert.ok(Math.abs(center.x * width / 2) < 1e-10)
      assert.ok(Math.abs(-center.y * height / 2 + 6 + pulse.liftPx + hoverLift) < 1e-10,
        'the disc and HTML circle must remain aligned as the original spin pulse combines with the directory hover lift')
    }
  }
})

function medallionVertices(layout) {
  const result = []
  const add = (geometry, z = 0, reverse = false) => {
    const positions = geometry.getAttribute('position')
    const turn = new Euler(0, reverse ? Math.PI : 0, 0)
    for (let index = 0; index < positions.count; index++) {
      const point = new Vector3().fromBufferAttribute(positions, index)
      point.z += z
      result.push(point.applyEuler(turn))
    }
    geometry.dispose()
  }
  const face = new Shape()
  face.absarc(0, 0, layout.radius, 0, Math.PI * 2, false)
  const body = new ExtrudeGeometry(face, {
    depth: layout.depth, steps: 1, curveSegments: 96,
    bevelEnabled: true, bevelSize: layout.bevel, bevelThickness: layout.bevel, bevelSegments: 5,
  })
  body.translate(0, 0, -layout.depth / 2)
  add(body)
  const front = layout.depth / 2 + layout.bevel
  for (const reverse of [false, true]) {
    add(new TorusGeometry(layout.radius - .035, .026, 10, 128), front + .004, reverse)
    add(new TorusGeometry(layout.radius - .11, .012, 8, 128), front + .006, reverse)
    add(new CircleGeometry(layout.radius - .15, 128), front + .012, reverse)
  }
  add(new TorusGeometry(layout.radius + layout.bevel * .6, .021, 8, 128))
  return result
}

test('the complete member disc, printed faces and rims stay in the moving circle throughout a local axial turn', () => {
  for (const [width, height, compact] of viewports) {
    const layout = hub.getMemberHubLayout(width, height, compact)
    const vertices = medallionVertices(layout)
    const rest = new Euler(layout.pitch, layout.yaw, 0)
    const camera = memberCamera(width, height, compact)
    const point = new Vector3()
    for (const lift of [0, 8]) {
      for (let spin = 0; spin < 360; spin += 15) {
        const pulse = pulseGeometry.getHubScreenPulse({ liftPx: lift, rotationY: spin * Math.PI / 180 }, height)
        const axialTurn = new Euler(0, pulse.rotationY, 0)
        const liftWorld = (6 + pulse.liftPx) * hub.getMemberHubUnitsPerPixel(width, height, compact, layout.z)
        for (const vertex of vertices) {
          point.copy(vertex).applyEuler(axialTurn).applyEuler(rest)
          point.y += liftWorld
          point.z += layout.z
          point.project(camera)
          const x = point.x * width / 2
          const y = -point.y * height / 2
          assert.ok(Math.hypot(x, y + 6 + pulse.liftPx) <= layout.diameterPx / 2,
            `${width}×${height}, ${spin}°, lift ${pulse.liftPx}: physical branding or edge exceeds the moving circle`)
          assert.ok(Math.abs(x) < width / 2 && Math.abs(y) < height / 2,
            `${width}×${height}: the complete physical hub must stay inside the stage`)
        }
      }
    }
  }
})

function convexHull(points) {
  const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (origin, a, b) => (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
  const lower = [], upper = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 1e-9) lower.pop()
    lower.push(point)
  }
  for (const point of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 1e-9) upper.pop()
    upper.push(point)
  }
  lower.pop(); upper.pop()
  return lower.concat(upper)
}

function pointSegmentDistance(point, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y
  const fraction = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point.x - start.x - fraction * dx, point.y - start.y - fraction * dy)
}

function verticalPathDistance(start, end, edgeStart, edgeEnd) {
  const dx = edgeEnd.x - edgeStart.x
  const lowY = Math.min(start.y, end.y), highY = Math.max(start.y, end.y)
  if (Math.abs(dx) > 1e-10) {
    const fraction = (start.x - edgeStart.x) / dx
    const crossingY = edgeStart.y + fraction * (edgeEnd.y - edgeStart.y)
    if (fraction >= 0 && fraction <= 1 && crossingY >= lowY && crossingY <= highY) return 0
  } else if (Math.abs(edgeStart.x - start.x) < 1e-10
    && Math.max(edgeStart.y, edgeEnd.y) >= lowY && Math.min(edgeStart.y, edgeEnd.y) <= highY) return 0
  return Math.min(
    pointSegmentDistance(start, edgeStart, edgeEnd), pointSegmentDistance(end, edgeStart, edgeEnd),
    pointSegmentDistance(edgeStart, start, end), pointSegmentDistance(edgeEnd, start, end),
  )
}

test('the pulsing and hover-raised circular control stays clear of every real hex badge throughout the member orbit', () => {
  for (const [width, height, compact] of viewports) {
    const layout = orbit.getMemberOrbitLayout(width, height, compact)
    const hubLayout = hub.getMemberHubLayout(width, height, compact)
    const geometries = badges.createMemberBadgeGeometry(layout.cardWidth, layout.cardHeight, orbit.MEMBER_BADGE_DEPTH)
    const vertices = geometries.body.getAttribute('position')
    const outline = convexHull(Array.from({ length: vertices.count }, (_, index) => ({ x: vertices.getX(index), y: vertices.getY(index) })))
    Object.values(geometries).forEach(geometry => geometry.dispose())
    const prism = outline.flatMap(point => [-1, 1].map(side => [point.x, point.y, side * (orbit.MEMBER_BADGE_DEPTH / 2 + .045)]))
    const count = compact ? orbit.MEMBER_MOBILE_SLOTS : orbit.MEMBER_DESKTOP_SLOTS
    const peak = pulseGeometry.getHubScreenPulse({ liftPx: 8, rotationY: Math.PI }, height).liftPx + 4
    for (let rotation = 0; rotation < 360; rotation++) {
      const focus = Math.round(rotation / (360 / count)) % count
      for (let position = 0; position < count; position++) {
        const pose = orbit.getMemberBadgePose(position, rotation, count, width, height, focus, compact, { x: 1, y: -1 }, 1,
          compact ? null : { position, x: 1, y: -1 })
        const hull = convexHull(prism.map(point => orbit.projectMemberBadgePoint(pose, point, width, height, compact)))
        const restCenter = { x: width / 2, y: height / 2 - 6 }
        const peakCenter = { x: width / 2, y: height / 2 - 6 - peak }
        for (const center of [restCenter, peakCenter]) {
          const winding = hull.filter((start, index) => {
            const end = hull[(index + 1) % hull.length]
            return (end.x - start.x) * (center.y - start.y) - (end.y - start.y) * (center.x - start.x) < 0
          }).length
          assert.ok(winding !== 0 && winding !== hull.length, 'the fixed circular hub must remain outside the badge hull')
        }
        // Measure the entire center path, including a closest point between
        // keyframes, rather than checking only a few sampled lift amounts.
        const distance = Math.min(...hull.map((start, index) => verticalPathDistance(restCenter, peakCenter, start, hull[(index + 1) % hull.length])))
        assert.ok(distance > hubLayout.diameterPx / 2,
          `${width}×${height}, ${rotation}°, slot ${position}: hex frame would cover the moving circular control`)
      }
    }
  }
})

test('unmeasured member hub dimensions remain finite without changing orbit physics', () => {
  for (const [width, height] of [[0, 0], [NaN, Infinity], [-10, -10]]) {
    const layout = hub.getMemberHubLayout(width, height)
    assert.ok(Object.values(layout).every(Number.isFinite))
    assert.ok(layout.radius > 0 && layout.diameterPx > 0)
    assert.ok(Number.isFinite(hub.getMemberHubViewSize(width, height)))
    assert.ok(hub.getMemberHubUnitsPerPixel(width, height) > 0)
  }
  assert.equal(orbit.MEMBER_DESKTOP_SLOTS, 12)
  assert.equal(orbit.MEMBER_MOBILE_SLOTS, 6)
})
