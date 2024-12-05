import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDiceRollerStore = defineStore('diceRoller', () => {
  const activeRolls = ref([])
  const cameraPositions = ref(new Map())
  const isRolling = ref(false)
  
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
  
  return {
    activeRolls,
    cameraPositions,
    isRolling,
    addRoll,
    updateRollResult,
    clearRolls,
    allSettled
  }
})