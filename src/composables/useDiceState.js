import { ref, computed, markRaw } from 'vue'
import * as THREE from 'three'
import { DICE_INITIAL_CONFIG } from '../constants/diceTypes'
import { DiceManager } from '../services/diceManager'
import { useDiceRollerStore } from '../stores/diceRollerStore'

export const useDiceState = () => {
  const dice = ref([])
  const rigidBodies = ref([])
  const settledDice = ref(new Set())
  const diceManager = new DiceManager()
  const diceRollerStore = useDiceRollerStore()

  // Camera and renderer configuration
  const renderers = ref([])
  const showExtraViews = ref(false)
  const currentContainers = ref([])
  
  // Compute number of views needed based on dice count
  const requiredViews = computed(() => 
    Math.min(3, Math.max(1, dice.value.length))
  )

  const setupViews = (containerRefs) => {
    // Properly dispose of existing renderers
    renderers.value.forEach(renderer => {
      if (renderer) {
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        renderer.dispose();
        if (renderer.forceContextLoss) {
          renderer.forceContextLoss();
        }
      }
    });
  
    // Create new renderers with platform-specific settings
    renderers.value = containerRefs.map(() => {
      // Better platform detection using userAgent
      const isLinux = navigator.userAgent.toLowerCase().includes('linux');
      
      // Try with more compatible settings for all platforms, but especially for Linux
      const renderer = new THREE.WebGLRenderer({ 
        antialias: !isLinux,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false, // ToDo: Look at this again, this is not the right fix
        alpha: true
      });
      
      renderer.setSize(300, 300);
      
      // Only enable shadow maps if we're not on Linux
      if (!isLinux) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      } else {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.BasicShadowMap;
      }
  
      // Add context loss handling
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);
  
      return markRaw(renderer);
    });
  
    // Attach renderers to containers
    renderers.value.forEach((renderer, index) => {
      const container = containerRefs[index];
      if (container) {
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
      }
    });
  }

  const handleContextLost = (event) => {
    event.preventDefault();
    console.warn('WebGL context lost. Attempting to restore...');
    
  }

  const handleContextRestored = () => {
    console.log('WebGL context restored.');
    
    setupViews(currentContainers.value);
  }

  const updateViewMode = (showExtra) => {
    showExtraViews.value = showExtra
    // Re-setup views with current containers if they exist
    if (showExtra && currentContainers.value.length > 0) {
      setupViews(currentContainers.value)
    }
  }

  const resetDice = () => {
    // Clean up all dice physics before resetting arrays
    diceManager.cleanupAllDice()
    
    // Reset arrays
    dice.value = []
    rigidBodies.value = []
    settledDice.value.clear()
  }

  const createDiceInstance = (type, index, count, world, appearance = null) => {
    try {
      // Get position from diceRollerStore instead of using fixed offsets
      const position = diceRollerStore.getThrowPosition(index, count)
      
      // Get velocity from diceRollerStore
      const velocity = diceRollerStore.getThrowVelocity()

      // Pass appearance to DiceManager
      const { mesh, rigidBody } = diceManager.createDice(type, world, appearance)
      
      mesh.position.set(position.x, position.y, position.z)
      rigidBody.setTranslation(position)

      // Set velocities from our configuration
      rigidBody.setLinvel(velocity)

      // Set angular velocity (rotation) - keeping random as specified
      const angvel = {
        x: Math.random() * 30 - 15,
        y: Math.random() * 30 - 15,
        z: Math.random() * 30 - 15
      }
      rigidBody.setAngvel(angvel)

      return { mesh: markRaw(mesh), rigidBody: markRaw(rigidBody) }
    } catch (error) {
      console.error('Error creating dice instance:', error)
      throw error
    }
  }

  const updateDicePhysics = (rigidBodies, dice, settledDice, cameraManager) => {
    rigidBodies.forEach((rigidBody, index) => {
      if (!rigidBody) return
      
      if (settledDice.has(index)) {
        if (cameraManager) {
          cameraManager.setMode('topdown', index)
        }
        return
      }
  
      const position = rigidBody.translation()
      if (position.y < -5) { 
        rigidBody.setTranslation({ 
          x: -8, 
          y: 8 + Math.random() * 2,
          z: (index - (dice.length-1)/2) * 2.5 
        })
        rigidBody.setLinvel({
          x: Math.random() * 12 - 2,
          y: 8,
          z: Math.random() * 6 - 3
        })
      }
    })
  }

  const getUpFacingNumber = (die) => {
    return diceManager.getUpFacingNumber(die)
  }

  return {
    dice,
    rigidBodies,
    settledDice,
    renderers,
    showExtraViews,
    resetDice,
    createDiceInstance,
    setupViews,
    updateViewMode,
    getUpFacingNumber,
    updateDicePhysics,
    diceManager
  }
}