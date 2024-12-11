<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { DiceManager } from '../services/diceManager.js'
import { CameraManager } from '../services/cameraManager'
import { DICE_INITIAL_CONFIG, SETTLE_THRESHOLD } from '../constants/diceTypes'

const containerRef1 = ref(null)
const containerRef2 = ref(null)
const containerRef3 = ref(null)
const showExtraViews = ref(false)

const settledDice = ref(new Set())
const cameraTransitions = ref(new Map())

let cameraManager

let scene, cameras = [], renderers = [], world
let dice = []
let rigidBodies = []
let animationFrameId = null
const diceManager = new DiceManager()

const MAX_SUBSTEPS = 3
let lastTime = 0
let accumulator = 0

let rotationAngle = 0
const ROTATION_SPEED = 0.003
let lastSettleTime = null
const isRotating = ref(true)

const FIXED_TIME_STEP = 1/120
const GRAVITY = -25  

let previousState = new Map()
let currentState = new Map()

const showWireframes = ref(false)
const wireframeHelpers = ref([])

const setupMainLight = () => {
  const mainLight = new THREE.DirectionalLight(0xffffff, 1)
  mainLight.position.set(5, 10, 5)
  mainLight.castShadow = true

  // Configure shadow properties
  mainLight.shadow.mapSize.width = 1024
  mainLight.shadow.mapSize.height = 1024
  mainLight.shadow.camera.near = 0.5
  mainLight.shadow.camera.far = 50
  mainLight.shadow.camera.left = -10
  mainLight.shadow.camera.right = 10
  mainLight.shadow.camera.top = 10
  mainLight.shadow.camera.bottom = -10
  
  // Add these shadow bias settings
  mainLight.shadow.bias = -0.001    
  mainLight.shadow.normalBias = 0.02   
  mainLight.shadow.radius = 1.5         
  
  return mainLight
}

watch(showExtraViews, (newValue) => {
  if (newValue) {
    // Small delay to ensure DOM is updated
    setTimeout(reinitRenderers, 0)
  }
})

const reinitRenderers = () => {
  if (showExtraViews.value) {
    // Reinitialize renderer 1
    if (renderers[1]) {
      renderers[1].setSize(300, 300)
      renderers[1].shadowMap.enabled = true
      if (containerRef2.value) {
        containerRef2.value.innerHTML = ''
        containerRef2.value.appendChild(renderers[1].domElement)
      }
    }

    // Reinitialize renderer 2
    if (renderers[2]) {
      renderers[2].setSize(300, 300)
      renderers[2].shadowMap.enabled = true
      if (containerRef3.value) {
        containerRef3.value.innerHTML = ''
        containerRef3.value.appendChild(renderers[2].domElement)
      }
    }
  }
}

const updateViewMode = (showExtra) => {
  showExtraViews.value = showExtra
}

const updateDicePhysics = () => {
  rigidBodies.forEach((rigidBody, index) => {
    if (!rigidBody) return
    // If die is already settled, skip physics calculations
    if (settledDice.value.has(index)) {
      if (cameraManager) {
        cameraManager.setMode('topdown', index)
      }
      return
    }

    const position = rigidBody.translation()
    const rotation = rigidBody.rotation()
    if (dice[index]) {
      dice[index].position.set(position.x, position.y, position.z)
      dice[index].quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    }

    if (position.y < -5) { 
      rigidBody.setTranslation({ 
        x: -8, 
        y: 8 + Math.random() * 2,
        z: (index - (dice.length-1)/2) * 2.5 
      })
      rigidBody.setLinvel(new RAPIER.Vector3(
        Math.random() * 12 - 2,
        8,
        Math.random() * 6 - 3
      ))
      rigidBody.setAngvel(new RAPIER.Vector3(
        Math.random() * 15 - 7.5,
        Math.random() * 15 - 7.5,
        Math.random() * 15 - 7.5
      ))
    }
    
    // Check if die has settled
    const isSettled = isDiceSettled(rigidBody)

    if (isSettled) {
      settledDice.value.add(index)
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 })
      rigidBody.setAngvel({ x: 0, y: 0, z: 0 })
      if (cameraManager) {
        cameraManager.setMode('topdown', index)
      }
    } else if (cameraManager) {
      cameraManager.setMode('following', index)
    }
  })

  // Handle empty scene
  if (dice.length === 0 && cameraManager) {
    for (let i = 0; i < 3; i++) {
      cameraManager.setMode('overview', i)
    }
  }
}

const toggleWireframes = () => {
  showWireframes.value = !showWireframes.value
  wireframeHelpers.value.forEach(helper => {
    helper.visible = showWireframes.value
  })
}

const createGround = () => {
  createHexagonalGround()
}

const createHexagonalGround = () => {
  // Hexagon parameters
  const radius = 10        
  const topRadius = 11     
  const height = 4         
  const wallThickness = 0.5
  wireframeHelpers.value = []
  
  // Create base and top vertices
  const baseVertices = []
  const topVertices = []
  
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3
    baseVertices.push([
      radius * Math.cos(angle),
      radius * Math.sin(angle)
    ])
    topVertices.push([
      topRadius * Math.cos(angle),
      topRadius * Math.sin(angle)
    ])
  }

  // Create vertices for trimesh (triangulated hexagon)
  const vertices = []
  const indices = []
  
  // Center point
  vertices.push(0, 0, 0)
  
  // Add outer vertices
  for (let i = 0; i < 6; i++) {
    vertices.push(baseVertices[i][0], 0, baseVertices[i][1])
  }
  
  // Create triangles (fan triangulation from center)
  for (let i = 0; i < 6; i++) {
    indices.push(
      0,                    // center point
      i + 1,               // current outer vertex
      ((i + 1) % 6) + 1    // next outer vertex
    )
  }

  // Create ground collider using trimesh
  const groundColliderDesc = RAPIER.ColliderDesc.trimesh(
    new Float32Array(vertices),
    new Uint32Array(indices)
  )
  
  groundColliderDesc
    .setRestitution(0.1)
    .setFriction(1.0)

  // Create physics bodies
  const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
  const groundRigidBody = world.createRigidBody(groundRigidBodyDesc)
  world.createCollider(groundColliderDesc, groundRigidBody)

  // Create visual ground mesh
  const groundShape = new THREE.Shape()
  groundShape.moveTo(baseVertices[0][0], baseVertices[0][1])
  for (let i = 1; i < 6; i++) {
    groundShape.lineTo(baseVertices[i][0], baseVertices[i][1])
  }
  groundShape.lineTo(baseVertices[0][0], baseVertices[0][1])

  const groundGeometry = new THREE.ShapeGeometry(groundShape)
  const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x222222,
    side: THREE.DoubleSide
  })
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.position.y = -0.001
  groundMesh.receiveShadow = true
  scene.add(groundMesh)

  // Add visible helper for ground collider
  const helperGeometry = new THREE.BufferGeometry()
  helperGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  helperGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
  
  const helperMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    side: THREE.DoubleSide
  })
  const groundHelper = new THREE.Mesh(helperGeometry, helperMaterial)
  groundHelper.visible = showWireframes.value
  scene.add(groundHelper)
  wireframeHelpers.value.push(groundHelper)

  // Create walls
  for (let i = 0; i < 6; i++) {
    const nextI = (i + 1) % 6
    
    // Get vertices for current wall segment
    const baseStart = baseVertices[i]
    const baseEnd = baseVertices[nextI]
    const topStart = topVertices[i]
    const topEnd = topVertices[nextI]
    
    // Create wall geometry using both sets of vertices
    const wallVertices = new Float32Array([
      // Base vertices
      baseStart[0], 0, baseStart[1],           // bottom left
      baseEnd[0], 0, baseEnd[1],               // bottom right
      // Top vertices
      topStart[0], height, topStart[1],        // top left
      topEnd[0], height, topEnd[1]             // top right
    ])
    
    // Create triangles
    const indices = new Uint16Array([
      0, 1, 2,  // first triangle
      1, 3, 2   // second triangle
    ])
    
    const wallGeometry = new THREE.BufferGeometry()
    wallGeometry.setAttribute('position', new THREE.BufferAttribute(wallVertices, 3))
    wallGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
    wallGeometry.computeVertexNormals()
    
    const wallMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial)
    wallMesh.receiveShadow = true
    wallMesh.castShadow = true
    scene.add(wallMesh)
    
    // Create wall collider using convex hull from vertices
    const wallColliderPoints = new Float32Array([
      // Front face points
      baseStart[0], 0, baseStart[1],
      baseEnd[0], 0, baseEnd[1],
      topStart[0], height, topStart[1],
      topEnd[0], height, topEnd[1],
      // Back face points (offset by thickness)
      baseStart[0], 0, baseStart[1] + wallThickness,
      baseEnd[0], 0, baseEnd[1] + wallThickness,
      topStart[0], height, topStart[1] + wallThickness,
      topEnd[0], height, topEnd[1] + wallThickness
    ])
    
    const wallColliderDesc = RAPIER.ColliderDesc.convexHull(wallColliderPoints)
    wallColliderDesc
      .setRestitution(0.5)
      .setFriction(0.2)
    
    world.createCollider(wallColliderDesc, groundRigidBody)

    // Add visible helper for wall collider
    const wallHelperGeometry = new THREE.BufferGeometry()
    wallHelperGeometry.setAttribute('position', new THREE.BufferAttribute(wallColliderPoints, 3))
    
    // Create edges for wireframe visualization
    const indices2 = new Uint16Array([
      // Front face
      0, 1, 1, 3, 3, 2, 2, 0,
      // Back face
      4, 5, 5, 7, 7, 6, 6, 4,
      // Connecting edges
      0, 4, 1, 5, 2, 6, 3, 7
    ])
    
    wallHelperGeometry.setIndex(new THREE.BufferAttribute(indices2, 1))
    
    const wallHelperMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00
    })
    
    const wallHelper = new THREE.LineSegments(wallHelperGeometry, wallHelperMaterial)
  wallHelper.visible = showWireframes.value
  scene.add(wallHelper)
  wireframeHelpers.value.push(wallHelper)
  }
}


const initScene = () => {
  scene = new THREE.Scene()
  
  // Create cameras
  cameras = [
    new THREE.PerspectiveCamera(45, 300 / 300, 0.1, 1000),
    new THREE.PerspectiveCamera(45, 300 / 300, 0.1, 1000),
    new THREE.PerspectiveCamera(45, 300 / 300, 0.1, 1000)
  ]
  
  // Set initial camera positions
  cameras[0].position.set(0, 8, 12)    // Main view (center)
  cameras[1].position.set(-8, 8, 8)    // Left view
  cameras[2].position.set(8, 8, 8)     // Right view
  
  cameras.forEach(camera => camera.lookAt(0, 0, 0))
  
  // Create renderers
  renderers = [
    new THREE.WebGLRenderer({ antialias: true }),
    new THREE.WebGLRenderer({ antialias: true }),
    new THREE.WebGLRenderer({ antialias: true })
  ]
  
  // Attach first renderer (always visible)
  renderers.forEach(renderer => {
    renderer.setSize(300, 300)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.shadowMap.autoUpdate = true
    renderer.shadowMap.needsUpdate = true
  })

  // Always attach all renderers to containers
  if (containerRef1.value) {
    containerRef1.value.innerHTML = ''
    containerRef1.value.appendChild(renderers[0].domElement)
  }
  if (containerRef2.value) {
    containerRef2.value.innerHTML = ''
    containerRef2.value.appendChild(renderers[1].domElement)
  }
  if (containerRef3.value) {
    containerRef3.value.innerHTML = ''
    containerRef3.value.appendChild(renderers[2].domElement)
  }
  
  scene.add(setupMainLight())
  scene.add(new THREE.AmbientLight(0x404040))

  world = new RAPIER.World({ 
    x: 0, 
    y: GRAVITY,
    z: 0 
  })
  world.timestep = FIXED_TIME_STEP
  
  previousState = new Map()
  currentState = new Map()
  createGround();
}


const cleanupScene = () => {
  // Remove all existing objects
  while (scene.children.length > 0) {
    scene.remove(scene.children[0])
  }

  // Add back basic scene elements with shadows
  scene.add(setupMainLight())
  scene.add(new THREE.AmbientLight(0x404040))

  createGround()
}

const cleanupPhysics = () => {
  rigidBodies.forEach(rb => {
    if (rb && world.getRigidBody(rb.handle)) {
      world.removeRigidBody(rb)
    }
  })
  
  dice = []
  rigidBodies = []
}

const isDiceSettled = (rigidBody) => {
  const vel = rigidBody.linvel()
  const angVel = rigidBody.angvel()
  
  return Math.abs(vel.x) < SETTLE_THRESHOLD && 
         Math.abs(vel.y) < SETTLE_THRESHOLD && 
         Math.abs(vel.z) < SETTLE_THRESHOLD &&
         Math.abs(angVel.x) < SETTLE_THRESHOLD &&
         Math.abs(angVel.y) < SETTLE_THRESHOLD &&
         Math.abs(angVel.z) < SETTLE_THRESHOLD
}

const createDiceInstance = (type, index, count) => {
  try {
    const offset = {
      x: (index - (count - 1) / 2) * DICE_INITIAL_CONFIG.spacing,
      y: DICE_INITIAL_CONFIG.heightRange.min + 
         Math.random() * (DICE_INITIAL_CONFIG.heightRange.max - DICE_INITIAL_CONFIG.heightRange.min),
      z: Math.random() - 0.5
    }

    const { mesh, rigidBody } = diceManager.createDice(type, world)
    
    mesh.position.set(offset.x, offset.y, offset.z)
    rigidBody.setTranslation(offset)

    // Higher initial velocities for more dynamic movement
    const linvel = new RAPIER.Vector3(
      Math.random() * 20 - 10,  
      15,                       
      Math.random() * 20 - 10 
    )
    rigidBody.setLinvel(linvel)

    // Higher angular velocities for more spinning
    const angvel = new RAPIER.Vector3(
      Math.random() * 30 - 15,  
      Math.random() * 30 - 15,
      Math.random() * 30 - 15
    )
    rigidBody.setAngvel(angvel)

    return { mesh, rigidBody }
  } catch (error) {
    console.error('Error creating dice instance:', error)
    throw new Error('Failed to create dice instance')
  }
}

const resetCamera = () => {
  // Reset rotation and animation state
  rotationAngle = 0
  isRotating.value = true
  
  // Reset camera positions
  cameras.forEach((camera, index) => {
    const defaultPositions = [
      new THREE.Vector3(0, 8, 12),    // Main view
      new THREE.Vector3(-8, 8, 8),    // Left view
      new THREE.Vector3(8, 8, 8)      // Right view
    ];
    camera.position.copy(defaultPositions[index]);
    camera.lookAt(0, 0, 0);
  });

  // Reset camera manager if it exists
  if (cameraManager) {
    cameraManager.reset();
    for (let i = 0; i < 3; i++) {
      cameraManager.setMode('overview', i);
    }
  }
}

const rollDice = async (type, count) => {
  try {
    // Reset state
    isRotating.value = false
    lastSettleTime = null
    settledDice.value.clear()
    
    // Clean up existing scene and physics
    cleanupScene()
    cleanupPhysics()

    if (cameraManager) {
      cameraManager.reset()
    }

    // Create new dice instances
    for (let i = 0; i < count; i++) {
      const { mesh, rigidBody } = createDiceInstance(type, i, count)
      
      scene.add(mesh)
      dice.push(mesh)
      rigidBodies.push(rigidBody)
    }

    // Wait for dice to settle and return results
    return new Promise((resolve, reject) => {
      const checkSettled = setInterval(() => {
        try {
          const allSettled = rigidBodies.every(isDiceSettled)
          
          if (allSettled) {
            clearInterval(checkSettled)
            const results = dice.map(d => diceManager.getUpFacingNumber(d))
            resolve(results)
          }
        } catch (error) {
          clearInterval(checkSettled)
          reject(new Error('Error checking dice settlement: ' + error.message))
        }
      }, 100)
    })
  } catch (error) {
    console.error('Error in rollDice:', error)
    throw new Error('Failed to roll dice: ' + error.message)
  }
}


const animate = (currentTime) => {
  animationFrameId = requestAnimationFrame(animate)
  
  if (lastTime === 0) {
    lastTime = currentTime
    return
  }

  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1)
  lastTime = currentTime
  
  // Store previous state before physics step
  rigidBodies.forEach((rb, index) => {
    if (rb) {
      previousState.set(index, {
        position: rb.translation(),
        rotation: rb.rotation()
      })
    }
  })
  
  // Fixed timestep physics update
  accumulator += deltaTime
  while (accumulator >= FIXED_TIME_STEP) {
    world.step()
    accumulator -= FIXED_TIME_STEP
  }

  // Store current state after physics
  rigidBodies.forEach((rb, index) => {
    if (rb) {
      currentState.set(index, {
        position: rb.translation(),
        rotation: rb.rotation()
      })
    }
  })

  // Calculate interpolation alpha
  const alpha = accumulator / FIXED_TIME_STEP

  // Interpolate visual state
  rigidBodies.forEach((rb, index) => {
    if (!rb) return
    
    const previous = previousState.get(index)
    const current = currentState.get(index)
    
    if (previous && current && dice[index]) {
      // Interpolate position
      dice[index].position.lerpVectors(
        new THREE.Vector3(previous.position.x, previous.position.y, previous.position.z),
        new THREE.Vector3(current.position.x, current.position.y, current.position.z),
        alpha
      )
      
      // Interpolate rotation
      const prevQuat = new THREE.Quaternion(
        previous.rotation.x, previous.rotation.y, 
        previous.rotation.z, previous.rotation.w
      )
      const currQuat = new THREE.Quaternion(
        current.rotation.x, current.rotation.y, 
        current.rotation.z, current.rotation.w
      )
      dice[index].quaternion.slerpQuaternions(prevQuat, currQuat, alpha)
    }
  })
  
  // Time-based camera rotation (independent of frame rate)
  rotationAngle += ROTATION_SPEED * deltaTime
  
  updateDicePhysics()
  
  if (dice.length === 0) {
    for (let i = 0; i < 3; i++) {
      cameraManager.setMode('overview', i)
    }
  } else if (!rigidBodies.some(rb => isDiceSettled(rb))) {
    cameraManager.setMode('following')
  }
  
  cameraManager.update(dice, settledDice.value, rotationAngle)
  
  renderers.forEach((renderer, index) => {
    if (index === 0 || (showExtraViews.value && index < dice.length)) {
      renderer.render(scene, cameraManager.getCameras()[index])
    }
  })
}

onMounted(async () => {
  try {
    await RAPIER.init()
    initScene()
    cameraManager = new CameraManager(scene, 300, 300)
    lastTime = 0
    accumulator = 0
    animate(0)

    // Add keyboard event listener
    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'w') {
        toggleWireframes()
      }
    })
  } catch (error) {
    console.error('Error in mounted hook:', error)
  }
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  // Remove keyboard event listener
  window.removeEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'w') {
      toggleWireframes()
    }
  })
})

defineExpose({ 
  rollDice,
  resetCamera,
  updateViewMode
})
</script>

<template>
  <div class="dice-views-container">
    <div class="dice-views">
      <div ref="containerRef1" class="dice-container"></div>
      <div v-show="showExtraViews" ref="containerRef2" class="dice-container"></div>
      <div v-show="showExtraViews" ref="containerRef3" class="dice-container"></div>
    </div>
  </div>
</template>

<style scoped>
.dice-views-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.dice-views {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  justify-content: center;
}

.dice-container {
  width: 300px;
  height: 300px;
  background-color: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

@media (max-width: 960px) {
  .dice-views {
    flex-direction: column;
  }
}
.dice-label {
  text-align: center;
  margin-top: 0.5rem;
  color: #42b983;
  font-weight: bold;
  font-size: 0.9rem;
}
</style>