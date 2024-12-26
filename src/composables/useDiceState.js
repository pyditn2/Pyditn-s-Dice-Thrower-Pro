import { ref, computed, markRaw } from 'vue'
import * as THREE from 'three'
import { DICE_INITIAL_CONFIG } from '../constants/diceTypes'
import { DiceManager } from '../services/diceManager'

export const useDiceState = () => {
  const dice = ref([])
  const rigidBodies = ref([])
  const settledDice = ref(new Set())
  const diceManager = new DiceManager()

  // Camera and renderer configuration
  const renderers = ref([])
  const showExtraViews = ref(false)
  
  // Compute number of views needed based on dice count
  const requiredViews = computed(() => 
    Math.min(3, Math.max(1, dice.value.length))
  )

  const setupViews = (containerRefs) => {
    renderers.value = Array(3).fill(null).map(() => {
      const renderer = markRaw(new THREE.WebGLRenderer({ antialias: true }))
      renderer.setSize(300, 300)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      return renderer
    })

    attachRenderers(containerRefs)
  }

  const attachRenderers = (containerRefs) => {
    renderers.value.forEach((renderer, index) => {
      const container = containerRefs[index]?.value
      if (container) {
        container.innerHTML = ''
        container.appendChild(renderer.domElement)
      }
    })
  }

  const resetDice = () => {
    dice.value = []
    rigidBodies.value = []
    settledDice.value.clear()
  }

  const createDiceInstance = (type, index, count, world) => {
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

      // Set initial velocities
      const linvel = {
        x: Math.random() * 20 - 10,
        y: 15,
        z: Math.random() * 20 - 10
      }
      rigidBody.setLinvel(linvel)

      const angvel = {
        x: Math.random() * 30 - 15,
        y: Math.random() * 30 - 15,
        z: Math.random() * 30 - 15
      }
      rigidBody.setAngvel(angvel)

      const newDice = { mesh, rigidBody }
      dice.value.push(markRaw(mesh))
      rigidBodies.value.push(markRaw(rigidBody))
      
      return newDice
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
        rigidBody.setAngvel({
          x: Math.random() * 15 - 7.5,
          y: Math.random() * 15 - 7.5,
          z: Math.random() * 15 - 7.5
        })
      }
    })
  
    if (dice.length === 0 && cameraManager) {
      for (let i = 0; i < 3; i++) {
        cameraManager.setMode('overview', i)
      }
    }
  }

  const updateViewMode = (showExtra) => {
    showExtraViews.value = showExtra
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
    requiredViews,
    resetDice,
    createDiceInstance,
    setupViews,
    updateViewMode,
    getUpFacingNumber,
    updateDicePhysics
  }
}