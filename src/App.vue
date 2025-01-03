<script setup>
import { ref } from 'vue'
import { invoke } from "@tauri-apps/api/core"
import DiceCheck from './components/DiceCheck.vue'
import CharacterEditor from './components/CharacterEditor.vue'

const activeTab = ref('dice')
</script>

<template>
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
        :class="{ active: activeTab === 'character' }"
        class="tab-button"
        @click="activeTab = 'character'"
      >
        Charakterwerte
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <DiceCheck v-if="activeTab === 'dice'" />
      <CharacterEditor v-if="activeTab === 'character'" />
    </div>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  background-color: #000000;
  color: #ffffff;
}
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background-color: #000000;
  text-align: center;
}


.tab-navigation {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #333;
  padding-bottom: 0.5rem;
}

.tab-button {
  padding: 0.5rem 1rem;
  background-color: #333333;
  color: #ffffff;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  border-radius: 4px;
}

.tab-button:hover {
  background-color: #444444;
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

option {
  background-color: #333333;
  color: #ffffff;
}
</style>