import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Path, Shape, ShapeGeometry, Vector2 } from 'three'

/** Flat top/bottom with pointed sides, matching the technical hex frame. */
export function memberHexPoints(width: number, height: number) {
  return [
    new Vector2(width / 2, 0), new Vector2(width / 4, height / 2),
    new Vector2(-width / 4, height / 2), new Vector2(-width / 2, 0),
    new Vector2(-width / 4, -height / 2), new Vector2(width / 4, -height / 2),
  ]
}

function hexShape(width: number, height: number) {
  return new Shape(memberHexPoints(width, height))
}

function hexBand(width: number, height: number, outer: number, inner: number) {
  const shape = hexShape(width * outer, height * outer)
  shape.holes.push(new Path(memberHexPoints(width * inner, height * inner).reverse()))
  return shape
}

export function createMemberBadgeGeometry(width: number, height: number, depth: number) {
  const body = new ExtrudeGeometry(hexBand(width, height, 1, .76), {
    depth, steps: 1, bevelEnabled: true, bevelSize: .035,
    bevelThickness: .024, bevelSegments: 2, curveSegments: 1,
  })
  body.translate(0, 0, -depth / 2)
  const backing = new ShapeGeometry(hexShape(width * .79, height * .79))
  const face = new ShapeGeometry(hexShape(width * .745, height * .745))
  // ShapeGeometry's world-space UVs are normalized once for undistorted print.
  const positions = face.attributes.position, uv = face.attributes.uv
  for (let index = 0; index < positions.count; index++) {
    uv.setXY(index, positions.getX(index) / (width * .745) + .5, positions.getY(index) / (height * .745) + .5)
  }
  const outerTrace = new ShapeGeometry(hexBand(width, height, .965, .941))
  const innerTrace = new ShapeGeometry(hexBand(width, height, .809, .794))
  const vertices = memberHexPoints(width, height)
  const armor = new ShapeGeometry(vertices.map((point, index) => {
    const previous = vertices[(index + 5) % 6], next = vertices[(index + 1) % 6]
    return new Shape([
      point.clone().lerp(previous, .14).multiplyScalar(.978),
      point.clone().multiplyScalar(.978),
      point.clone().lerp(next, .14).multiplyScalar(.978),
      point.clone().lerp(next, .12).multiplyScalar(.868),
      point.clone().multiplyScalar(.868),
      point.clone().lerp(previous, .12).multiplyScalar(.868),
    ])
  }))
  const traces = [
    [[-.22, .432], [.17, .432], [.21, .473], [.245, .46]],
    [[-.26, .42], [-.35, .30], [-.32, .25], [-.42, .06]],
    [[.30, .37], [.37, .23], [.35, .16], [.44, -.015]],
    [[-.435, -.025], [-.365, -.165], [-.365, -.21], [-.29, -.39]],
    [[.29, -.40], [.24, -.45], [-.16, -.45], [-.205, -.412]],
  ]
  const trackPositions: number[] = []
  traces.forEach(trace => {
    for (let index = 1; index < trace.length; index++) {
      for (const point of [trace[index - 1], trace[index]]) trackPositions.push(point[0] * width, point[1] * height, 0)
    }
  })
  const tracks = new BufferGeometry()
  tracks.setAttribute('position', new Float32BufferAttribute(trackPositions, 3))
  const nodeShapes = [[-.26, .42], [-.365, -.21], [.24, -.45]].map(([x, y]) => {
    const shape = new Shape()
    shape.absarc(x * width, y * height, .062, 0, Math.PI * 2, false)
    const hole = new Path()
    hole.absarc(x * width, y * height, .036, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    return shape
  })
  const nodes = new ShapeGeometry(nodeShapes, 8)
  return { body, backing, face, outerTrace, innerTrace, armor, tracks, nodes }
}

export type MemberBadgeGeometry = ReturnType<typeof createMemberBadgeGeometry>
