import { defineStore } from 'pinia'

export const usePhysicsStore = defineStore('physics', {
  state: () => ({
    animationSpeed: 1, // 1x, 2x, or 3x
    timeStep: 1/120,
  }),
  
  actions: {
    setAnimationSpeed(speed) {
      this.animationSpeed = speed
      this.timeStep = (1/120) / speed
    },
  },
  
  getters: {
    currentTimeStep: (state) => state.timeStep,
    currentSpeed: (state) => state.animationSpeed,
  }
})