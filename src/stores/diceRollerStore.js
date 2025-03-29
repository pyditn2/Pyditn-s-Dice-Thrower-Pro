import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDiceRollerStore = defineStore('diceRoller', () => {
  const activeRolls = ref([])
  const cameraPositions = ref(new Map())
  const isRolling = ref(false)
  
  // New configuration for throw position
  const throwConfig = ref({
    // Default angle is 0 (directly above the bowl)
    angle: 0,
    // Default distance from center (radius)
    radius: 10,
    // Height above the bowl
    height: 8,
    // Velocity magnitude towards center
    velocityMagnitude: 15
  })
  
  const addRoll = (id, diceType, position) => {
    activeRolls.value.push({
      id,
      diceType,
      position,
      settled: false,
      result: null
    })
  }
  
  const updateRollResult = (id, result) => {
    const roll = activeRolls.value.find(r => r.id === id)
    if (roll) {
      roll.result = result
      roll.settled = true
    }
  }
  
  const clearRolls = () => {
    activeRolls.value = []
    cameraPositions.value.clear()
    isRolling.value = false
  }
  
  const allSettled = computed(() => 
    activeRolls.value.length > 0 && 
    activeRolls.value.every(roll => roll.settled)
  )
  
  // Calculate position and velocity based on angle and radius
  const getThrowPosition = (index, count) => {
    // Convert angle from degrees to radians
    const angleRad = throwConfig.value.angle * (Math.PI / 180)
    
    // Calculate position on the circle
    const position = {
      x: throwConfig.value.radius * Math.cos(angleRad),
      y: throwConfig.value.height + Math.random() * 2, // Add some variation to height
      z: throwConfig.value.radius * Math.sin(angleRad)
    }
    
    // Add spacing between multiple dice
    if (count > 1) {
      // Spacing perpendicular to throw direction
      const spacingAngle = angleRad + Math.PI / 2
      const spacing = 2.5 // Spacing between dice
      position.x += (index - (count - 1) / 2) * spacing * Math.cos(spacingAngle)
      position.z += (index - (count - 1) / 2) * spacing * Math.sin(spacingAngle)
    }
    
    return position
  }
  
  // Calculate velocity vector pointing towards center
  const getThrowVelocity = () => {
    const angleRad = throwConfig.value.angle * (Math.PI / 180)
    
    // Velocity vector pointing towards center (opposite of position vector)
    const velocity = {
      x: -throwConfig.value.velocityMagnitude * Math.cos(angleRad),
      y: 8, // Slight upward velocity
      z: -throwConfig.value.velocityMagnitude * Math.sin(angleRad)
    }
    
    // Add some randomness to make throws more natural
    velocity.x += (Math.random() * 4 - 2)
    velocity.z += (Math.random() * 4 - 2)
    
    return velocity
  }
  
  return {
    activeRolls,
    cameraPositions,
    isRolling,
    throwConfig,
    addRoll,
    updateRollResult,
    clearRolls,
    allSettled,
    getThrowPosition,
    getThrowVelocity
  }
})