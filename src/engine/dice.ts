import * as THREE from 'three'

import type { DieType } from './types'

/** A possible result: the die shows `value` when `direction` (local space) points up. */
export interface DieFace {
  value: number
  direction: THREE.Vector3
}

interface LabelSpec {
  value: number
  position: THREE.Vector3
  normal: THREE.Vector3
  /** Direction the top of the number points to, in the face plane. */
  up: THREE.Vector3
  size: number
}

export interface DieModel {
  geometry: THREE.BufferGeometry
  faces: DieFace[]
  labels: LabelSpec[]
  /** Hull points for the physics collider. */
  hullPoints: Float32Array
}

/** W20 face numbers in `IcosahedronGeometry` face order, as on the old app's dice. */
const D20_LAYOUT = [20, 8, 14, 2, 16, 10, 12, 4, 6, 18, 19, 7, 13, 1, 15, 11, 3, 17, 5, 9]

const LABEL_OFFSET = 0.005

interface Polygon {
  normal: THREE.Vector3
  vertices: THREE.Vector3[]
  center: THREE.Vector3
}

/** Groups the triangles of a convex geometry into its flat faces, in order of appearance. */
function polygons(geometry: THREE.BufferGeometry): Polygon[] {
  const pos = geometry.getAttribute('position')
  const result: Polygon[] = []
  for (let i = 0; i < pos.count; i += 3) {
    const tri = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, i + k))
    const [a, b, c] = tri as [THREE.Vector3, THREE.Vector3, THREE.Vector3]
    const normal = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize()
    let polygon = result.find((p) => p.normal.dot(normal) > 0.999)
    if (!polygon) {
      polygon = { normal, vertices: [], center: new THREE.Vector3() }
      result.push(polygon)
    }
    for (const v of tri) {
      if (!polygon.vertices.some((w) => w.distanceToSquared(v) < 1e-8)) polygon.vertices.push(v)
    }
  }
  for (const p of result) {
    p.vertices.forEach((v) => p.center.add(v))
    p.center.divideScalar(p.vertices.length)
  }
  return result
}

/** Numbers faces so that opposite faces add up to sides + 1. */
function numberOpposite(polys: Polygon[]): number[] {
  const values = Array.from({ length: polys.length }, () => 0)
  let next = 1
  polys.forEach((p, i) => {
    if (values[i]) return
    const opposite = polys.findIndex(
      (q, j) => j !== i && !values[j] && q.normal.dot(p.normal) < -0.999,
    )
    values[i] = next
    if (opposite >= 0) values[opposite] = polys.length + 1 - next
    next++
  })
  return values
}

/** Text direction on a face: world-up projected onto the face (or −Z for horizontal faces). */
function defaultUp(normal: THREE.Vector3): THREE.Vector3 {
  const up =
    Math.abs(normal.y) > 0.9
      ? new THREE.Vector3(0, 0, -Math.sign(normal.y))
      : new THREE.Vector3(0, 1, 0)
  return up.sub(normal.clone().multiplyScalar(up.dot(normal))).normalize()
}

function faceNumbered(
  geometry: THREE.BufferGeometry,
  values: (polys: Polygon[]) => number[],
  size: number,
  upFor = (p: Polygon) => defaultUp(p.normal),
): DieModel {
  const polys = polygons(geometry)
  const numbers = values(polys)
  return {
    geometry,
    faces: polys.map((p, i) => ({ value: numbers[i]!, direction: p.normal })),
    labels: polys.map((p, i) => ({
      value: numbers[i]!,
      position: p.center.clone().addScaledVector(p.normal, LABEL_OFFSET),
      normal: p.normal,
      up: upFor(p),
      size,
    })),
    hullPoints: new Float32Array(geometry.getAttribute('position').array),
  }
}

/** W6 numbering of the old app: +Y 6, +X 5, +Z 4, −Z 3, −X 2, −Y 1. */
function d6Values(polys: Polygon[]): number[] {
  return polys.map(({ normal: n }) => {
    if (n.y > 0.5) return 6
    if (n.y < -0.5) return 1
    if (n.x > 0.5) return 5
    if (n.x < -0.5) return 2
    return n.z > 0 ? 4 : 3
  })
}

/** Pentagonal trapezohedron: ten kite faces, apexes on the Y axis. */
function d10Geometry(): THREE.BufferGeometry {
  const apex = 1
  // Ring height that makes each kite planar: h = H · (1 − cos 36°) / (1 + cos 36°).
  const cos36 = Math.cos(Math.PI / 5)
  const h = (apex * (1 - cos36)) / (1 + cos36)
  const ring = Array.from({ length: 10 }, (_, k) => {
    const angle = (k * Math.PI) / 5
    return new THREE.Vector3(Math.cos(angle), k % 2 === 0 ? h : -h, Math.sin(angle))
  })
  const top = new THREE.Vector3(0, apex, 0)
  const bottom = new THREE.Vector3(0, -apex, 0)
  const at = (k: number) => ring[((k % 10) + 10) % 10]!

  const triangles: THREE.Vector3[][] = []
  for (let j = 0; j < 5; j++) {
    const u = 2 * j
    triangles.push([top, at(u), at(u + 1)], [top, at(u + 1), at(u + 2)])
    triangles.push([bottom, at(u + 1), at(u + 2)], [bottom, at(u + 2), at(u + 3)])
  }
  const positions: number[] = []
  for (const tri of triangles) {
    const [a, b, c] = tri as [THREE.Vector3, THREE.Vector3, THREE.Vector3]
    const normal = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a))
    const centroid = a.clone().add(b).add(c)
    const ordered = normal.dot(centroid) > 0 ? [a, b, c] : [a, c, b]
    for (const v of ordered) positions.push(v.x, v.y, v.z)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

/** W4: numbers sit at the corners; the result is the number at the top corner. */
function buildD4(): DieModel {
  const geometry = new THREE.TetrahedronGeometry(1.2)
  const polys = polygons(geometry)
  const corners: THREE.Vector3[] = []
  for (const p of polys) {
    for (const v of p.vertices)
      if (!corners.some((c) => c.distanceToSquared(v) < 1e-8)) corners.push(v)
  }
  const valueOf = (v: THREE.Vector3) => corners.findIndex((c) => c.distanceToSquared(v) < 1e-8) + 1
  const labels = polys.flatMap((p) =>
    p.vertices.map((v) => ({
      value: valueOf(v),
      position: p.center.clone().lerp(v, 0.5).addScaledVector(p.normal, LABEL_OFFSET),
      normal: p.normal,
      up: v.clone().sub(p.center).normalize(),
      size: 0.55,
    })),
  )
  return {
    geometry,
    faces: corners.map((c, i) => ({ value: i + 1, direction: c.clone().normalize() })),
    labels,
    hullPoints: new Float32Array(geometry.getAttribute('position').array),
  }
}

function build(type: DieType): DieModel {
  switch (type) {
    case 'd4':
      return buildD4()
    case 'd6':
      return faceNumbered(new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), d6Values, 0.72)
    case 'd8':
      return faceNumbered(new THREE.OctahedronGeometry(1), numberOpposite, 0.55)
    case 'd10':
      // Numbers point towards the kite's tip (the apex), as on real W10s.
      return faceNumbered(d10Geometry(), numberOpposite, 0.5, (p) => {
        const tip = p.vertices.reduce((far, v) =>
          v.distanceToSquared(p.center) > far.distanceToSquared(p.center) ? v : far,
        )
        return tip.clone().sub(p.center).projectOnPlane(p.normal).normalize()
      })
    case 'd12':
      return faceNumbered(new THREE.DodecahedronGeometry(1), numberOpposite, 0.6)
    case 'd20':
      return faceNumbered(new THREE.IcosahedronGeometry(1), () => D20_LAYOUT, 0.6)
  }
}

const models = new Map<DieType, DieModel>()

export function dieModel(type: DieType): DieModel {
  let model = models.get(type)
  if (!model) {
    model = build(type)
    models.set(type, model)
  }
  return model
}

// --- labels --------------------------------------------------------------------------------------

const labelTextures = new Map<string, THREE.CanvasTexture>()
const labelGeometries = new Map<number, THREE.PlaneGeometry>()

/** Engraved-looking number on a transparent background, optionally underlined (6/9). */
function labelTexture(value: number, underline: boolean): THREE.CanvasTexture {
  const key = `${value}${underline ? '_' : ''}`
  const cached = labelTextures.get(key)
  if (cached) return cached

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const text = String(value)
  const center = size / 2
  let fontSize = Math.floor(size * 0.6)
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`
  const maxWidth = size * 0.85
  if (ctx.measureText(text).width > maxWidth) {
    fontSize = Math.floor((fontSize * maxWidth) / ctx.measureText(text).width)
    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillText(text, center + 6, center + 6)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fillText(text, center - 3, center - 3)
  ctx.fillStyle = 'rgba(225, 225, 225, 0.95)'
  ctx.fillText(text, center - 1, center - 1)

  if (underline) {
    const width = ctx.measureText(text).width * 0.7
    ctx.fillRect(center - width / 2, center + fontSize * 0.45, width, fontSize * 0.08)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  labelTextures.set(key, texture)
  return texture
}

function labelMesh(label: LabelSpec, underline: boolean): THREE.Mesh {
  let geometry = labelGeometries.get(label.size)
  if (!geometry) {
    geometry = new THREE.PlaneGeometry(label.size, label.size)
    labelGeometries.set(label.size, geometry)
  }
  const material = new THREE.MeshPhongMaterial({
    map: labelTexture(label.value, underline),
    transparent: true,
    depthWrite: false,
    shininess: 0,
    emissive: new THREE.Color(0x333333),
    emissiveIntensity: 0.2,
  })
  const mesh = new THREE.Mesh(geometry, material)
  const right = new THREE.Vector3().crossVectors(label.up, label.normal).normalize()
  mesh.setRotationFromMatrix(new THREE.Matrix4().makeBasis(right, label.up, label.normal))
  mesh.position.copy(label.position)
  return mesh
}

/** Creates the visible die. Dispose with `disposeDieMesh`. */
export function createDieMesh(type: DieType, color: string): THREE.Mesh {
  const model = dieModel(type)
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(color),
    shininess: 30,
    flatShading: type !== 'd6',
  })
  const mesh = new THREE.Mesh(model.geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  // 6 and 9 are ambiguous on dice that have both.
  const hasSixAndNine = model.faces.length >= 9
  for (const label of model.labels) {
    const underline = hasSixAndNine && (label.value === 6 || label.value === 9)
    mesh.add(labelMesh(label, underline))
  }
  return mesh
}

export function disposeDieMesh(mesh: THREE.Mesh): void {
  ;(mesh.material as THREE.Material).dispose()
  for (const child of mesh.children) {
    if (child instanceof THREE.Mesh) (child.material as THREE.Material).dispose()
  }
  mesh.removeFromParent()
}

/** The result showing on top, and how flat the die lies (1 = perfectly flat). */
export function readTopFace(
  type: DieType,
  rotation: THREE.Quaternion,
): { value: number; flatness: number } {
  const worldDirection = new THREE.Vector3()
  let best = { value: 0, flatness: -Infinity }
  for (const face of dieModel(type).faces) {
    const up = worldDirection.copy(face.direction).applyQuaternion(rotation).y
    if (up > best.flatness) best = { value: face.value, flatness: up }
  }
  return best
}
