<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import RAPIER from '@dimforge/rapier3d-compat'
import { CameraManager } from '../services/cameraManager'

// Import composables
import { useDiceState } from '../composables/useDiceState'
import { useSceneSystem } from '../composables/useSceneSystem'
import { usePhysicsSystem } from '../composables/usePhysicsSystem'
import { useAnimationSystem } from '../composables/useAnimationSystem'
import { useAudioSystem } from '../composables/useAudioSystem'

// Initialize composables
const diceState = useDiceState()
const sceneSystem = useSceneSystem()
const physicsSystem = usePhysicsSystem()
const animationSystem = useAnimationSystem()
const audioSystem = useAudioSystem()

// Container refs management
const containerElements = []
const maxDiceCount = ref(1)
const isInitialized = ref(false)

// Camera manager ref
let cameraManager = null

// Main animation loop
const animate = (currentTime) => {
  if (physicsSystem.lastTime.value === 0) {
    physicsSystem.lastTime.value = currentTime
    return
  }

  const deltaTime = Math.min((currentTime - physicsSystem.lastTime.value) / 1000, 0.1)
  physicsSystem.lastTime.value = currentTime

  // Physics update cycle
  physicsSystem.storePhysicsState(diceState.rigidBodies.value)
  const alpha = physicsSystem.updatePhysics(sceneSystem.world.value, deltaTime)
  physicsSystem.updateCurrentState(diceState.rigidBodies.value)
  physicsSystem.interpolateVisualState(diceState.dice.value, alpha)

  // Update scene state
  animationSystem.updateRotation(deltaTime)
  diceState.updateDicePhysics(
    diceState.rigidBodies.value,
    diceState.dice.value,
    diceState.settledDice.value,
    cameraManager
  )

  if (cameraManager) {
    // Ensure we have enough cameras
    cameraManager.ensureCameraCount(diceState.dice.value.length)

    // Update camera modes based on dice state
    diceState.rigidBodies.value.forEach((rb, index) => {
      if (!rb) return

      const wasSettled = diceState.settledDice.value.has(index)
      const isNowSettled = physicsSystem.isDiceSettled(rb)

      if (isNowSettled) {
        diceState.settledDice.value.add(index)
        cameraManager.setMode('topdown', index)
      } else {
        cameraManager.setMode('following', index)
      }
    })

    // Update camera positions
    cameraManager.update(
      diceState.dice.value,
      diceState.settledDice.value,
      animationSystem.rotationAngle.value
    )
  }

  // Render with dynamic camera count
  const currentRenderers = diceState.renderers.value
  const currentScene = sceneSystem.scene.value
  const cameras = cameraManager?.getCameras() || []

  currentRenderers.forEach((renderer, index) => {
    if (index < diceState.dice.value.length && renderer && cameras[index]) {
      if (index === 0 || diceState.showExtraViews.value) {
        const die = diceState.dice.value[index]
        if (die && currentScene) {
          renderer.render(currentScene, cameras[index])
        }
      }
    }
  })
}

const initializeContainer = (el, index) => {
  if (el && !containerElements[index]) {
    containerElements[index] = el

    // Check if all required containers are ready
    const allContainersReady = containerElements.length >= maxDiceCount.value &&
      containerElements.every((container, idx) => idx >= maxDiceCount.value || container != null)

    if (allContainersReady && !isInitialized.value) {
      diceState.setupViews(containerElements)
      isInitialized.value = true
    }
  }
}

const rollDice = async (type, count, appearance = null) => {
  try {
    if (count > maxDiceCount.value) {
      maxDiceCount.value = count
      isInitialized.value = false
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    animationSystem.isRotating.value = false
    diceState.settledDice.value.clear()

    sceneSystem.cleanupScene()
    diceState.resetDice()

    if (cameraManager) {
      cameraManager.reset()
      for (let i = 0; i < count; i++) {
        cameraManager.setMode('following', i)
      }
    }

    // Handle array of appearances for multiple dice
    const appearances = Array.isArray(appearance) ? appearance : Array(count).fill(appearance)

    for (let i = 0; i < count; i++) {
      const { mesh, rigidBody } = diceState.createDiceInstance(
        type, i, count, sceneSystem.world.value, appearances[i]
      )
      sceneSystem.scene.value.add(mesh)
      diceState.dice.value.push(mesh)
      diceState.rigidBodies.value.push(rigidBody)
    }

    // Wait for dice to settle
    return new Promise((resolve, reject) => {
      const checkSettled = setInterval(() => {
        try {
          const allSettled = diceState.rigidBodies.value.every(rb =>
            physicsSystem.isDiceSettled(rb)
          )
          if (allSettled) {
            clearInterval(checkSettled)
            const results = diceState.dice.value.map(die =>
              diceState.diceManager.getUpFacingNumber(die)
            )
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

const resetCamera = () => {
  animationSystem.rotationAngle.value = 0
  animationSystem.isRotating.value = true

  if (cameraManager) {
    cameraManager.reset()
    for (let i = 0; i < maxDiceCount.value; i++) {
      cameraManager.setMode('overview', i)
    }
  }
}

onMounted(async () => {
  try {
    await RAPIER.init()
    await sceneSystem.initScene()
    await audioSystem.initAudio()

    cameraManager = new CameraManager(sceneSystem.scene.value, 300, 300)
    physicsSystem.resetPhysicsState()
    
    // Setup collision events after world initialization
    physicsSystem.setupCollisionEvents(sceneSystem.world.value)

    animationSystem.startAnimation(animate)
    window.addEventListener('keydown', handleKeydown)
    
    // Add click listener to resume audio context
    window.addEventListener('click', audioSystem.resumeAudioContext)
  } catch (error) {
    console.error('Error in mounted hook:', error)
  }
})

onBeforeUnmount(() => {
  animationSystem.stopAnimation()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', audioSystem.resumeAudioContext)

  // Cleanup renderers
  diceState.renderers.value.forEach(renderer => {
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  })
})

const handleKeydown = (event) => {
  if (event.key.toLowerCase() === 'w') {
    // Let's add a debug log to verify diceState.diceManager exists
    console.log("DiceManager instance:", diceState.diceManager)
    sceneSystem.toggleWireframes(diceState.diceManager)
  }
}

defineExpose({
  rollDice,
  resetCamera,
  updateViewMode: diceState.updateViewMode
})
</script>

<template>
  <div class="dice-views-container" :class="`dice-count-${maxDiceCount}`">
    <div class="dice-views">
      <div v-for="n in maxDiceCount" :key="n" :ref="el => initializeContainer(el, n - 1)" class="dice-container"
        v-show="n === 1 || (diceState.showExtraViews && n <= diceState.dice.value.length)"></div>
    </div>
  </div>
</template>

<style scoped>
.dice-views-container {
  width: 100%;
  position: relative;
  z-index: 1;
  max-width: 1200px;
  /* Adjust based on your needs */
  margin: 0 auto;
}

.dice-views {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  justify-content: center;
  align-items: start;
  padding: 1rem;
}

.dice-container {
  width: 300px;
  height: 300px;
  background-color: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  justify-self: center;
}


.dice-count-1 .dice-views {
  grid-template-columns: 300px;
}

.dice-count-2 .dice-views {
  grid-template-columns: repeat(2, 300px);
}

.dice-count-3 .dice-views {
  grid-template-columns: repeat(3, 300px);
}

.dice-count-4 .dice-views,
.dice-count-5 .dice-views,
.dice-count-6 .dice-views {
  grid-template-columns: repeat(auto-fit, 300px);
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 1200px) {
  .dice-views {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.5rem;
  }

  .dice-container {
    width: 250px;
    height: 250px;
  }
}

@media (max-width: 768px) {
  .dice-views {
    grid-template-columns: repeat(2, 1fr);
  }

  .dice-container {
    width: 200px;
    height: 200px;
  }
}
</style>