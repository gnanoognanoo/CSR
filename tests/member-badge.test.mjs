import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'

const filename = new URL('../src/members/badge-geometry.ts', import.meta.url)
const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const exports = {}
vm.runInNewContext(code, {
  exports, module: { exports },
  require: name => {
    assert.equal(name, 'three')
    return THREE
  },
}, { filename: filename.pathname })
const { memberHexPoints, createMemberBadgeGeometry } = exports
const close = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`)
const dimensions = [[3.4 * 1.13, 3.4], [3.2 * 1.13, 3.2], [3 * 1.13, 3], [3.05 * 1.13, 3.05]]
const depth = .36
const eachVertex = (geometry, callback) => {
  const positions = geometry.attributes.position
  for (let index = 0; index < positions.count; index++) callback(positions.getX(index), positions.getY(index), positions.getZ(index), index)
}
// The six supporting half-planes for the affine technical hexagon.
const hexGauge = (x, y, width, height) => Math.max(2 * Math.abs(y) / height, 2 * Math.abs(x) / width + Math.abs(y) / height)
const maxGauge = (geometry, width, height) => {
  let result = 0
  eachVertex(geometry, (x, y) => { result = Math.max(result, hexGauge(x, y, width, height)) })
  return result
}
const dispose = geometry => Object.values(geometry).forEach(layer => layer.dispose())

test('the member frame is a real six-sided extruded hexagon with an open six-sided inner aperture', () => {
  for (const [width, height] of dimensions) {
    const points = memberHexPoints(width, height)
    assert.equal(points.length, 6)
    assert.equal(new Set(points.map(point => `${point.x},${point.y}`)).size, 6)
    let horizontalEdges = 0, signedArea = 0
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length]
      if (Math.abs(point.y - next.y) < 1e-9) horizontalEdges++
      signedArea += point.x * next.y - next.x * point.y
      close(hexGauge(point.x, point.y, width, height), 1)
    })
    assert.equal(horizontalEdges, 2, 'the technical hex needs flat top and bottom edges')
    assert.ok(signedArea > 0, 'the outer outline should wind counterclockwise')
    close(signedArea / 2, width * height * .75)
    const geometry = createMemberBadgeGeometry(width, height, depth)
    try {
      assert.equal(geometry.body.type, 'ExtrudeGeometry')
      close(geometry.body.parameters.options.depth, depth)
      assert.equal(geometry.body.parameters.options.bevelEnabled, true)
      assert.ok(geometry.body.parameters.options.bevelSegments >= 2)
      const shape = geometry.body.parameters.shapes
      assert.equal(shape.holes.length, 1)
      // Three closes array-based Shape outlines implicitly when triangulating;
      // six unique perimeter points describe six actual polygon edges.
      assert.equal(new Set(shape.getPoints().map(point => `${point.x},${point.y}`)).size, 6)
      assert.equal(new Set(shape.holes[0].getPoints().map(point => `${point.x},${point.y}`)).size, 6)
      assert.ok(geometry.body.groups.some(group => group.materialIndex === 0))
      assert.ok(geometry.body.groups.some(group => group.materialIndex === 1), 'front and metal sidewall need separate material groups')
      const zLayers = new Set()
      eachVertex(geometry.body, (x, y, z) => {
        assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z))
        assert.ok(Math.abs(x) <= width / 2 + .045, 'beveled corners must fit the shared HTML hit-target guard')
        assert.ok(Math.abs(y) <= height / 2 + .045, 'vertical bevels must fit the shared HTML hit-target guard')
        assert.ok(Math.abs(z) <= depth / 2 + .024 + 1e-6)
        zLayers.add(z.toFixed(5))
      })
      assert.ok(zLayers.size > 2, 'the geometry must contain actual bevel/depth layers rather than a flat image plane')
      geometry.body.computeBoundingBox()
      close(geometry.body.boundingBox.max.z - geometry.body.boundingBox.min.z, depth + .048)
    } finally { dispose(geometry) }
  }
})

test('all badge layers nest cleanly and every technical detail stays inside the six-edge silhouette', () => {
  for (const [width, height] of dimensions) {
    const geometry = createMemberBadgeGeometry(width, height, depth)
    try {
      const gauges = Object.fromEntries(Object.entries(geometry).filter(([name]) => name !== 'body').map(([name, layer]) => [name, maxGauge(layer, width, height)]))
      assert.ok(gauges.face < .76, 'the print surface must fit inside the body aperture')
      assert.ok(gauges.backing > .76 && gauges.backing < gauges.innerTrace, 'the backing must cover the aperture without escaping the inner trace')
      assert.ok(gauges.innerTrace < gauges.outerTrace && gauges.outerTrace < gauges.armor)
      for (const [name, layer] of Object.entries(geometry)) {
        assert.equal(layer.isBufferGeometry, true, `${name} must be native geometry`)
        if (name === 'body') continue
        eachVertex(layer, (x, y, z, index) => {
          assert.ok(hexGauge(x, y, width, height) <= 1 + 1e-6,
            `${name} vertex ${index} escapes the ${width}×${height} hex silhouette at ${x},${y}`)
          close(z, 0)
        })
      }
      const totalVertices = Object.values(geometry).reduce((sum, layer) => sum + layer.attributes.position.count, 0)
      assert.ok(totalVertices < 1500, 'each badge should remain a compact mesh suitable for twelve simultaneous slots')
    } finally { dispose(geometry) }
  }
})

test('the inner print has normalized UVs and preserves the technical hex print aspect ratio', () => {
  for (const [width, height] of dimensions) {
    const geometry = createMemberBadgeGeometry(width, height, depth)
    try {
      const positions = geometry.face.attributes.position, uv = geometry.face.attributes.uv
      assert.equal(positions.count, uv.count)
      let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity
      eachVertex(geometry.face, (x, y, _z, index) => {
        const u = uv.getX(index), v = uv.getY(index)
        assert.ok(u >= -1e-6 && u <= 1 + 1e-6)
        assert.ok(v >= -1e-6 && v <= 1 + 1e-6)
        close((u - .5) * width * .745, x)
        close((v - .5) * height * .745, y)
        minU = Math.min(minU, u); maxU = Math.max(maxU, u)
        minV = Math.min(minV, v); maxV = Math.max(maxV, v)
      })
      close(minU, 0); close(maxU, 1); close(minV, 0); close(maxV, 1)
      // The generated 904×800 identity print should have equal world units
      // per source pixel along both axes rather than stretching its lettering.
      close(width * .745 / 904, height * .745 / 800)
      assert.equal(geometry.face.type, 'ShapeGeometry', 'the hex print mask must remain a geometric silhouette')
    } finally { dispose(geometry) }
  }
})
