import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'

const { Euler, PerspectiveCamera, Vector3 } = THREE

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(path.join(root, 'src/members/orbit-geometry.ts'), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const exports = {}
vm.runInNewContext(code, { exports, module: { exports } })
const { MEMBER_CAMERA_Z, MEMBER_BADGE_DEPTH, MEMBER_ORBIT_TILT, MEMBER_DESKTOP_SLOTS, MEMBER_MOBILE_SLOTS,
  getMemberBadgePose, getMemberCameraFov, getMemberOrbitLayout, projectMemberSlots, projectMemberBadgePoint } = exports

const badgeCode = ts.transpileModule(readFileSync(path.join(root, 'src/members/badge-geometry.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const badgeGeometry = {}
vm.runInNewContext(badgeCode, {
  exports: badgeGeometry, module: { exports: badgeGeometry },
  require: name => { assert.equal(name, 'three'); return THREE },
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

const envelopeCache = new Map()
function badgeEnvelope(layout) {
  const key = `${layout.cardWidth}/${layout.cardHeight}`
  if (envelopeCache.has(key)) return envelopeCache.get(key)
  const meshes = badgeGeometry.createMemberBadgeGeometry(layout.cardWidth, layout.cardHeight, MEMBER_BADGE_DEPTH)
  try {
    const vertices = meshes.body.getAttribute('position')
    const points = Array.from({ length: vertices.count }, (_, index) => ({ x: vertices.getX(index), y: vertices.getY(index) }))
    // Preserve the actual expanded hex outline, including bevel miters. A
    // conservative depth prism also contains the inset print and blue tracks.
    const outline = convexHull(points)
    const prism = outline.flatMap(point => [-1, 1].map(side => [point.x, point.y, side * (MEMBER_BADGE_DEPTH / 2 + .045)]))
    envelopeCache.set(key, prism)
    return prism
  } finally {
    Object.values(meshes).forEach(mesh => mesh.dispose())
  }
}

function projectedBadgeHull(pose, width, height, compact) {
  const points = badgeEnvelope(getMemberOrbitLayout(width, height, compact))
  return convexHull(points.map(point => projectMemberBadgePoint(pose, point, width, height, compact)))
}

/** A separating axis distinguishes real hex collisions from empty corners. */
function polygonGap(a, b) {
  let separation = -Infinity
  for (const polygon of [a, b]) {
    for (let index = 0; index < polygon.length; index++) {
      const from = polygon[index], to = polygon[(index + 1) % polygon.length]
      const normalX = from.y - to.y, normalY = to.x - from.x
      const length = Math.hypot(normalX, normalY)
      if (length < 1e-9) continue
      const project = point => (point.x * normalX + point.y * normalY) / length
      const valuesA = a.map(project), valuesB = b.map(project)
      separation = Math.max(separation, Math.min(...valuesB) - Math.max(...valuesA), Math.min(...valuesA) - Math.max(...valuesB))
    }
  }
  return separation
}

test('the member camera projection and extruded badge hit targets agree throughout a turn', () => {
  for (const [width, height, compact, count] of [[1200, 450, false, 12], [372, 350, true, 6], [980, 430, false, 12], [1190, 358, false, 12], [372, 303, true, 6], [1775, 296, false, 12]]) {
    const camera = new PerspectiveCamera(getMemberCameraFov(width, height, compact), width / height, .1, 80)
    camera.position.z = MEMBER_CAMERA_Z
    camera.updateMatrixWorld()
    for (let rotation = -360; rotation <= 360; rotation += 17) {
      const focus = ((Math.round(rotation / (360 / count)) % count) + count) % count
      const hover = compact ? null : { position: focus, x: .8, y: -.9 }
      const positions = projectMemberSlots(rotation, count, width, height, focus, compact, { x: .7, y: -.8 }, 1, hover)
      for (const projected of positions) {
        const pose = getMemberBadgePose(projected.position, rotation, count, width, height, focus, compact, { x: .7, y: -.8 }, 1, hover)
        for (const point of [[0, 0, 0], [pose.width / 2, pose.height / 2, MEMBER_BADGE_DEPTH / 2], ...badgeEnvelope(getMemberOrbitLayout(width, height, compact))]) {
          const actual = new Vector3(...point).multiplyScalar(pose.scale).applyEuler(new Euler(pose.pitch, pose.yaw, pose.roll)).add(new Vector3(pose.x, pose.y, pose.z)).project(camera)
          const expected = projectMemberBadgePoint(pose, point, width, height, compact)
          assert.ok(Math.abs((actual.x + 1) * width / 2 - expected.x) < 1e-7)
          assert.ok(Math.abs((1 - actual.y) * height / 2 - expected.y) < 1e-7)
          assert.ok(Math.abs(expected.x - projected.x) <= projected.width / 2 + 1e-7)
          assert.ok(Math.abs(expected.y - projected.y) <= projected.height / 2 + 1e-7)
        }
      }
    }
  }
})

test('all twelve desktop and six mobile badges fit the stage with pointer parallax and focus emphasis', () => {
  assert.equal(MEMBER_DESKTOP_SLOTS, 12)
  assert.equal(MEMBER_MOBILE_SLOTS, 6)
  for (const [width, height, compact, count] of [[1200, 450, false, 12], [980, 430, false, 12], [800, 400, false, 12], [1775, 750, false, 12], [372, 350, true, 6], [320, 280, true, 6], [760, 400, true, 6], [1190, 358, false, 12], [372, 303, true, 6], [1775, 296, false, 12]]) {
    for (let rotation = 0; rotation < 360; rotation += 5) {
      const focus = Math.round(rotation / (360 / count)) % count
      const hover = compact ? null : { position: focus, x: 1, y: -1 }
      const positions = projectMemberSlots(rotation, count, width, height, focus, compact, { x: 1, y: -1 }, 1, hover)
      assert.equal(positions.length, count)
      for (const card of positions) {
        assert.ok(card.x - card.width / 2 >= 0, `${width}×${height} left at ${rotation}`)
        assert.ok(card.x + card.width / 2 <= width, `${width}×${height} right at ${rotation}`)
        assert.ok(card.y - card.height / 2 >= 0, `${width}×${height} top at ${rotation}`)
        assert.ok(card.y + card.height / 2 <= height, `${width}×${height} bottom at ${rotation}`)
      }
    }
  }
})

test('badges remain separate from each other and the fixed CSR hub at every in-between angle', () => {
  for (const [width, height, compact, count, hubWidth, hubHeight] of [[1200, 450, false, 12, 130, 140], [980, 430, false, 12, 130, 140], [800, 400, false, 12, 130, 140], [372, 350, true, 6, 88, 106], [320, 280, true, 6, 88, 106], [1190, 358, false, 12, 130, 140], [372, 303, true, 6, 88, 106], [1775, 296, false, 12, 130, 140]]) {
    for (let rotation = 0; rotation < 360; rotation += 3) {
      const focus = Math.round(rotation / (360 / count)) % count
      const hover = compact ? null : { position: focus, x: 1, y: -1 }
      const positions = Array.from({ length: count }, (_, position) => projectedBadgeHull(
        getMemberBadgePose(position, rotation, count, width, height, focus, compact, { x: 1, y: -1 }, 1, hover),
        width, height, compact,
      ))
      const hub = [
        { x: width / 2 - hubWidth / 2, y: height / 2 - 6 - hubHeight / 2 },
        { x: width / 2 + hubWidth / 2, y: height / 2 - 6 - hubHeight / 2 },
        { x: width / 2 + hubWidth / 2, y: height / 2 - 6 + hubHeight / 2 },
        { x: width / 2 - hubWidth / 2, y: height / 2 - 6 + hubHeight / 2 },
      ]
      for (let index = 0; index < positions.length; index++) {
        const a = positions[index]
        assert.ok(polygonGap(a, hub) > 0, `Hub intersection at ${width}×${height}, ${rotation}°, slot ${index}`)
        for (let next = index + 1; next < positions.length; next++) {
          assert.ok(polygonGap(a, positions[next]) > 0, `Badge intersection at ${width}×${height}, ${rotation}°, ${index}/${next}`)
        }
      }
    }
  }
})

test('any desktop badge can hover at pointer extremes without intersecting its neighbours or the hub', () => {
  for (const [width, height] of [[800, 400], [980, 430], [1190, 358], [1775, 296]]) {
    const hub = [
      { x: width / 2 - 65, y: height / 2 - 76 }, { x: width / 2 + 65, y: height / 2 - 76 },
      { x: width / 2 + 65, y: height / 2 + 64 }, { x: width / 2 - 65, y: height / 2 + 64 },
    ]
    for (let rotation = 0; rotation < 360; rotation += 6) {
      const focus = Math.round(rotation / 30) % 12
      for (const pointer of [{ x: -1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 1, y: 1 }]) {
        const plain = Array.from({ length: 12 }, (_, position) => projectedBadgeHull(
          getMemberBadgePose(position, rotation, 12, width, height, focus, false, pointer), width, height, false,
        ))
        for (let position = 0; position < 12; position++) {
          const hover = { position, x: pointer.x, y: pointer.y }
          const hull = projectedBadgeHull(
            getMemberBadgePose(position, rotation, 12, width, height, focus, false, pointer, 1, hover), width, height, false,
          )
          const context = `${width}×${height}, ${rotation}°, hover ${position}, pointer ${pointer.x}/${pointer.y}`
          assert.ok(polygonGap(hull, hub) > 0, `hover/hub intersection: ${context}`)
          plain.forEach((other, index) => {
            if (index !== position) assert.ok(polygonGap(hull, other) > 0, `hover/neighbour ${index}: ${context}`)
          })
          const hit = projectMemberSlots(rotation, 12, width, height, focus, false, pointer, 1, hover)[position]
          assert.ok(hit.x - hit.width / 2 >= 0 && hit.x + hit.width / 2 <= width
            && hit.y - hit.height / 2 >= 0 && hit.y + hit.height / 2 <= height, `hover hit target containment: ${context}`)
        }
      }
    }
  }
})

test('front focus is larger, brighter and genuinely closer to the perspective camera', () => {
  assert.ok(MEMBER_ORBIT_TILT >= 10 * Math.PI / 180 && MEMBER_ORBIT_TILT <= 18 * Math.PI / 180)
  const front = getMemberBadgePose(0, 0, 12, 1200, 450, 0, false)
  const rear = getMemberBadgePose(6, 0, 12, 1200, 450, 0, false)
  assert.equal(front.scale, 1.25)
  assert.ok(front.z - rear.z > 4)
  assert.ok(front.opacity > rear.opacity)
  assert.ok(front.scale > rear.scale)
  const points = projectMemberSlots(0, 12, 1200, 450, 0, false)
  assert.ok(points[0].height > points[6].height * 1.35)
  assert.equal(points[0].x, 600)
  assert.ok(points[0].y > 225)
})

test('filter transitions fade and move badges away without changing the physical slot count', () => {
  const visible = projectMemberSlots(67, 12, 1200, 450, 2, false, { x: 0, y: 0 }, 1)
  const hidden = projectMemberSlots(67, 12, 1200, 450, 2, false, { x: 0, y: 0 }, 0)
  assert.equal(hidden.length, visible.length)
  hidden.forEach((position, index) => {
    assert.equal(position.opacity, 0)
    assert.ok(position.depth < visible[index].depth)
  })
  assert.ok(getMemberOrbitLayout(1200, 450, false).radiusX > getMemberOrbitLayout(372, 350, true).radiusX)
})

test('pointed-side hex badges gain surface area while retaining readable initials on small stages', () => {
  assert.equal(MEMBER_BADGE_DEPTH, .36)
  for (const [width, height] of [[372, 303], [372, 350], [320, 280]]) {
    const layout = getMemberOrbitLayout(width, height, true)
    assert.ok(layout.cardWidth >= 3.39)
    assert.ok(Math.abs(layout.cardWidth / layout.cardHeight - 1.13) < 1e-10)
    const priorRectangleArea = .75 * layout.cardHeight ** 2
    const hexArea = .75 * layout.cardWidth * layout.cardHeight
    assert.ok(Math.abs(hexArea / priorRectangleArea - 1.13) < 1e-10, 'the unchanged height gives the wider hex badge 13% more surface area')
    const positions = projectMemberSlots(0, 6, width, height, 0, true)
    assert.ok(positions.every(position => position.height >= 48), 'rear badges must retain room for initials around eleven pixels high')
  }
})

test('hover tilts only its own badge while keeping the active scale and opacity hierarchy', () => {
  const plain = getMemberBadgePose(0, 0, 12, 1190, 358, 0, false)
  const hovered = getMemberBadgePose(0, 0, 12, 1190, 358, 0, false, { x: 0, y: 0 }, 1, { position: 0, x: 1, y: -1 })
  assert.ok(hovered.z > plain.z)
  assert.ok(hovered.pitch >= 2 * Math.PI / 180 && hovered.pitch <= 4 * Math.PI / 180)
  assert.ok(hovered.yaw > plain.yaw)
  const unaffected = getMemberBadgePose(1, 0, 12, 1190, 358, 0, false)
  const other = getMemberBadgePose(1, 0, 12, 1190, 358, 0, false, { x: 0, y: 0 }, 1, { position: 0, x: 1, y: -1 })
  assert.deepEqual(other, unaffected)
  assert.equal(plain.opacity, 1)
  for (const position of [3, 4, 5, 6, 7, 8, 9]) {
    const inactive = getMemberBadgePose(position, 0, 12, 1190, 358, 0, false)
    assert.ok(inactive.opacity >= .7 && inactive.opacity <= .85)
  }
})
