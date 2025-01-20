<script setup>
import { ref, computed } from 'vue'
import DiceRoller from './DiceRoller.vue'
import SearchableDropdown from './SearchableDropdown.vue'
import { useDiceAppearanceStore } from '../stores/diceAppearanceStore'

const diceAppearanceStore = useDiceAppearanceStore()
const diceRoller = ref(null)

const DICE_TYPES = [
  { value: 'd20', label: 'W20' },
  { value: 'd6', label: 'W6' }
]

const selectedDiceType = ref(DICE_TYPES[0])
const diceCount = ref(1)
const result = ref(null)

const performRoll = async () => {
  try {
    // Reset result
    result.value = null
    
    // Set view mode based on dice count
    diceRoller.value.updateViewMode(diceCount.value > 1)
    
    // Get appropriate appearance based on dice type
    const appearance = selectedDiceType.value.value === 'd20' 
      ? diceAppearanceStore.getD20Appearance('attribute', 'MU')
      : diceAppearanceStore.getD6Appearance('damage')

    // Roll the dice
    const rolls = await diceRoller.value.rollDice(
      selectedDiceType.value.value,
      diceCount.value,
      appearance
    )

    // Calculate total
    const total = rolls.reduce((sum, roll) => sum + roll, 0)

    // Set result
    result.value = {
      rolls,
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
        <SearchableDropdown 
          v-model="selectedDiceType" 
          :items="DICE_TYPES"
          :display-field="item => item.label"
          :value-field="item => item.label"
          placeholder="Würfel auswählen..."
        />
      </div>

      <div class="dice-count">
        <label for="diceCount">Anzahl:</label>
        <input 
          id="diceCount" 
          type="number" 
          v-model.number="diceCount" 
          min="1" 
          max="6"
          class="dice-count-input"
        />
      </div>

      <div class="button-group">
        <button class="roll-button" @click="performRoll">
          Würfeln
        </button>
        <button 
          v-if="diceCount > 1" 
          class="camera-reset-button" 
          @click="resetCamera"
        >
          🎲
        </button>
      </div>
    </div>

    <!-- Results -->
    <div v-if="result" class="result">
      <div class="success-indicator">
        Ergebnis
      </div>
      <div class="result-line">
        Würfe: {{ result.rolls.join(', ') }}
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
  gap: 1rem;
  width: 100%;
  max-width: 330px;
  align-items: center;
  margin: 0 auto;
}

.selection {
  width: 100%;
  max-width: 300px;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.roll-button {
  flex: 2;
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

.result-line {
  margin: 0.5rem 0;
  font-size: 1.1rem;
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