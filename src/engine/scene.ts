import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { BOWL, TABLE_MODEL } from './constants'

export function addLights(scene: THREE.Scene): void {
  const main = new THREE.DirectionalLight(0xffffff, 1)
  main.position.set(5, 10, 5)
  main.castShadow = true
  main.shadow.mapSize.set(2048, 2048)
  Object.assign(main.shadow.camera, {
    near: 0.1,
    far: 50,
    left: -12,
    right: 12,
    top: 12,
    bottom: -12,
  })
  main.shadow.bias = -0.0001
  scene.add(main)
  scene.add(new THREE.AmbientLight(0x404040))

  const purple = new THREE.PointLight(0x9370db, 0.5, 100)
  purple.position.set(0, 20, 0)
  scene.add(purple)
}

/** Procedural starry night sky used as the scene background. */
export function createStarrySky(): THREE.Texture {
  const width = 2048
  const height = 1024
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#010102'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'white'
  for (let i = 0; i < 3000; i++) {
    ctx.globalAlpha = 0.4 + Math.random() * 0.6
    ctx.beginPath()
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      0.4 + Math.random() * 0.4,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.globalAlpha = 1
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const r = 0.8 + Math.random() * 0.6
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3)
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)')
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, r * 3, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function feltMaterial(): THREE.MeshStandardMaterial {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = BOWL.feltColor
  ctx.fillRect(0, 0, size, size)
  const image = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < image.data.length; i += 4) {
    const noise = Math.random() * 15 - 7.5
    for (let c = 0; c < 3; c++)
      image.data[i + c] = Math.max(0, Math.min(255, image.data[i + c]! + noise))
  }
  ctx.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  texture.colorSpace = THREE.SRGBColorSpace
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide,
  })
}

/** Hexagonal felt bowl: visible meshes plus one fixed physics body with floor and wall colliders. */
export function createBowl(scene: THREE.Scene, world: RAPIER.World): void {
  const corner = (radius: number, i: number) => {
    const angle = (i * Math.PI) / 3
    return new THREE.Vector2(radius * Math.cos(angle), radius * Math.sin(angle))
  }
  const base = Array.from({ length: 6 }, (_, i) => corner(BOWL.floorRadius, i))
  const top = Array.from({ length: 6 }, (_, i) => corner(BOWL.topRadius, i))
  const felt = feltMaterial()
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())

  // Floor: a triangle fan around the centre.
  const floorVertices = [0, 0, 0, ...base.flatMap((v) => [v.x, 0, v.y])]
  const floorIndices = base.flatMap((_, i) => [0, i + 1, ((i + 1) % 6) + 1])
  world.createCollider(
    RAPIER.ColliderDesc.trimesh(new Float32Array(floorVertices), new Uint32Array(floorIndices))
      .setRestitution(BOWL.floor.restitution)
      .setFriction(BOWL.floor.friction),
    body,
  )
  const floorMesh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(base)), felt)
  floorMesh.rotation.x = -Math.PI / 2
  floorMesh.position.y = -0.001
  floorMesh.receiveShadow = true
  scene.add(floorMesh)

  // Walls: sloped quads, thickened outwards along each wall's horizontal normal.
  const wallMaterial = felt.clone()
  wallMaterial.transparent = true
  wallMaterial.opacity = BOWL.wall.opacity
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6
    const quad = [
      [base[i]!.x, 0, base[i]!.y],
      [base[j]!.x, 0, base[j]!.y],
      [top[i]!.x, BOWL.wallHeight, top[i]!.y],
      [top[j]!.x, BOWL.wallHeight, top[j]!.y],
    ] as const
    const mid = base[i]!.clone().add(base[j]!).normalize().multiplyScalar(BOWL.wallThickness)
    const hull = new Float32Array(quad.flatMap(([x, y, z]) => [x, y, z, x + mid.x, y, z + mid.y]))
    world.createCollider(
      RAPIER.ColliderDesc.convexHull(hull)!
        .setRestitution(BOWL.wall.restitution)
        .setFriction(BOWL.wall.friction),
      body,
    )

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(quad.flat(), 3))
    geometry.setIndex([0, 1, 2, 1, 3, 2])
    geometry.computeVertexNormals()
    const wall = new THREE.Mesh(geometry, wallMaterial)
    wall.receiveShadow = true
    wall.castShadow = true
    scene.add(wall)
  }
}

/**
 * Loads the decorative table in the background; the scene works without it. The model is
 * meshopt-compressed with WebP textures (2.6 MB instead of the original 29 MB).
 */
export function loadTable(scene: THREE.Scene, baseUrl: string): void {
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(
    baseUrl + TABLE_MODEL.url,
    (gltf) => {
      const table = gltf.scene
      table.position.set(...TABLE_MODEL.position)
      table.scale.setScalar(TABLE_MODEL.scale)
      table.rotation.y = TABLE_MODEL.rotationY
      table.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      scene.add(table)
    },
    undefined,
    (error) => console.warn('Table model could not be loaded', error),
  )
}
