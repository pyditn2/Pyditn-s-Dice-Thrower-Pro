<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'

const containerRef = ref(null)
let scene, camera, renderer, world
let dice = null
let rigidBody = null
let animationFrameId = null
let diceNumbers = []
let cameraAnimation = null

const cameraState = {
  position: new THREE.Vector3(0, 8, 12),
  target: new THREE.Vector3(0, 0, 0),
  isAnimating: false
}

const initScene = () => {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, 300 / 300, 0.1, 1000)
  
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(300, 300)
  renderer.shadowMap.enabled = true
  containerRef.value.innerHTML = ''
  containerRef.value.appendChild(renderer.domElement)
  
  const mainLight = new THREE.DirectionalLight(0xffffff, 1)
  mainLight.position.set(5, 5, 5)
  scene.add(mainLight)
  
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)
  
  camera.position.copy(cameraState.position)
  camera.lookAt(cameraState.target)

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

const createNumberTexture = (number) => {
  const canvas = document.createElement('canvas')
  const size = 128
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  // Make background transparent
  ctx.clearRect(0, 0, size, size)
  
  // Draw the number
  ctx.fillStyle = 'white'
  ctx.font = 'bold 90px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(number.toString(), size/2, size/2)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

const createD20 = () => {
  // Create base geometry and material for the dice
  const geometry = new THREE.IcosahedronGeometry(1)
  const material = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    shininess: 30,
  })
  
  const mesh = new THREE.Mesh(geometry, material)
  const startY = 4
  mesh.position.set(0, startY, 0)
  
  const positions = geometry.attributes.position.array
  diceNumbers = []
  
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
    
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshPhongMaterial({
        map: createNumberTexture(diceNumbers.length + 1),
        transparent: true,
        side: THREE.DoubleSide,
        shininess: 30,
        emissive: new THREE.Color(0x333333), // Slight emission to ensure visibility
        emissiveIntensity: 0.2
      })
    )
    
    label.position.copy(center.multiplyScalar(1.01))
    label.lookAt(center.add(normal))
    
    mesh.add(label)
    
    diceNumbers.push({
      number: diceNumbers.length + 1,
      normal: normal
    })
  }
  
  const physicsVertices = Array.from(positions)
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0, startY, 0)
  
  rigidBody = world.createRigidBody(rigidBodyDesc)
  
  const colliderDesc = RAPIER.ColliderDesc.convexHull(physicsVertices)
  if (colliderDesc) {
    colliderDesc
      .setRestitution(0.3)
      .setFriction(0.8)
    world.createCollider(colliderDesc, rigidBody)
  }
  
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
  
  return mesh
}

const lerp = (start, end, t) => {
  return start + (end - start) * t
}

const animateCamera = () => {
  if (!cameraAnimation) return

  const { 
    startPos, endPos, 
    startTarget, endTarget, 
    startUp, endUp,
    startTime, duration 
  } = cameraAnimation
  
  const now = Date.now()
  const elapsed = now - startTime
  const t = Math.min(elapsed / duration, 1)
  const eased = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t

  // Interpolate position
  camera.position.lerpVectors(startPos, endPos, eased)
  
  // Interpolate target
  cameraState.target.lerpVectors(startTarget, endTarget, eased)
  
  // Interpolate up vector
  const currentUp = new THREE.Vector3()
  currentUp.lerpVectors(startUp, endUp, eased)
  
  // Apply camera orientation
  camera.lookAt(cameraState.target)
  camera.up.copy(currentUp)

  if (t === 1) {
    cameraAnimation = null
  }
}

const getUpFacingNumber = () => {
  if (!dice || !diceNumbers.length) return null
  
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

const animate = () => {
  if (world && dice && rigidBody) {
    world.step()
    
    const position = rigidBody.translation()
    const rotation = rigidBody.rotation()
    
    dice.position.set(position.x, position.y, position.z)
    dice.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
  }
  
  animateCamera()
  renderer.render(scene, camera)
  
  animationFrameId = requestAnimationFrame(animate)
}

const calculateCameraOrientation = () => {
  if (!dice || !diceNumbers.length) return null
  
  // Find which face is up (we keep this part as it works well)
  const upVector = new THREE.Vector3(0, 1, 0)
  let maxDot = -1
  let upFaceNormal = null
  
  diceNumbers.forEach(({ normal }) => {
    const worldNormal = normal.clone()
    worldNormal.applyQuaternion(dice.quaternion)
    
    const dot = worldNormal.dot(upVector)
    if (dot > maxDot) {
      maxDot = dot
      upFaceNormal = worldNormal
    }
  })
  
  if (!upFaceNormal) return null

  const dicePosition = dice.position
  const cameraHeight = 5
  
  // Simply position camera directly above the dice
  const cameraPosition = new THREE.Vector3(
    dicePosition.x,
    dicePosition.y + cameraHeight,
    dicePosition.z
  )
  
  // Always use the world "north" as up direction
  const upDirection = new THREE.Vector3(0, 0, -1)
  
  return {
    position: cameraPosition,
    target: dicePosition,
    upVector: upDirection
  }
}

const moveCameraAboveDice = () => {
  if (!dice) return

  const orientation = calculateCameraOrientation()
  if (!orientation) return
  
  cameraAnimation = {
    startPos: camera.position.clone(),
    endPos: orientation.position,
    startTarget: cameraState.target.clone(),
    endTarget: orientation.target,
    startUp: new THREE.Vector3(0, 1, 0),
    endUp: orientation.upVector,
    startTime: Date.now(),
    duration: 1000
  }
}



const resetCamera = () => {
  cameraAnimation = {
    startPos: camera.position.clone(),
    endPos: new THREE.Vector3(0, 8, 12),
    startTarget: cameraState.target.clone(),
    endTarget: new THREE.Vector3(0, 0, 0),
    startUp: camera.up.clone(),         // Add this
    endUp: new THREE.Vector3(0, 1, 0),  // Add this
    startTime: Date.now(),
    duration: 1000
  }
}

const rollDice = async () => {
  if (dice) {
    scene.remove(dice)
  }
  if (rigidBody) {
    world.removeRigidBody(rigidBody)
  }

  resetCamera()
  dice = createD20()
  scene.add(dice)

  return new Promise((resolve) => {
    const checkSettled = setInterval(() => {
      if (rigidBody) {
        const vel = rigidBody.linvel()
        const angVel = rigidBody.angvel()
        
        if (Math.abs(vel.x) < 0.01 && 
            Math.abs(vel.y) < 0.01 && 
            Math.abs(vel.z) < 0.01 &&
            Math.abs(angVel.x) < 0.01 &&
            Math.abs(angVel.y) < 0.01 &&
            Math.abs(angVel.z) < 0.01) {
          clearInterval(checkSettled)
          const result = getUpFacingNumber()
          moveCameraAboveDice()
          resolve([result])
        }
      }
    }, 100)
  })
}
const startRoll = () => {
  resetCamera()
  if (dice) {
    scene.remove(dice)
  }
  if (rigidBody) {
    world.removeRigidBody(rigidBody)
  }

  dice = createD20()
  scene.add(dice)
}

const waitForSettling = () => {
  return new Promise((resolve) => {
    const checkSettled = setInterval(() => {
      if (rigidBody) {
        const vel = rigidBody.linvel()
        const angVel = rigidBody.angvel()
        
        if (Math.abs(vel.x) < 0.01 && 
            Math.abs(vel.y) < 0.01 && 
            Math.abs(vel.z) < 0.01 &&
            Math.abs(angVel.x) < 0.01 &&
            Math.abs(angVel.y) < 0.01 &&
            Math.abs(angVel.z) < 0.01) {
          clearInterval(checkSettled)
          const result = getUpFacingNumber()
          moveCameraAboveDice()
          resolve([result])
        }
      }
    }, 100)
  })
}

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
  rollDice, 
  startRoll, 
  waitForSettling,
  resetCamera
})
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