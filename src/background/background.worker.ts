/**
 * Animated background: a slowly turning ring of shiny icosahedra and cubes, rendered on an
 * OffscreenCanvas so it never blocks the dice.
 */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export type BackgroundMessage =
  | { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; colors: Colors }
  | { type: 'resize'; width: number; height: number }
  | { type: 'colors'; colors: Colors }
  | { type: 'animate'; value: boolean }

interface Colors {
  icosahedron: string
  cube: string
}

const SHAPE_COUNT = 40
const RING_RADIUS = 120
const RING_SPEED = (0.005 / 2) * Math.PI * 2
const SPIN = 0.0003

let renderer: THREE.WebGLRenderer | null = null
let camera: THREE.PerspectiveCamera | null = null
const scene = new THREE.Scene()
const ring = new THREE.Group()
const shapes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>[] = []
const timer = new THREE.Timer()
let animating = false

function init(message: Extract<BackgroundMessage, { type: 'init' }>) {
  renderer = new THREE.WebGLRenderer({ canvas: message.canvas, antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0)
  camera = new THREE.PerspectiveCamera(10, 1, 0.1, 2000)
  camera.position.set(0, -30, 600)
  resize(message.width, message.height)

  // One reflection environment instead of a spotlight per shape (the old setup ran at single-digit
  // frame rates and slowed down the dice).
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  const front = new THREE.SpotLight(0xffffff, 100, 1500, Math.PI / 4, 0.2, 0.5)
  front.position.set(0, 20, 600)
  front.target.position.set(0, 60, 0)
  const key = new THREE.DirectionalLight(0xffffff, 2)
  key.position.set(400, 400, 200)
  scene.add(front, front.target, key, new THREE.AmbientLight(0xffffff, 1.5))

  ring.position.y = 60
  scene.add(ring)
  const icosahedron = new THREE.IcosahedronGeometry(4)
  const cube = new THREE.BoxGeometry(6, 6, 6)
  for (let i = 0; i < SHAPE_COUNT; i++) {
    const material = new THREE.MeshPhysicalMaterial({
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.01,
    })
    const mesh = new THREE.Mesh(i % 2 === 0 ? icosahedron : cube, material)
    const angle = (i / SHAPE_COUNT) * Math.PI * 2
    mesh.position.set(Math.cos(angle) * RING_RADIUS, Math.sin(angle) * RING_RADIUS, 0)
    mesh.userData.spin = new THREE.Vector3(
      (Math.random() - 0.5) * SPIN,
      (Math.random() - 0.5) * SPIN,
      (Math.random() - 0.5) * SPIN,
    )
    ring.add(mesh)
    shapes.push(mesh)
  }
  setColors(message.colors)
}

function resize(width: number, height: number) {
  if (!renderer || !camera) return
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  if (!animating) renderer.render(scene, camera)
}

function setColors(colors: Colors) {
  shapes.forEach((shape, i) =>
    shape.material.color.set(i % 2 === 0 ? colors.icosahedron : colors.cube),
  )
}

function frame() {
  if (!animating || !renderer || !camera) return
  timer.update()
  const delta = timer.getDelta()
  ring.rotation.z += RING_SPEED * delta
  for (const shape of shapes) {
    const spin = shape.userData.spin as THREE.Vector3
    shape.rotation.x += spin.x
    shape.rotation.y += spin.y
    shape.rotation.z += spin.z
  }
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

self.onmessage = (event: MessageEvent<BackgroundMessage>) => {
  try {
    handle(event.data)
  } catch (error) {
    self.postMessage({ type: 'error', message: String(error) })
  }
}

function handle(message: BackgroundMessage) {
  switch (message.type) {
    case 'init':
      init(message)
      break
    case 'resize':
      resize(message.width, message.height)
      break
    case 'colors':
      setColors(message.colors)
      break
    case 'animate':
      animating = message.value
      if (animating) {
        timer.update()
        requestAnimationFrame(frame)
      }
      break
  }
}
