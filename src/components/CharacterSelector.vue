<script setup>
import { ref } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import ThrowPositionSelector from './ThrowPositionSelector.vue'

const characterStore = useCharacterStore()
const showThrowSettings = ref(false)

const createNewCharacter = () => {
  characterStore.createCharacter()
}

const deleteCurrentCharacter = () => {
  if (characterStore.activeCharacterId && confirm('Sind Sie sicher, dass Sie diesen Charakter löschen möchten?')) {
    characterStore.deleteCharacter(characterStore.activeCharacterId)
  }
}

const toggleThrowSettings = () => {
  showThrowSettings.value = !showThrowSettings.value
}

const closeThrowSettings = () => {
  showThrowSettings.value = false
}

// Handle clicks outside the popup
const handleClickOutside = (event) => {
  const popup = document.getElementById('throw-position-popup')
  const button = document.getElementById('throw-position-button')
  
  if (popup && button && showThrowSettings.value) {
    if (!popup.contains(event.target) && !button.contains(event.target)) {
      showThrowSettings.value = false
    }
  }
}

// Register and unregister the click handler
if (typeof window !== 'undefined') {
  window.addEventListener('click', handleClickOutside)
}

// Clean up event listener (optional - Vue will handle this)
// onUnmounted(() => {
//   window.removeEventListener('click', handleClickOutside)
// })
</script>

<template>
  <div class="character-config-bar">
    <div class="controls-container">
      <div class="throw-settings-container">
        <button 
          id="throw-position-button"
          @click.stop="toggleThrowSettings" 
          class="throw-settings-button"
          title="Wurf-Einstellungen"
        >
          <img src="../assets/icons/wurfsettings.png" alt="Wurf-Einstellungen" width="20" height="20" />

        </button>
        
        <div 
          v-if="showThrowSettings" 
          id="throw-position-popup"
          class="throw-settings-popup"
          @click.stop
        >
          <div class="popup-header">
            <h3>Wurf-Einstellungen</h3>
            <button @click="closeThrowSettings" class="close-button">×</button>
          </div>
          <ThrowPositionSelector :width="280" :height="120" />
        </div>
      </div>
      
      <div class="character-selection-bar">
        <select 
          v-model="characterStore.activeCharacterId"
          @change="characterStore.setActiveCharacter($event.target.value)"
          class="character-select"
        >
          <option value="">Charakter auswählen</option>
          <option 
            v-for="char in characterStore.characterList" 
            :key="char.id" 
            :value="char.id"
          >
            {{ char.name || 'Unbenannter Charakter' }}
          </option>
        </select>
        <button @click="createNewCharacter" class="create-btn">Neuer Charakter</button>
        <button 
          @click="deleteCurrentCharacter"
          :disabled="!characterStore.activeCharacterId"
          class="delete-btn"
        >
          Charakter löschen
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.character-config-bar {
  margin: 0 auto 1rem;
}

.controls-container {
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
}

.throw-settings-container {
  position: relative;
}

.throw-settings-button {
  padding: 0.5rem;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  height: 38px;
  width: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.throw-settings-button:hover {
  background: #444;
}

.throw-settings-popup {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  z-index: 1000;
  background: #1a1a1a;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  width: 320px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid #333;
  padding-bottom: 0.8rem;
}

.popup-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #42b983;
}

.close-button {
  background: none;
  border: none;
  color: #999;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.close-button:hover {
  color: white;
}

.character-selection-bar {
  margin: 0;
  width: max-content;
  padding: 1rem;
  background: #1a1a1a;
  border-radius: 8px;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.character-select {
  padding: 0.5rem;
  background: #333;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
  min-width: 200px;
}

.create-btn, .delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.create-btn {
  background: #42b983;
}

.create-btn:hover {
  background: #3aa876;
}

.delete-btn {
  background: #e74c3c;
}

.delete-btn:hover:not(:disabled) {
  background: #c0392b;
}

.delete-btn:disabled {
  background: #666;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .controls-container {
    flex-direction: column;
    width: 100%;
    align-items: center;
  }

  .character-selection-bar {
    flex-direction: column;
    width: 92%;
  }

  .throw-settings-container {
    width: 92%;
    max-width: 100%;
    margin-bottom: 0.5rem;
  }

  .throw-settings-button {
    width: 38px;
  }

  .throw-settings-popup {
    width: 100%;
  }

  .character-select {
    width: 100%;
  }

  .create-btn, .delete-btn {
    width: 100%;
  }
}
</style>