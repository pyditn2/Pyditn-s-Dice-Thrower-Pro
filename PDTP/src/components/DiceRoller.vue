<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'

const containerRef = ref(null)
let scene, camera, renderer, world
let dice = null
let rigidBody = null
let animationFrameId = null

const initScene = () => {
  console.log('Initializing scene')
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(
    45,
    300 / 300,
    0.1,
    1000
  )
  
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(300, 300)
  renderer.shadowMap.enabled = true
  containerRef.value.innerHTML = ''
  containerRef.value.appendChild(renderer.domElement)
  
  // Lighting
  const mainLight = new THREE.DirectionalLight(0xffffff, 1)
  mainLight.position.set(5, 5, 5)
  scene.add(mainLight)
  
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)
  
  camera.position.set(0, 8, 12)
  camera.lookAt(0, 0, 0)
  // Initialize physics world
  world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })

  // Create ground visuals
  const groundGeometry = new THREE.PlaneGeometry(20, 20)
  const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x222222,
    side: THREE.DoubleSide
  })
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
  groundMesh.rotation.x = Math.PI / 2
  groundMesh.position.y = 0
  scene.add(groundMesh)

  // Create ground physics
  const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
  const groundRigidBody = world.createRigidBody(groundRigidBodyDesc)
  
  // Create ground collider
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.5, 10.0)
  world.createCollider(groundColliderDesc, groundRigidBody)

  console.log('Scene initialized')
}

const createDice = (type) => {
  console.log('Creating dice:', type)
  
  // Create visual mesh
  const geometry = new THREE.IcosahedronGeometry(1)
  const material = new THREE.MeshPhongMaterial({ 
    color: 0xff0000,
    shininess: 30,
  })
  
  const mesh = new THREE.Mesh(geometry, material)
  
  const startY = 4
  mesh.position.set(0, startY, 0)
  
  // Get vertices from geometry for physics shape
  const vertices = []
  const positionArray = geometry.attributes.position.array
  for (let i = 0; i < positionArray.length; i += 3) {
    vertices.push(
      positionArray[i],
      positionArray[i + 1],
      positionArray[i + 2]
    )
  }
  
  // Create rigid body
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0, startY, 0)
  
  rigidBody = world.createRigidBody(rigidBodyDesc)
  
  // Create convex hull collider using the vertices
  const colliderDesc = RAPIER.ColliderDesc.convexHull(vertices)
  if (colliderDesc) {
    colliderDesc
      .setRestitution(0.3)
      .setFriction(0.8)
  
    world.createCollider(colliderDesc, rigidBody)
  }
  
  // Add initial velocities for angled throw
  rigidBody.setLinvel(new RAPIER.Vector3(
    Math.random() * 4 - 2,
    4,
    Math.random() * 4 - 2
  ))
  
  rigidBody.setAngvel(new RAPIER.Vector3(
    Math.random() * 6 - 3,
    Math.random() * 6 - 3,
    Math.random() * 6 - 3
  ))
  
  console.log('Dice created')
  return mesh
}

const animate = () => {
  if (world && dice && rigidBody) {
    world.step()
    
    const position = rigidBody.translation()
    const rotation = rigidBody.rotation()
    
    dice.position.set(position.x, position.y, position.z)
    dice.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    
    renderer.render(scene, camera)
  }
  
  animationFrameId = requestAnimationFrame(animate)
}

const rollDice = async (diceType = 'd20', count = 1) => {
  console.log('Rolling dice:', diceType, count)
  
  if (dice) {
    scene.remove(dice)
  }
  if (rigidBody) {
    world.removeRigidBody(rigidBody)
  }

  dice = createDice(diceType)
  scene.add(dice)
  console.log('Dice added to scene')

  return new Promise((resolve) => {
    // Wait for the dice to settle
    const checkSettled = setInterval(() => {
      if (rigidBody) {
        const vel = rigidBody.linvel()
        const angVel = rigidBody.angvel()
        
        // Check if dice has essentially stopped moving
        if (Math.abs(vel.x) < 0.01 && 
            Math.abs(vel.y) < 0.01 && 
            Math.abs(vel.z) < 0.01 &&
            Math.abs(angVel.x) < 0.01 &&
            Math.abs(angVel.y) < 0.01 &&
            Math.abs(angVel.z) < 0.01) {
          clearInterval(checkSettled)
          resolve([Math.floor(Math.random() * 20) + 1])
        }
      }
    }, 100)
  })
}

onMounted(async () => {
  console.log('Component mounted')
  await RAPIER.init()
  initScene()
  animate()
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})

defineExpose({ rollDice })
</script>

<template>
  <div ref="containerRef" class="dice-container"></div>
</template>

<style scoped>
.dice-container {
  width: 300px;
  height: 300px;
  background-color: #1a1a1a;
  margin: 1rem auto;
  border-radius: 8px;
  overflow: hidden;
}
</style>