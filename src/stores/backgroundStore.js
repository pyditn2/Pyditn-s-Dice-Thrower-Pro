import { defineStore } from 'pinia'

export const useBackgroundStore = defineStore('background', {
  state: () => ({
    currentBackground: localStorage.getItem('currentBackground') || 'schwarz',
    hexagonColor: localStorage.getItem('hexagonColor') || '#258141',
    squareColor: localStorage.getItem('squareColor') || '#331127'
  }),
  
  actions: {
    setBackground(type) {
      this.currentBackground = type
      localStorage.setItem('currentBackground', type)
    },
    
    setHexagonColor(color) {
      this.hexagonColor = color
      localStorage.setItem('hexagonColor', color)
    },
    
    setSquareColor(color) {
      this.squareColor = color
      localStorage.setItem('squareColor', color)
    }
  }
})