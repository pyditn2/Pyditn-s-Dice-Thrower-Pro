<script setup>
import { ref } from 'vue'
import { invoke } from "@tauri-apps/api/core"
import DiceCheck from './components/DiceCheck.vue'
import CharacterEditor from './components/CharacterEditor.vue'
import CharacterSelector from "./components/CharacterSelector.vue"
import FreeDiceRoller from './components/FreeDiceRoller.vue'
import ManualDiceCheck from './components/ManualDiceCheck.vue'
import OptionsMenu from './components/OptionsMenu.vue'
import ThreeBackground from './components/ThreeBackground.vue'

const activeTab = ref('dice')
</script>

<template>
  <ThreeBackground />
  <div class="app">
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button 
        :class="{ active: activeTab === 'dice' }"
        class="tab-button"
        @click="activeTab = 'dice'"
      >
        Würfelproben
      </button>
      <button 
        :class="{ active: activeTab === 'free-dice' }"
        class="tab-button"
        @click="activeTab = 'free-dice'"
      >
        Freies Würfeln
      </button>
      <button 
        :class="{ active: activeTab === 'manual-dice' }"
        class="tab-button"
        @click="activeTab = 'manual-dice'"
      >
        Manuelle Eingabe
      </button>
      <button 
        :class="{ active: activeTab === 'character' }"
        class="tab-button"
        @click="activeTab = 'character'"
      >
        Charakterwerte
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Dice tab -->
      <CharacterSelector v-if="activeTab === 'dice'" />
      <DiceCheck v-if="activeTab === 'dice'" />
      
      <!-- Free dice tab -->
      <CharacterSelector v-if="activeTab === 'free-dice'" />
      <FreeDiceRoller v-if="activeTab === 'free-dice'" />
      
      <!-- Manual dice tab -->
      <CharacterSelector v-if="activeTab === 'manual-dice'" />
      <ManualDiceCheck v-if="activeTab === 'manual-dice'" />
      
      <CharacterEditor v-if="activeTab === 'character'" />
    </div>
  </div>
  <OptionsMenu />
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: transparent;
  color: #ffffff;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
  background-color: transparent;
  text-align: center;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.tab-content {
  padding: 1rem;
  color: #ffffff;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  min-width: min-content;
}

.tab-navigation {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid #333;
  padding-bottom: 0.5rem;
  justify-content: center;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.tab-button {
  padding: 0.5rem 1rem;
  background-color: rgba(51, 51, 51, 0.8); 
  color: #ffffff;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  border-radius: 4px;
}

.tab-button:hover {
  background-color: rgba(68, 68, 68, 0.8); 
}

.tab-button.active {
  background-color: rgba(0, 0, 0, 0.8); 
  border-bottom: 2px solid #42b983;
  font-weight: bold;
}

button, input, select {
  background-color: rgba(51, 51, 51, 0.8); 
  color: #ffffff;
  border: 1px solid #444444;
  border-radius: 4px;
  padding: 0.5rem;
}

button:hover {
  background-color: rgba(68, 68, 68, 0.8); 
}

.tab-button.active {
  background-color: #000000;
  border-bottom: 2px solid #42b983;
  font-weight: bold;
}

.tab-content {
  padding: 1rem;
  color: #ffffff;
}

button, input, select {
  background-color: #333333;
  color: #ffffff;
  border: 1px solid #444444;
  border-radius: 4px;
  padding: 0.5rem;
}

button:hover {
  background-color: #444444;
}

h1, h2, h3, h4, label, .talent-name, .selected-item, .weapon-header {
  user-select: none;
}


h2 {
  color: #42b983;
  margin-bottom: 2rem;
  font-size: 1.75rem;
  margin-top: 0 !important;
  text-shadow: 0 0 8px #42b983;
}


h3 {
  color: #42b983;
  margin-bottom: 1rem;
  font-size: 1.35rem;
  margin-top: 0 !important;
  text-shadow: 0 0 4px #42b983;
}

h4 {
  color: #999;
  font-size: 1.1rem;
  margin: 1rem 0;
}


option {
  background-color: #333333;
  color: #ffffff;
}
</style>