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

let rotationAngle = 0
const ROTATION_SPEED = 0.003
let lastSettleTime = null
const SETTLE_DISPLAY_DURATION = 5000 // 5 seconds in milliseconds
const isRotating = ref(true)


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
      // Ensure camera is in correct mode for settled dice
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

const createGround = () => {
  // Base ground
  const groundGeometry = new THREE.PlaneGeometry(20, 20)
  const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x222222,
    side: THREE.DoubleSide
  })
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
  groundMesh.rotation.x = Math.PI / 2
  groundMesh.position.y = 0
  scene.add(groundMesh)

  // Create walls
  const wallHeight = 4;
  const walls = [
    { pos: [10, wallHeight/2, 0], scale: [0.5, wallHeight, 20], rot: [0, 0, 0] },    // Right wall
    { pos: [-10, wallHeight/2, 0], scale: [0.5, wallHeight, 20], rot: [0, 0, 0] },   // Left wall
    { pos: [0, wallHeight/2, 10], scale: [20, wallHeight, 0.5], rot: [0, 0, 0] },    // Back wall
    { pos: [0, wallHeight/2, -10], scale: [20, wallHeight, 0.5], rot: [0, 0, 0] },   // Front wall
  ];

  walls.forEach(wall => {
    const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    
    wallMesh.position.set(...wall.pos);
    wallMesh.scale.set(...wall.scale);
    wallMesh.rotation.set(...wall.rot);
    
    scene.add(wallMesh);
  });

  // Physics bodies
  const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
  const groundRigidBody = world.createRigidBody(groundRigidBodyDesc);
  
  // Ground collider
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.5, 10.0);
  groundColliderDesc
    .setRestitution(0.8)   
    .setFriction(0.8);
  world.createCollider(groundColliderDesc, groundRigidBody);

  // Wall colliders
  const wallColliders = [
    { pos: [10, wallHeight/2, 0], half: [0.25, wallHeight/2, 10] },    // Right wall
    { pos: [-10, wallHeight/2, 0], half: [0.25, wallHeight/2, 10] },   // Left wall
    { pos: [0, wallHeight/2, 10], half: [10, wallHeight/2, 0.25] },    // Back wall
    { pos: [0, wallHeight/2, -10], half: [10, wallHeight/2, 0.25] },   // Front wall
  ];

  wallColliders.forEach(wall => {
  const wallColliderDesc = RAPIER.ColliderDesc.cuboid(...wall.half);
  wallColliderDesc.translation = new RAPIER.Vector3(...wall.pos);
  wallColliderDesc
    .setRestitution(1)
    .setFriction(0.2);
  world.createCollider(wallColliderDesc, groundRigidBody);
});
};



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
    new THREE.WebGLRenderer({ antialias: false }),
    new THREE.WebGLRenderer({ antialias: false }),
    new THREE.WebGLRenderer({ antialias: false })
  ]
  
  // Attach first renderer (always visible)
  renderers.forEach(renderer => {
    renderer.setSize(300, 300)
    renderer.shadowMap.enabled = true
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
  
  const mainLight = new THREE.DirectionalLight(0xffffff, 1)
  mainLight.position.set(5, 5, 5)
  scene.add(mainLight)
  
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

  world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  createGround();
}


const cleanupScene = () => {
  // Remove all existing objects
  while (scene.children.length > 0) {
    scene.remove(scene.children[0])
  }

  // Add back basic scene elements
  const mainLight = new THREE.DirectionalLight(0xffffff, 1)
  mainLight.position.set(5, 5, 5)
  scene.add(mainLight)

  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

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
    
    // Set initial position
    mesh.position.set(offset.x, offset.y, offset.z)
    rigidBody.setTranslation(offset)

    // Set initial linear velocity
    const linvel = new RAPIER.Vector3(
      Math.random() * (DICE_INITIAL_CONFIG.initialVelocity.x.max - DICE_INITIAL_CONFIG.initialVelocity.x.min) + 
      DICE_INITIAL_CONFIG.initialVelocity.x.min,
      DICE_INITIAL_CONFIG.initialVelocity.y.base,
      Math.random() * (DICE_INITIAL_CONFIG.initialVelocity.z.max - DICE_INITIAL_CONFIG.initialVelocity.z.min) + 
      DICE_INITIAL_CONFIG.initialVelocity.z.min
    )
    rigidBody.setLinvel(linvel)

    // Set initial angular velocity
    const angvel = new RAPIER.Vector3(
      Math.random() * (DICE_INITIAL_CONFIG.angularVelocity.max - DICE_INITIAL_CONFIG.angularVelocity.min) + 
      DICE_INITIAL_CONFIG.angularVelocity.min,
      Math.random() * (DICE_INITIAL_CONFIG.angularVelocity.max - DICE_INITIAL_CONFIG.angularVelocity.min) + 
      DICE_INITIAL_CONFIG.angularVelocity.min,
      Math.random() * (DICE_INITIAL_CONFIG.angularVelocity.max - DICE_INITIAL_CONFIG.angularVelocity.min) + 
      DICE_INITIAL_CONFIG.angularVelocity.min
    )
    rigidBody.setAngvel(angvel)

    return { mesh, rigidBody }
  } catch (error) {
    console.error('Error creating dice instance:', error)
    throw new Error('Failed to create dice instance')
  }
}

const resetCamera = () => {
  cameras.forEach((camera, index) => {
    const defaultPositions = [
      new THREE.Vector3(0, 8, 12),    // Main view
      new THREE.Vector3(-8, 8, 8),    // Left view
      new THREE.Vector3(8, 8, 8)      // Right view
    ];
    camera.position.copy(defaultPositions[index]);
    camera.lookAt(0, 0, 0);
  });
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

    // Create new dice instances
    for (let i = 0; i < count; i++) {
      resetCamera()
      const { mesh, rigidBody } = createDiceInstance(type, i, count)
      
      scene.add(mesh)
      dice.push(mesh)
      rigidBodies.push(rigidBody)

      // Initialize camera for this die
      if (i < cameras.length) {
        const camera = cameras[i]
        // Set initial camera position based on die number
        const radius = 8
        const angle = (2 * Math.PI * i) / count
        camera.position.set(
          Math.cos(angle) * radius,
          8,
          Math.sin(angle) * radius
        )
        camera.lookAt(0, 0, 0)
      }
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


const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  world.step()

  rotationAngle += ROTATION_SPEED
  
  updateDicePhysics()
  
  if (dice.length === 0) {
    for (let i = 0; i < 3; i++) {
      cameraManager.setMode('overview', i)
    }
  } else if (!rigidBodies.some(rb => isDiceSettled(rb))) {
    cameraManager.setMode('following')
  }
  
  cameraManager.update(dice, settledDice.value, rotationAngle)
  
  // Render each view
  renderers.forEach((renderer, index) => {
    if (index === 0 || (showExtraViews.value && index < dice.length)) {
      renderer.render(scene, cameraManager.getCameras()[index])
    }
  })
}

onMounted(async () => {
  try {
    await RAPIER.init();
    initScene();
    cameraManager = new CameraManager(scene, 300, 300);
    animate();
  } catch (error) {
    console.error('Error in mounted hook:', error);
  }
});

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
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