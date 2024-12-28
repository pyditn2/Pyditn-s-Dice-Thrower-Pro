<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import RAPIER from '@dimforge/rapier3d-compat'
import { CameraManager } from '../services/cameraManager'

// Import composables
import { useDiceState } from '../composables/useDiceState'
import { useSceneSystem } from '../composables/useSceneSystem'
import { usePhysicsSystem } from '../composables/usePhysicsSystem'
import { useAnimationSystem } from '../composables/useAnimationSystem'

// Container refs
const containerRef1 = ref(null)
const containerRef2 = ref(null)
const containerRef3 = ref(null)
const containerRefs = [containerRef1, containerRef2, containerRef3]

// Initialize composables
const diceState = useDiceState()
const sceneSystem = useSceneSystem()
const physicsSystem = usePhysicsSystem()
const animationSystem = useAnimationSystem()

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
  
  // Camera updates based on dice state
  if (diceState.dice.value.length === 0 && cameraManager) {
    for (let i = 0; i < 3; i++) {
      cameraManager.setMode('overview', i)
    }
  }
  
  if (cameraManager) {
  
    // Update camera mode based on dice state
    diceState.rigidBodies.value.forEach((rb, index) => {
  if (!rb) return
  
  const wasSettled = diceState.settledDice.value.has(index)
  const isNowSettled = physicsSystem.isDiceSettled(rb)
  
  if (wasSettled !== isNowSettled) {
    console.log(`Die ${index} settlement changed:`, {
      wasSettled,
      isNowSettled
    })
  }

  if (isNowSettled) {
    diceState.settledDice.value.add(index)
    cameraManager.setMode('topdown', index)
  } else {
    cameraManager.setMode('following', index)
  }
})

    // If no dice, set all cameras to overview
    if (diceState.dice.value.length === 0) {
      for (let i = 0; i < 3; i++) {
        cameraManager.setMode('overview', i)
      }
    }

    // Update camera positions
    cameraManager.update(
      diceState.dice.value, 
      diceState.settledDice.value, 
      animationSystem.rotationAngle.value
    )
  }
  
  // Render with non-reactive access
  const currentRenderers = [...diceState.renderers.value]
  const currentScene = sceneSystem.scene.value
  const cameras = cameraManager?.getCameras() || []

  if (diceState.dice.value.length > 0) {
    console.log('Dice rendering setup:', {
      diceCount: diceState.dice.value.length,
      renderersCount: currentRenderers.length,
      camerasCount: cameras.length,
      diceIndices: diceState.dice.value.map((_, i) => i)
    })
  }

  currentRenderers.forEach((renderer, index) => {
    if (index === 0 || (diceState.showExtraViews.value && index < diceState.dice.value.length)) {
      if (renderer && cameras[index] && currentScene) {
        // Ensure each camera is looking at its corresponding die
        const dieIndex = index  // This should match the die index
        const die = diceState.dice.value[dieIndex]
        if (die) {
          renderer.render(currentScene, cameras[index])
        }
      }
    }
  })

}

// Roll dice function
const rollDice = async (type, count) => {
  try {
    animationSystem.isRotating.value = false
    diceState.settledDice.value.clear()
    
    sceneSystem.cleanupScene()
    diceState.resetDice()   
    
    if (cameraManager) {
      cameraManager.reset()
      // Set initial mode for all cameras
      for (let i = 0; i < count; i++) {
        cameraManager.setMode('following', i)
      }
    }
    console.log('Before creating dice:', {
    existingDice: diceState.dice.value.length
    })
    // Create dice instances
    for (let i = 0; i < count; i++) {
      const { mesh, rigidBody } = diceState.createDiceInstance(
        type, i, count, sceneSystem.world.value
      )
      sceneSystem.scene.value.add(mesh)
      diceState.dice.value.push(mesh)         
      diceState.rigidBodies.value.push(rigidBody)
    }
    console.log('After creating dice:', {
    totalDice: diceState.dice.value.length
    })

    // Wait for dice to settle
    return new Promise((resolve, reject) => {
      const checkSettled = setInterval(() => {
  try {
    const allSettled = diceState.rigidBodies.value.every(rb => 
      physicsSystem.isDiceSettled(rb)
    )
    if (allSettled) {
      console.log('All dice settled in checkSettled interval') // Add this
      clearInterval(checkSettled)
      const results = diceState.dice.value.map(d => 
        diceState.getUpFacingNumber(d)
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

// Reset camera positions and state
const resetCamera = () => {
  animationSystem.rotationAngle.value = 0
  animationSystem.isRotating.value = true
  
  if (cameraManager) {
    cameraManager.reset()
    for (let i = 0; i < 3; i++) {
      cameraManager.setMode('overview', i)
    }
  }
}

// Lifecycle hooks
onMounted(async () => {
  try {
    await RAPIER.init()
    await sceneSystem.initScene()
    diceState.setupViews(containerRefs)
    
    cameraManager = new CameraManager(sceneSystem.scene.value, 300, 300)
    physicsSystem.resetPhysicsState()
    
    // Start animation using the animation system
    animationSystem.startAnimation(animate)

    window.addEventListener('keydown', handleKeydown)
  } catch (error) {
    console.error('Error in mounted hook:', error)
  }
})

onBeforeUnmount(() => {
  // Stop animation using the animation system
  animationSystem.stopAnimation()
  window.removeEventListener('keydown', handleKeydown)
})

// Event handlers
const handleKeydown = (event) => {
  if (event.key.toLowerCase() === 'w') {
    sceneSystem.toggleWireframes()
  }
}

// Expose necessary methods
defineExpose({
  rollDice,
  resetCamera,
  updateViewMode: diceState.updateViewMode
})
</script>

<template>
  <div class="dice-views-container">
    <div class="dice-views">
      <div ref="containerRef1" class="dice-container"></div>
      <div 
        v-show="diceState.showExtraViews" 
        ref="containerRef2" 
        class="dice-container"
      ></div>
      <div 
        v-show="diceState.showExtraViews" 
        ref="containerRef3" 
        class="dice-container"
      ></div>
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