<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { watch } from 'vue'

const containerRef1 = ref(null)
const containerRef2 = ref(null)
const containerRef3 = ref(null)
const showExtraViews = ref(false)
let scene, cameras = [], renderers = [], world
let dice = []
let rigidBodies = []
let animationFrameId = null
let diceNumbers = []


watch(showExtraViews, (newValue) => {
  if (newValue) {
    // Small delay to ensure DOM is updated
    setTimeout(reinitRenderers, 0)
  }
})

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
  renderers[0].setSize(300, 300)
  renderers[0].shadowMap.enabled = true
  if (containerRef1.value) {
    containerRef1.value.innerHTML = ''
    containerRef1.value.appendChild(renderers[0].domElement)
  }

  // Only attach other renderers if they should be shown
  if (showExtraViews.value) {
    renderers[1].setSize(300, 300)
    renderers[1].shadowMap.enabled = true
    if (containerRef2.value) {
      containerRef2.value.innerHTML = ''
      containerRef2.value.appendChild(renderers[1].domElement)
    }

    renderers[2].setSize(300, 300)
    renderers[2].shadowMap.enabled = true
    if (containerRef3.value) {
      containerRef3.value.innerHTML = ''
      containerRef3.value.appendChild(renderers[2].domElement)
    }
  }
  
  const mainLight = new THREE.DirectionalLight(0xffffff, 1)
  mainLight.position.set(5, 5, 5)
  scene.add(mainLight)
  
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

  world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })

  const groundGeometry = new THREE.PlaneGeometry(20, 20)
  const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x222222,
    side: THREE.DoubleSide
  })
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
  groundMesh.rotation.x = Math.PI / 2
  groundMesh.position.y = 0
  scene.add(groundMesh)

  const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
  const groundRigidBody = world.createRigidBody(groundRigidBodyDesc)
  
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.5, 10.0)
  world.createCollider(groundColliderDesc, groundRigidBody)
}

const reinitRenderers = () => {
  if (showExtraViews.value) {
    renderers[1].setSize(300, 300)
    renderers[1].shadowMap.enabled = true
    if (containerRef2.value) {
      containerRef2.value.innerHTML = ''
      containerRef2.value.appendChild(renderers[1].domElement)
    }

    renderers[2].setSize(300, 300)
    renderers[2].shadowMap.enabled = true
    if (containerRef3.value) {
      containerRef3.value.innerHTML = ''
      containerRef3.value.appendChild(renderers[2].domElement)
    }
  }
}

const createNumberTexture = (number) => {
  const canvas = document.createElement('canvas')
  const size = 128
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  // Make background transparent
  ctx.clearRect(0, 0, size, size)
  
  // Add a subtle background circle for better visibility
  ctx.beginPath()
  ctx.arc(size/2, size/2, size/3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.fill()
  
  // Draw the number
  ctx.fillStyle = 'white'
  ctx.font = 'bold 90px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(number.toString(), size/2, size/2)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.center.set(0.5, 0.5)  // Set rotation center to middle
  texture.needsUpdate = true
  return texture
}

const createFaceLabel = (number, center, normal) => {
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshPhongMaterial({
      map: createNumberTexture(number),
      transparent: true,
      side: THREE.DoubleSide,
      shininess: 0,
      emissive: new THREE.Color(0x333333),
      emissiveIntensity: 0.2
    })
  )
  
  // Position slightly above face
  label.position.copy(center.clone().multiplyScalar(1.01))
  
  // Create a consistent up vector for orientation
  const up = new THREE.Vector3(0, 1, 0)
  if (Math.abs(normal.y) > 0.9) {
    up.set(0, 0, -Math.sign(normal.y))
  }
  
  // Orient the label to face outward and maintain consistent rotation
  label.lookAt(center.clone().add(normal))
  label.up.copy(up)
  label.updateMatrix()
  
  return label
}

const createDice = (type) => {
  const geometry = createDiceGeometry(type)
  const material = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    shininess: 30,
  })
  
  const mesh = new THREE.Mesh(geometry, material)
  const startY = 6
  mesh.position.set(0, startY, 0)
  
  diceNumbers = [] // Reset numbers array
  
  // Physics setup
  const physicsVertices = Array.from(geometry.attributes.position.array)
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  rigidBodyDesc.setTranslation(0, startY, 0)
  rigidBodyDesc.angularDamping = 0.5
  rigidBodyDesc.linearDamping = 0.5
  
  const rigidBody = world.createRigidBody(rigidBodyDesc)
  
  const colliderDesc = RAPIER.ColliderDesc.convexHull(physicsVertices)
  if (colliderDesc) {
    colliderDesc
      .setRestitution(0.3)
      .setFriction(0.8)
      .setDensity(2.0)
    world.createCollider(colliderDesc, rigidBody)
  }
  
  if (type === 'd20') {
    // D20 face numbers arrangement (standard arrangement)
    const d20Layout = [
      20, 8, 14, 2, 16,       // Upper pentagon
      10, 12, 4, 6, 18,       // Middle strip
      19, 7, 13, 1, 15,       // Middle strip
      11, 3, 17, 5, 9         // Lower pentagon
    ]
    
    const positions = geometry.attributes.position.array
    const faceNormals = []
    const faceCenters = []
    
    // Calculate face centers and normals
    for (let i = 0; i < positions.length; i += 9) {
      const v1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2])
      const v2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5])
      const v3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8])
      
      const normal = new THREE.Vector3()
      const center = new THREE.Vector3()
      
      normal.crossVectors(
        v2.clone().sub(v1),
        v3.clone().sub(v1)
      ).normalize()
      
      center.add(v1).add(v2).add(v3).divideScalar(3)
      
      faceNormals.push(normal.clone())
      faceCenters.push(center.clone())
    }
    
    // Add number labels to faces and store number data
    for (let i = 0; i < 20; i++) {
      const label = createFaceLabel(
        d20Layout[i],
        faceCenters[i],
        faceNormals[i]
      )
      mesh.add(label)
      
      // Store the number and its corresponding normal
      diceNumbers.push({
        number: d20Layout[i],
        normal: faceNormals[i]
      })
    }
  }

  return { mesh, rigidBody }
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
};

// Add getUpFacingNumber function:
const getUpFacingNumber = (dice) => {
  if (!diceNumbers.length) return null
  
  const upVector = new THREE.Vector3(0, 1, 0)
  let maxDot = -1
  let result = null
  
  diceNumbers.forEach(({ normal, number }) => {
    const worldNormal = normal.clone()
    worldNormal.applyQuaternion(dice.quaternion)
    
    const dot = worldNormal.dot(upVector)
    if (dot > maxDot) {
      maxDot = dot
      result = number
    }
  })
  
  return result
}

const createDiceGeometry = (type) => {
  switch (type) {
    case 'd20':
      return new THREE.IcosahedronGeometry(1)
    case 'd6':
      return new THREE.BoxGeometry(1, 1, 1)
    default:
      throw new Error('Unsupported dice type')
  }
}



const rollDice = async (type, count) => {
  showExtraViews.value = count > 1
  // Make sure to properly clean up ALL previous dice
  while (scene.children.length > 0) {
    const object = scene.children[0];
    scene.remove(object);
  }
  
  // Re-add lights and ground after clearing
  const mainLight = new THREE.DirectionalLight(0xffffff, 1)
  mainLight.position.set(5, 5, 5)
  scene.add(mainLight)
  
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

  // Recreate ground
  const groundGeometry = new THREE.PlaneGeometry(20, 20)
  const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x222222,
    side: THREE.DoubleSide
  })
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
  groundMesh.rotation.x = Math.PI / 2
  groundMesh.position.y = 0
  scene.add(groundMesh)

  // Clear physics bodies
  rigidBodies.forEach(rb => {
    if (rb && world.getRigidBody(rb.handle)) {
      world.removeRigidBody(rb)
    }
  })
  
  dice = []
  rigidBodies = []

  // Create new dice
  for (let i = 0; i < count; i++) {
    const offset = {
      x: (i - (count-1)/2) * 2.5,
      y: 6 + Math.random() * 2,
      z: Math.random() - 0.5
    }
    resetCamera();

    const { mesh, rigidBody } = createDice(type)
    
    mesh.position.set(offset.x, offset.y, offset.z)
    rigidBody.setTranslation({ x: offset.x, y: offset.y, z: offset.z })

    rigidBody.setLinvel(new RAPIER.Vector3(
      Math.random() * 8 - 4,
      6,
      Math.random() * 8 - 4
    ))
    
    rigidBody.setAngvel(new RAPIER.Vector3(
      Math.random() * 10 - 5,
      Math.random() * 10 - 5,
      Math.random() * 10 - 5
    ))

    scene.add(mesh)
    dice.push(mesh)
    rigidBodies.push(rigidBody)
  }

  return new Promise((resolve) => {
    const checkSettled = setInterval(() => {
      const allSettled = rigidBodies.every(rb => {
        const vel = rb.linvel()
        const angVel = rb.angvel()
        return Math.abs(vel.x) < 0.01 && 
               Math.abs(vel.y) < 0.01 && 
               Math.abs(vel.z) < 0.01 &&
               Math.abs(angVel.x) < 0.01 &&
               Math.abs(angVel.y) < 0.01 &&
               Math.abs(angVel.z) < 0.01
      })
      
      if (allSettled) {
        clearInterval(checkSettled)
        const results = dice.map(d => getUpFacingNumber(d))
        resolve(results)
      }
    }, 100)
  })
}


const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  world.step();
  
  rigidBodies.forEach((rigidBody, index) => {
    const position = rigidBody.translation();
    const rotation = rigidBody.rotation();
    dice[index].position.set(position.x, position.y, position.z);
    dice[index].quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    
    // Check if die has settled
    const velocity = rigidBody.linvel();
    const angularVelocity = rigidBody.angvel();
    const isSettled =
      Math.abs(velocity.x) < 0.01 &&
      Math.abs(velocity.y) < 0.01 &&
      Math.abs(velocity.z) < 0.01 &&
      Math.abs(angularVelocity.x) < 0.01 &&
      Math.abs(angularVelocity.y) < 0.01 &&
      Math.abs(angularVelocity.z) < 0.01;

    if (showExtraViews.value && index < cameras.length) {
      const camera = cameras[index];
      const dicePosition = dice[index].position;

      if (isSettled) {
        // Move camera to position above settled die
        const desiredCameraPosition = new THREE.Vector3(
          dicePosition.x,
          dicePosition.y + 5,
          dicePosition.z
        );
        camera.position.lerp(desiredCameraPosition, 0.1);
        camera.lookAt(dicePosition);
      } else {
        // Update camera position to follow die while maintaining relative angle
        const radius = 8;
        const currentAngle = Math.atan2(
          camera.position.z - dicePosition.z,
          camera.position.x - dicePosition.x
        );
        camera.position.set(
          dicePosition.x + radius * Math.cos(currentAngle),
          dicePosition.y + 5,
          dicePosition.z + radius * Math.sin(currentAngle)
        );
        camera.lookAt(dicePosition);
      }
    }
  });
  
  // Render each view
  renderers.forEach((renderer, index) => {
    if (index === 0 || (showExtraViews.value && index < dice.length)) {
      renderer.render(scene, cameras[index]);
    }
  });
};

onMounted(async () => {
  await RAPIER.init()
  initScene()
  animate()
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})

defineExpose({ 
  rollDice
})
</script>

<template>
  <div class="dice-views-container">
    <div class="dice-views">
      <div ref="containerRef1" class="dice-container"></div>
      <div v-if="showExtraViews" ref="containerRef2" class="dice-container"></div>
      <div v-if="showExtraViews" ref="containerRef3" class="dice-container"></div>
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
</style>