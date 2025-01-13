import { defineStore } from 'pinia'

export const useBackgroundStore = defineStore('background', {
  state: () => ({
    currentBackground: 'schwarz', // schwarz, animiert
  }),
  
  actions: {
    setBackground(type) {
      this.currentBackground = type
    }
  }
})