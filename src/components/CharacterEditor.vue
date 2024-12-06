<script setup>
import { ref } from 'vue'
import { useCharacterStore } from '../stores/characterStore'

const characterStore = useCharacterStore()

// Attribute names mapping
const attributeNames = {
  MU: 'Mut',
  KL: 'Klugheit',
  IN: 'Intuition',
  CH: 'Charisma',
  FF: 'Fingerfertigkeit',
  GE: 'Gewandheit',
  KO: 'Konstitution',
  KK: 'Körperkraft'
}

// Category names mapping
const categoryNames = {
  koerpertalente: 'Körpertalente',
  gesellschaftstalente: 'Gesellschaftstalente',
  naturtalente: 'Naturtalente',
  wissentalente: 'Wissenstalente',
  handwerkstalente: 'Handwerkstalente'
}

// Helper function to update attribute value
const updateAttribute = (key, value) => {
  const numValue = parseInt(value)
  if (!isNaN(numValue)) {
    characterStore.stats.attributes[key] = numValue
  }
}

// Helper function to update talent value
const updateTalent = (categoryKey, talentIndex, value) => {
  const numValue = parseInt(value)
  if (!isNaN(numValue)) {
    characterStore.talents[categoryKey][talentIndex].value = numValue
  }
}

// Character info update functions
const updateCharacterInfo = (field, value) => {
  characterStore.characterInfo[field] = value
}
</script>

<template>
  <div class="character-editor">
    <div class="editor-layout">
      <!-- Character Info Sidebar -->
      <div class="character-info-sidebar">
        <div class="info-section">
          <h3>Charakterinformationen</h3>
          <div class="info-field">
            <label for="char-name">Name</label>
            <input 
              id="char-name"
              type="text" 
              :value="characterStore.characterInfo.name"
              @input="e => updateCharacterInfo('name', e.target.value)"
              placeholder="Charaktername"
            >
          </div>
          <div class="info-field">
            <label for="char-species">Spezies</label>
            <input 
              id="char-species"
              type="text" 
              :value="characterStore.characterInfo.spezies"
              @input="e => updateCharacterInfo('spezies', e.target.value)"
              placeholder="Spezies"
            >
          </div>
          <div class="info-field">
            <label for="char-culture">Kultur</label>
            <input 
              id="char-culture"
              type="text" 
              :value="characterStore.characterInfo.kultur"
              @input="e => updateCharacterInfo('kultur', e.target.value)"
              placeholder="Kultur"
            >
          </div>
          <div class="info-field">
            <label for="char-profession">Profession</label>
            <input 
              id="char-profession"
              type="text" 
              :value="characterStore.characterInfo.profession"
              @input="e => updateCharacterInfo('profession', e.target.value)"
              placeholder="Profession"
            >
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Attributes Section -->
        <div class="section">
          <h3>Eigenschaften</h3>
          <div class="attributes-grid">
            <div v-for="(value, key) in characterStore.stats.attributes" 
                 :key="key" 
                 class="attribute-item">
              <label :for="key">{{ attributeNames[key] }}</label>
              <input 
                :id="key"
                type="number" 
                :value="value"
                min="0"
                max="20"
                @input="(e) => updateAttribute(key, e.target.value)"
              >
            </div>
          </div>
        </div>
        
        <!-- Talents Section -->
        <div class="section">
          <h3>Talente</h3>
          <div v-for="(talents, categoryKey) in characterStore.talents" 
               :key="categoryKey" 
               class="talent-category">
            <h4>{{ categoryNames[categoryKey] }}</h4>
            <div class="talents-grid">
              <div v-for="(talent, index) in talents" 
                   :key="talent.name" 
                   class="talent-item">
                <div class="talent-name">
                  {{ talent.name }}
                  <div class="talent-attributes">
                    ({{ talent.attributes.join(', ') }})
                  </div>
                </div>
                <input 
                  type="number" 
                  :value="talent.value"
                  min="0"
                  max="20"
                  @input="(e) => updateTalent(categoryKey, index, e.target.value)"
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.character-editor {
  padding: 1rem;
  color: white;
}

.editor-layout {
  display: flex;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.character-info-sidebar {
  width: 300px;
  flex-shrink: 0;
}

.info-section {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 1rem;
  width: 280px;
}

.info-field {
  margin-bottom: 1rem;
  width: 250px;
}

.info-field input {
  width: 250px; 
  padding: 0.5rem;
  background: #333;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
}

.main-content {
  flex-grow: 1;
}

.info-section {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 1rem;
}

.info-field {
  margin-bottom: 1rem;
}

.info-field label {
  display: block;
  margin-bottom: 0.5rem;
  color: #999;
}

.info-field input {
  width: 100%;
  padding: 0.5rem;
  background: #333;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
}

.info-field input:focus {
  outline: none;
  border-color: #42b983;
}

.section {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

h3 {
  color: #42b983;
  margin-bottom: 1rem;
}

h4 {
  color: #999;
  margin: 1rem 0;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.attribute-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #333;
  padding: 0.75rem;
  border-radius: 4px;
}

.talents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 0.75rem;
}

.talent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #333;
  padding: 0.75rem;
  border-radius: 4px;
}

.talent-name {
  flex-grow: 1;
  margin-right: 1rem;
}

.talent-attributes {
  font-size: 0.8rem;
  color: #999;
  margin-top: 0.25rem;
}

input[type="number"] {
  width: 60px;
  padding: 0.25rem;
  background: #444;
  border: 1px solid #555;
  color: white;
  border-radius: 4px;
  text-align: center;
}

input[type="number"]:focus {
  outline: none;
  border-color: #42b983;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  appearance: textfield;
  -moz-appearance: textfield;
}

@media (max-width: 1024px) {
  .editor-layout {
    flex-direction: column;
  }
  
  .character-info-sidebar {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .attributes-grid,
  .talents-grid {
    grid-template-columns: 1fr;
  }
  
  .talent-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .talent-item input {
    width: 100%;
  }
}
</style>