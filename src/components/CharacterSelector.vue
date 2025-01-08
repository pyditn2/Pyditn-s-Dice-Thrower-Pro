<script setup>
import { useCharacterStore } from '../stores/characterStore'

const characterStore = useCharacterStore()

const createNewCharacter = () => {
  characterStore.createCharacter()
}

const deleteCurrentCharacter = () => {
  if (characterStore.activeCharacterId && confirm('Sind Sie sicher, dass Sie diesen Charakter löschen möchten?')) {
    characterStore.deleteCharacter(characterStore.activeCharacterId)
  }
}
</script>

<template>
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
</template>

<style scoped>
.character-selection-bar {
  margin: auto auto 1rem;
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
  .character-selection-bar {
    flex-direction: column;
    width: 92%;
  }

  .character-select {
    width: 100%;
  }

  .create-btn, .delete-btn {
    width: 100%;
  }
}
</style>