<script setup>
import { ref, computed, watch } from 'vue'
import DiceRoller from './DiceRoller.vue'
import SearchableDropdown from './SearchableDropdown.vue'
import DiceAttributeSelector from './DiceAttributeSelector.vue'
import { useDiceAppearanceStore } from '../stores/diceAppearanceStore'
import { useCharacterStore } from '../stores/characterStore'

const diceAppearanceStore = useDiceAppearanceStore()
const characterStore = useCharacterStore()
const diceRoller = ref(null)

const DICE_TYPES = [
  { value: 'd20', label: 'W20' },
  { value: 'd6', label: 'W6' }
]

const selectedDiceType = ref(DICE_TYPES[0])
const diceCount = ref(1)
const result = ref(null)
const diceAttributes = ref([])

// Computed property to check if W20 is selected
const isW20 = computed(() => selectedDiceType.value.value === 'd20')

// Initialize or update diceAttributes array when diceCount changes
const updateDiceAttributes = (newCount) => {
  const currentLength = diceAttributes.value.length
  if (newCount > currentLength) {
    // Add empty attribute selections for new dice
    diceAttributes.value = [
      ...diceAttributes.value,
      ...Array(newCount - currentLength).fill('')
    ]
  } else if (newCount < currentLength) {
    // Remove excess attribute selections
    diceAttributes.value = diceAttributes.value.slice(0, newCount)
  }
}

// Watch for diceCount changes
// Watch for diceCount or dice type changes
watch([diceCount, selectedDiceType], ([newCount, newType]) => {
  if (!isW20.value) {
    // Clear attribute selections when not using W20
    diceAttributes.value = Array(newCount).fill('')
  } else {
    updateDiceAttributes(newCount)
  }
})

const performRoll = async () => {
  try {
    // Reset result
    result.value = null
    
    // Set view mode based on dice count
    diceRoller.value.updateViewMode(diceCount.value > 1)
    
    // Roll the dice
    const rolls = await diceRoller.value.rollDice(
  selectedDiceType.value.value,
  diceCount.value,
  selectedDiceType.value.value === 'd20' 
    ? diceAttributes.value.map(attr => 
        attr 
          ? diceAppearanceStore.getD20Appearance('attribute', attr) 
          : diceAppearanceStore.getD20Appearance('attribute', 'MU')
      )
    : diceAppearanceStore.getD6Appearance('damage')
)

    // Calculate results including attribute checks
    const rollResults = rolls.map((roll, index) => {
      const attribute = diceAttributes.value[index]
      if (!attribute || !characterStore.activeCharacter) {
        return { roll, attribute: null }
      }

      const attributeValue = characterStore.activeCharacter.stats.attributes[attribute]
      const success = roll === 1 || (roll <= attributeValue && roll !== 20)

      return {
        roll,
        attribute,
        attributeValue,
        success,
        critical: roll === 1 ? 'Kritischer Erfolg!' : (roll === 20 ? 'Patzer!' : null)
      }
    })

    // Calculate total
    const total = rolls.reduce((sum, roll) => sum + roll, 0)

    // Set result
    result.value = {
      rollResults,
      total
    }
  } catch (error) {
    console.error('Error rolling dice:', error)
  }
}

const resetCamera = () => {
  diceRoller.value?.resetCamera()
}
</script>

<template>
  <div class="dice-check">
    <h2>Freies Würfeln</h2>

    <DiceRoller ref="diceRoller" class="dice-roller" />

    <!-- Dice labels -->
    <div class="dice-labels">
      <div class="dice-label" v-for="i in diceCount" :key="i">
        {{ selectedDiceType?.label || 'W20' }}
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <div class="selection">
        <SearchableDropdown v-model="selectedDiceType" :items="DICE_TYPES" :display-field="item => item.label"
          :value-field="item => item.label" placeholder="Würfel auswählen..." />
      </div>

      <div class="dice-count">
        <label for="diceCount">Anzahl:</label>
        <input id="diceCount" type="number" v-model.number="diceCount" min="1" max="6" class="dice-count-input" />
      </div>

      <!-- Attribute selection for each die -->
      <div v-if="characterStore.activeCharacter && isW20" class="attribute-selectors">
        <div v-for="(_, index) in diceCount" :key="index" class="attribute-selector">
          <DiceAttributeSelector :dice-index="index" v-model:selected-attribute="diceAttributes[index]" />
        </div>
      </div>

      <div class="button-group">
        <button class="roll-button" @click="performRoll">
          Würfeln
        </button>
        <button v-if="diceCount > 1" class="camera-reset-button" @click="resetCamera">
          🎲
        </button>
      </div>
    </div>

    <!-- Results -->
    <div v-if="result" class="result">
      <div class="success-indicator">
        Ergebnis
      </div>
      <div class="rolls-container">
        <div v-for="(rollResult, index) in result.rollResults" :key="index" class="roll-result">
          <div class="roll-number">
            Würfel {{ index + 1 }}: {{ rollResult.roll }}
          </div>
          <template v-if="rollResult.attribute">
            <div :class="[
              'attribute-check',
              rollResult.success ? 'success' : 'failure'
            ]">
              {{ rollResult.attribute }} ({{ rollResult.attributeValue }}):
              {{ rollResult.success ? 'Erfolg' : 'Misserfolg' }}
            </div>
            <div v-if="rollResult.critical" class="critical">
              {{ rollResult.critical }}
            </div>
          </template>
        </div>
      </div>
      <div v-if="diceCount > 1" class="result-line">
        Summe: {{ result.total }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.dice-check {
  color: white;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.dice-roller {
  width: 100%;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
}

.attribute-selectors-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.attribute-selectors {
  width: 900px;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 0rem;
  justify-content: center;
}

.attribute-selector {
  width: 270px; /* Fixed width instead of calc */
  min-width: 270px; /* Ensure minimum width */
}

.button-group {
  display: flex;
  gap: 0.5rem;
  width: auto;
  /* Not full width */
}

@media (max-width: 960px) {
  .attribute-selectors {
    grid-template-columns: repeat(2, minmax(200px, 1fr));
  }
}

@media (max-width: 600px) {
  .attribute-selectors {
    grid-template-columns: 1fr;
  }
}

.selection {
  width: 100%;
  max-width: 300px;
}

.roll-button {
  width: 300px;
  padding: 0.75rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1rem;
}

.dice-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dice-count-input {
  width: 60px;
  padding: 0.5rem;
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
  text-align: center;
}

.camera-reset-button {
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.camera-reset-button:hover {
  background: #444;
}

.dice-labels {
  width: 100%;
  text-align: center;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.dice-label {
  text-align: center;
  color: #42b983;
  text-shadow: #42b983 0 0 4px;
  font-weight: bold;
  font-size: 0.9rem;
}

.result {
  background: #1a1a1a;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  width: 100%;
  max-width: 300px;
  margin: 1rem auto;
}

.success-indicator {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #42b983;
}

.rolls-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0.5rem 0;
}

.roll-result {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.roll-number {
  font-size: 1.1rem;
}

.attribute-check {
  font-size: 0.9rem;
  padding: 0.25rem;
  border-radius: 4px;
}

.attribute-check.success {
  color: #42b983;
  background: rgba(66, 185, 131, 0.1);
}

.attribute-check.failure {
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.critical {
  font-weight: bold;
  font-size: 0.9rem;
  color: #ffd700;
}

.result-line {
  margin: 0.5rem 0;
  font-size: 1.1rem;
  border-top: 1px solid #333;
  padding-top: 0.5rem;
}

@media (max-width: 960px) {
  .attribute-selectors {
    width: 100%;
    padding: 0 1rem;
  }
  
  .attribute-selector {
    width: 300px;
    min-width: 300px;
  }
}

@media (max-width: 600px) {
  .attribute-selector {
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 960px) {
  .dice-selection {
    flex-direction: column;
  }

  .dice-wrapper {
    width: 100%;
    max-width: 300px;
  }
}
</style>