<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { usePhysicsStore } from '../stores/physicsStore'
import { useBackgroundStore } from '../stores/backgroundStore'
import { useDiceAppearanceStore } from '../stores/diceAppearanceStore'
import { CHECK_TYPES } from '../constants/diceTypes'
import { useAudioSystem } from '../composables/useAudioSystem'

const physicsStore = usePhysicsStore()
const backgroundStore = useBackgroundStore()
const diceAppearanceStore = useDiceAppearanceStore()
const isMenuOpen = ref(false)
const menuRef = ref(null)
const audioSystem = useAudioSystem()

const speedOptions = [
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' }
]

const attributes = ['MU', 'KL', 'IN', 'CH', 'FF', 'GE', 'KO', 'KK']
const d6Types = ['damage', 'critical', 'extra']

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

const expandedSections = ref({
  colors: false,
  background: false
})

const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section]
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
    <button class="options-toggle" :class="{ 'menu-open': isMenuOpen }" @click="toggleMenu" aria-label="Options Menu">
      <div class="dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </button>

    <Transition enter-active-class="animate-in" enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100" leave-active-class="animate-out" leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95">
      <div v-if="isMenuOpen" class="menu-panel">
        <!-- Animation Speed Section (not collapsible) -->
        <div class="menu-section">
          <h3>Animationsgeschwindigkeit</h3>
          <div class="speed-toggle">
            <button v-for="option in speedOptions" :key="option.value"
              :class="{ active: physicsStore.currentSpeed === option.value }" @click="setSpeed(option.value)">
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="menu-section">
          <h3>Audio</h3>
          <button class="mute-toggle" :class="{ active: audioSystem.isMuted.value }" @click="audioSystem.toggleMute">
            {{ audioSystem.isMuted.value ? 'Stumm' : 'Stumm' }}
          </button>
        </div>

        <!-- Dice Colors Section -->
        <div class="menu-section collapsible">
          <h3 @click="toggleSection('colors')" class="section-header">
            Würfelfarben
            <span class="toggle-icon" :class="{ expanded: expandedSections.colors }">▼</span>
          </h3>
          <Transition name="collapse">
            <div v-show="expandedSections.colors" class="section-content">
              <div class="color-controls">
                <!-- D20 Attribute Colors -->
                <h4>D20 Attribute</h4>
                <div class="color-control" v-for="attr in attributes" :key="attr">
                  <label>{{ attr }}</label>
                  <input type="color" :value="diceAppearanceStore.getD20Appearance(CHECK_TYPES.ATTRIBUTE, attr).color"
                    @input="(e) => diceAppearanceStore.updateD20Appearance(CHECK_TYPES.ATTRIBUTE, attr, { color: e.target.value })">
                </div>

                <!-- D20 Special Colors -->
                <h4>D20 Spezial</h4>
                <div class="color-control">
                  <label>Talent</label>
                  <input type="color" :value="diceAppearanceStore.getD20Appearance(CHECK_TYPES.TALENT).color"
                    @input="(e) => diceAppearanceStore.updateD20Appearance(CHECK_TYPES.TALENT, null, { color: e.target.value })">
                </div>
                <div class="color-control">
                  <label>Kampf</label>
                  <input type="color" :value="diceAppearanceStore.getD20Appearance(CHECK_TYPES.COMBAT).color"
                    @input="(e) => diceAppearanceStore.updateD20Appearance(CHECK_TYPES.COMBAT, null, { color: e.target.value })">
                </div>

                <!-- Talent Colors Toggle -->
                <div class="talent-color-toggle">
                  <label>Talentproben-Farben:</label>
                  <button class="toggle-button" :class="{ active: !diceAppearanceStore.preferences.useTalentColors }"
                    @click="diceAppearanceStore.toggleTalentColors">
                    {{ diceAppearanceStore.preferences.useTalentColors ? 'Einheitliche Farbe' : 'Attributfarben' }}
                  </button>
                </div>

                <!-- D6 Colors -->
                <h4>D6 Würfel</h4>
                <div class="color-control" v-for="type in d6Types" :key="type">
                  <label>{{ type === 'damage' ? 'Schaden' : type === 'critical' ? 'Kritisch' : 'Extra' }}</label>
                  <input type="color" :value="diceAppearanceStore.getD6Appearance(type).color"
                    @input="(e) => diceAppearanceStore.updateD6Appearance(type, { color: e.target.value })">
                </div>

                <button class="reset-colors-button" @click="diceAppearanceStore.resetAppearances">
                  Farben zurücksetzen
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Background Section -->
        <div class="menu-section collapsible">
          <h3 @click="toggleSection('background')" class="section-header">
            Hintergrund
            <span class="toggle-icon" :class="{ expanded: expandedSections.background }">▼</span>
          </h3>
          <Transition name="collapse">
            <div v-show="expandedSections.background" class="section-content">
              <button class="background-toggle" :class="{ active: backgroundStore.currentBackground === 'animiert' }"
                @click="toggleBackground">
                Hintergrund animiert
              </button>

              <div v-if="backgroundStore.currentBackground === 'animiert'" class="color-controls">
                <div class="color-control">
                  <label>Icosahedron</label>
                  <input type="color" :value="backgroundStore.hexagonColor" @input="updateHexagonColor">
                </div>
                <div class="color-control">
                  <label>Würfel</label>
                  <input type="color" :value="backgroundStore.squareColor" @input="updateSquareColor">
                </div>
              </div>
            </div>
          </Transition>
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

.color-controls h4 {
  color: #fff;
  margin: 1rem 0 0.5rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

.reset-colors-button {
  width: 100%;
  padding: 0.5rem;
  margin-top: 1rem;
  background: #333;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-colors-button:hover {
  background: #444;
}

.talent-color-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #333;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #444;
  margin-bottom: 1rem;
}

.talent-color-toggle label {
  color: white;
  font-size: 0.9rem;
}

.toggle-button {
  background: #333;
  color: white;
  border: 1px solid #444;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-button:hover {
  background: #444;
}

.toggle-button.active {
  background: #42b983;
  border-color: #42b983;
}

.section-header {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.toggle-icon {
  font-size: 0.8rem;
  transition: transform 0.3s ease;
  transform: rotate(-90deg);
}

.toggle-icon.expanded {
  transform: rotate(0);
}

.section-content {
  overflow: hidden;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  max-height: 1000px;
  opacity: 1;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

/* Adjustments to existing styles */
.menu-section.collapsible {
  padding-bottom: 0;
}

.menu-section.collapsible .section-content {
  padding: 0.5rem 0;
}

.menu-panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: #222;
  border-radius: 4px;
  padding: 1rem;
  min-width: 200px;
  max-height: 80vh;
  /* Limit height to 80% of viewport height */
  overflow-y: auto;
  /* Enable vertical scrolling */
  overflow-x: hidden;
  /* Prevent horizontal scrolling */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  transform-origin: top right;
  scrollbar-width: thin;
  /* Firefox */
  scrollbar-color: #444 #222;
  /* Firefox */
}

/* Webkit (Chrome, Safari, Edge) scrollbar styling */
.menu-panel::-webkit-scrollbar {
  width: 8px;
}

.menu-panel::-webkit-scrollbar-track {
  background: #222;
  border-radius: 4px;
}

.menu-panel::-webkit-scrollbar-thumb {
  background-color: #444;
  border-radius: 4px;
  border: 2px solid #222;
}

.menu-panel::-webkit-scrollbar-thumb:hover {
  background-color: #555;
}

/* Ensure menu doesn't go off-screen on smaller heights */
@media screen and (max-height: 800px) {
  .menu-panel {
    max-height: 70vh;
  }
}

@media screen and (max-height: 600px) {
  .menu-panel {
    max-height: 60vh;
  }
}

.mute-toggle {
  width: 100%;
  padding: 0.5rem;
  background: #333;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.mute-toggle:hover {
  background: #444;
}

.mute-toggle.active {
  background: #42b983;
  border-color: #42b983;
}
</style>