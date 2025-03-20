<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import RAPIER from '@dimforge/rapier3d-compat'
import { CameraManager } from '../services/cameraManager'
import * as THREE from 'three'

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

const activeContainers = ref(new Set())

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

  // Update sky animation - Add this line
  sceneSystem.updateSkyAnimation(currentTime);

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
          // Ensure cameras can see far enough (add this line)
          if (cameras[index].far < 1000) {
            cameras[index].far = 1000;
            cameras[index].updateProjectionMatrix();
          }
          
          renderer.render(currentScene, cameras[index])
        }
      }
    }
  })
}

const initializeContainer = (el, index) => {
  if (el) {
    containerElements[index] = el
    activeContainers.value.add(index)

    // Check if all required containers are ready
    const allContainersReady = containerElements.length >= maxDiceCount.value &&
      containerElements.every((container, idx) => idx >= maxDiceCount.value || container != null)

    if (allContainersReady && !isInitialized.value) {
      diceState.setupViews(containerElements)
      isInitialized.value = true
    }
  } else {
    // Cleanup when container is unmounted
    activeContainers.value.delete(index)
  }
}

const rollDice = async (type, count, appearance = null) => {
  try {
    // Reset active containers for new roll
    activeContainers.value.clear()

    if (count > maxDiceCount.value) {
      maxDiceCount.value = count
      isInitialized.value = false
      await new Promise(resolve => setTimeout(resolve, 0))
    } else if (count < maxDiceCount.value) {
      // Cleanup unused containers when rolling fewer dice
      for (let i = count; i < maxDiceCount.value; i++) {
        if (containerElements[i]) {
          const renderer = diceState.renderers.value[i]
          if (renderer && renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement)
          }
          containerElements[i] = null
          diceState.renderers.value[i] = null
        }
      }
      maxDiceCount.value = count
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
    
    // Adjust camera settings for better skybox visibility
    console.log('Adjusting cameras for skybox visibility');
    const cameras = cameraManager.getCameras();
    cameras.forEach((camera, index) => {
      // Increase far plane to ensure skybox is visible
      camera.far = 1000;
      camera.updateProjectionMatrix();
      console.log(`Camera ${index} far plane set to ${camera.far}`);
    });
    
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
  console.log('Key pressed:', event.key);
  
  if (event.key.toLowerCase() === 'w') {
    console.log("DiceManager instance:", diceState.diceManager);
    sceneSystem.toggleWireframes(diceState.diceManager);
  } else if (event.key === '1') {
    // Toggle between starry sky and solid color
    console.log('Toggling between sky and solid color');
    const currentScene = sceneSystem.scene.value;
    
    // If scene has a background color, switch to starry sky
    if (currentScene.background) {
      currentScene.background = null;
      sceneSystem.createStarryNightSky();
      console.log('Switched to starry night sky');
    } else {
      // If using starry sky, switch to solid color
      sceneSystem.setColorBackground(0x00FF00); // Bright green for visibility
      console.log('Switched to solid green background');
    }
    
    // Force render update
    forceRender();
  } else if (event.key === '2') {
    // Adjust camera distances to see more of the sky
    if (cameraManager) {
      console.log('Adjusting camera settings');
      const cameras = cameraManager.getCameras();
      cameras.forEach((camera, index) => {
        camera.far = 1000;
        camera.updateProjectionMatrix();
        console.log(`Camera ${index} far plane increased to 2000`);
      });
      
      forceRender();
    }
  }
}

// Helper function to force all renderers to render
const forceRender = () => {
  const currentRenderers = diceState.renderers.value;
  const currentScene = sceneSystem.scene.value;
  const cameras = cameraManager?.getCameras() || [];
  
  console.log(`Forcing render with ${currentRenderers.length} renderers, ${cameras.length} cameras`);
  
  currentRenderers.forEach((renderer, index) => {
    if (renderer && cameras[index]) {
      console.log(`Forcing render for renderer ${index}`);
      renderer.render(currentScene, cameras[index]);
    }
  });
}

defineExpose({
  rollDice,
  resetCamera,
  updateViewMode: diceState.updateViewMode
})
</script>

<template>
  <div class="dice-views-container" :class="[
    `dice-count-${maxDiceCount}`,
    { 'single-die': maxDiceCount === 1 }
  ]">
    <div class="dice-views">
      <div v-for="n in maxDiceCount" :key="n" :ref="el => initializeContainer(el, n - 1)" class="dice-container"
        :class="{ 'active': activeContainers.has(n - 1) }"
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
}

/* Single die specific styling */
.single-die .dice-views {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.single-die .dice-container {
  margin: 0 auto;
}

/* Multiple dice layouts */
.dice-count-2 .dice-views {
  grid-template-columns: repeat(2, 300px);
  justify-content: center;
}

.dice-count-3 .dice-views {
  grid-template-columns: repeat(3, 300px);
  justify-content: center;
}

.dice-count-4 .dice-views,
.dice-count-5 .dice-views,
.dice-count-6 .dice-views {
  grid-template-columns: repeat(auto-fit, 300px);
  max-width: 1200px;
  margin: 0 auto;
  justify-content: center;
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

  .single-die .dice-container {
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

  .single-die .dice-container {
    width: 200px;
    height: 200px;
  }
}
</style>