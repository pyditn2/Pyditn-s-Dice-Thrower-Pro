<script setup>
import { onMounted } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import WeaponsSection from './WeaponsSection.vue'

const characterStore = useCharacterStore()

// Initialize store on component mount
onMounted(() => {
  // Only initialize if there are no characters yet
  if (Object.keys(characterStore.characters).length === 0) {
    characterStore.initializeStore()
  }
})

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

// Helper functions
const updateAttribute = (key, value) => {
  const numValue = parseInt(value)
  if (!isNaN(numValue)) {
    characterStore.updateAttribute(key, numValue)
  }
}

const updateTalent = (categoryKey, talentIndex, value) => {
  const numValue = parseInt(value)
  if (!isNaN(numValue)) {
    const talent = characterStore.activeCharacter.talents[categoryKey][talentIndex]
    characterStore.updateTalentValue(talent.name, numValue)
  }
}

const updateCharacterInfo = (field, value) => {
  characterStore.updateCharacterInfo(field, value)
}

const createNewCharacter = () => {
  characterStore.createCharacter()
}

const deleteCurrentCharacter = () => {
  if (characterStore.activeCharacterId && confirm('Sind Sie sicher, dass Sie diesen Charakter löschen möchten?')) {
    characterStore.deleteCharacter(characterStore.activeCharacterId)
  }
}
</script>

Here's the complete template section for CharacterEditor.vue that you can directly copy and paste:

```vue
<template>
  <div class="character-editor">
    <div v-if="characterStore.activeCharacter" class="editor-layout">
      <!-- Character Info Sidebar -->
      <div class="character-info-sidebar">
        <div class="section info-section">
          <h3>Charakterinformationen</h3>
          <div class="info-field">
            <label for="char-name">Name</label>
            <input
              id="char-name"
              type="text"
              :value="characterStore.activeCharacter.characterInfo.name"
              @input="e => updateCharacterInfo('name', e.target.value)"
              placeholder="Charaktername"
            >
          </div>
          <div class="info-field">
            <label for="char-species">Spezies</label>
            <input
              id="char-species"
              type="text"
              :value="characterStore.activeCharacter.characterInfo.spezies"
              @input="e => updateCharacterInfo('spezies', e.target.value)"
              placeholder="Spezies"
            >
          </div>
          <div class="info-field">
            <label for="char-culture">Kultur</label>
            <input
              id="char-culture"
              type="text"
              :value="characterStore.activeCharacter.characterInfo.kultur"
              @input="e => updateCharacterInfo('kultur', e.target.value)"
              placeholder="Kultur"
            >
          </div>
          <div class="info-field">
            <label for="char-profession">Profession</label>
            <input
              id="char-profession"
              type="text"
              :value="characterStore.activeCharacter.characterInfo.profession"
              @input="e => updateCharacterInfo('profession', e.target.value)"
              placeholder="Profession"
            >
          </div>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="main-layout">
        <div class="main-content">
          <!-- Attributes Section -->
          <div class="section">
            <h3>Eigenschaften</h3>
            <div class="attributes-grid">
              <div v-for="(value, key) in characterStore.activeCharacter.stats.attributes" 
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
            <div v-for="(talents, categoryKey, index) in characterStore.activeCharacter.talents"
                 :key="categoryKey" 
                 class="talent-category">
              <h4
                  :style="{ marginTop: index === 0 ? '0rem' : '' }"
                  class="category-name">
                {{ categoryNames[categoryKey] }}
              </h4>
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

        <!-- Weapons Content -->
        <div class="weapons-content">
          <WeaponsSection />
        </div>
      </div>
    </div>
    
    <div v-else class="no-character-selected">
      <p>Charakter auswählen oder erstellen</p>
    </div>
  </div>
</template>
```

<style scoped>
.character-editor {
  padding: 1rem;
  margin: auto auto 1rem;
  max-width: 98%;
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
}

.info-field {
  margin: auto auto 1rem;
}

.info-field label {
  display: block;
  margin-bottom: 0.5rem;
  color: #999;
}

.info-field input {
  width: 250px;
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


.main-content {
  flex: 1;
  min-width: 0;
}

.section {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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

.category-name {
  margin: 3rem 0 1.5rem 0;
}

.talents-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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
  appearance: textfield;
  -moz-appearance: textfield;
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


.no-character-selected {
  text-align: center;
  padding: 2rem;
  background: #1a1a1a;
  border-radius: 8px;
  color: #999;
}

@media (max-width: 1400px) {
  .main-layout {
    flex-direction: column;
    gap: 1rem;
  }

  .weapons-content {
    width: 100%;
  }

  .attributes-grid,
  .talents-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 1024px) {
  .editor-layout {
    flex-direction: column;
    gap: unset;
  }

  .character-info-sidebar, .info-field, .info-field input {
    width: 100%;
    width: -moz-available;          /* WebKit-based browsers will ignore this. */
    width: -webkit-fill-available;  /* Mozilla-based browsers will ignore this. */
    width: fill-available;
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
    margin: auto;
    width: 100%;
    width: -moz-available;
    width: -webkit-fill-available;
    width: fill-available;
  }
}

@media (max-width: 1024px) {
  .editor-layout {
    flex-direction: column;
    gap: 1rem;
  }
  
  .main-layout {
    flex-direction: column;
    gap: 1rem;
  }

  .weapons-content {
    width: 100%;
  }

  .character-info-sidebar, .info-field, .info-field input {
    width: 100%;
    width: -moz-available;
    width: -webkit-fill-available;
    width: fill-available;
  }
}

.main-layout {
  flex-grow: 1;
  display: flex;
  gap: 2rem;
}

.stats-content {
  flex: 1;
  min-width: 0;
}

.weapons-content {
  width: 350px;
  flex-shrink: 0;
}
</style>