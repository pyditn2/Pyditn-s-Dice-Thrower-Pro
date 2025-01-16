<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { usePhysicsStore } from '../stores/physicsStore'
import { useBackgroundStore } from '../stores/backgroundStore'

const physicsStore = usePhysicsStore()
const backgroundStore = useBackgroundStore()
const isMenuOpen = ref(false)
const menuRef = ref(null)

const speedOptions = [
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' }
]

const handleClickOutside = (event) => {
  if (isMenuOpen.value && menuRef.value && !menuRef.value.contains(event.target)) {
    isMenuOpen.value = false
  }
}

const toggleMenu = (event) => {
  event.stopPropagation()
  isMenuOpen.value = !isMenuOpen.value
}

const setSpeed = (speed) => {
  physicsStore.setAnimationSpeed(speed)
}

const toggleBackground = () => {
  backgroundStore.setBackground(
    backgroundStore.currentBackground === 'schwarz' ? 'animiert' : 'schwarz'
  )
}

const updateHexagonColor = (event) => {
  backgroundStore.setHexagonColor(event.target.value)
}

const updateSquareColor = (event) => {
  backgroundStore.setSquareColor(event.target.value)
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div class="options-menu" ref="menuRef">
    <!-- Toggle Button -->
    <button 
      class="options-toggle" 
      :class="{ 'menu-open': isMenuOpen }"
      @click="toggleMenu" 
      aria-label="Options Menu">
      <div class="dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </button>

    <!-- Menu Panel -->
    <Transition
      enter-active-class="animate-in"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="animate-out"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="isMenuOpen" class="menu-panel">
        <div class="menu-section">
          <h3>Animationsgeschwindigkeit</h3>
          <div class="speed-toggle">
            <button 
              v-for="option in speedOptions" 
              :key="option.value"
              :class="{ active: physicsStore.currentSpeed === option.value }"
              @click="setSpeed(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        
        <div class="menu-section">
          <h3>Hintergrund</h3>
          <button 
            class="background-toggle"
            :class="{ active: backgroundStore.currentBackground === 'animiert' }"
            @click="toggleBackground"
          >
            Hintergrund animiert
          </button>
        </div>

        <div v-if="backgroundStore.currentBackground === 'animiert'" class="menu-section">
          
          <div class="color-controls">
            <div class="color-control">
              <label>Icosahedron</label>
              <input 
                type="color" 
                :value="backgroundStore.hexagonColor"
                @input="updateHexagonColor"
              >
            </div>
            <div class="color-control">
              <label>Würfel</label>
              <input 
                type="color" 
                :value="backgroundStore.squareColor"
                @input="updateSquareColor"
              >
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.options-menu {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
}

.options-toggle {
  background: #333;
  border: none;
  border-radius: 4px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.options-toggle:hover {
  background: #444;
  transform: scale(1.05);
}

.dots {
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: transform 0.3s ease, gap 0.3s ease;
}

.dots span {
  display: block;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s ease;
}

/* Vertical dots (default state) */
.options-toggle:not(.menu-open):hover .dots span:nth-child(1) {
  transform: translateY(-1px);
}

.options-toggle:not(.menu-open):hover .dots span:nth-child(3) {
  transform: translateY(1px);
}

/* Horizontal dots (menu open state) */
.menu-open .dots {
  flex-direction: row;
  gap: 4px;
  transform: rotate(0deg);
}

.menu-open:hover .dots span {
  transform: none;
}

.menu-panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: #222;
  border-radius: 4px;
  padding: 1rem;
  min-width: 200px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  transform-origin: top right;
}

.menu-section {
  margin-bottom: 1rem;
}

.menu-section:last-child {
  margin-bottom: 0;
}

.menu-section h3 {
  color: #fff;
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
  opacity: 0.8;
}

.speed-toggle {
  display: flex;
  gap: 0.5rem;
}

.speed-toggle button {
  flex: 1;
  padding: 0.5rem;
  background: #333;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-toggle button:hover {
  background: #444;
}

.speed-toggle button.active {
  background: #42b983;
  border-color: #42b983;
}

.background-toggle {
  width: 100%;
  padding: 0.5rem;
  background: #333;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.background-toggle:hover {
  background: #444;
}

.background-toggle.active {
  background: #42b983;
  border-color: #42b983;
}

.animate-in {
  animation: enter 0.2s ease-out;
}

.animate-out {
  animation: leave 0.15s ease-in;
}

@keyframes enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes leave {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

.color-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #333;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #444;
}

.color-control label {
  color: white;
  font-size: 0.9rem;
}

.color-control input[type="color"] {
  width: 40px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  background: none;
}

.color-control input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-control input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

/* For Firefox */
.color-control input[type="color"]::-moz-color-swatch {
  border: none;
  border-radius: 2px;
}
</style>