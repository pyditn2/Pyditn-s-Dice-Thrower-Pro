<script setup>
import { ref, computed } from 'vue'
import DiceRoller from './DiceRoller.vue'
import { useDiceAppearanceStore } from '../stores/diceAppearanceStore'

const diceAppearanceStore = useDiceAppearanceStore()
const diceRoller = ref(null)

const DICE_TYPES = {
  D20: { value: 'd20', label: 'W20' },
  D6: { value: 'd6', label: 'W6' }
}

const selectedDiceType = ref(DICE_TYPES.D20.value)
const diceCount = ref(1)
const result = ref(null)

const diceOptions = Object.values(DICE_TYPES)

const performRoll = async () => {
  try {
    // Reset result
    result.value = null
    
    // Set view mode based on dice count
    diceRoller.value.updateViewMode(diceCount.value > 1)
    
    // Get appropriate appearance based on dice type
    const appearance = selectedDiceType.value === 'd20' 
      ? diceAppearanceStore.getD20Appearance('attribute', 'MU')  // Using attribute appearance as fallback
      : diceAppearanceStore.getD6Appearance('damage')  // Using damage appearance as fallback

    // Roll the dice
    const rolls = await diceRoller.value.rollDice(
      selectedDiceType.value,
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
        {{ DICE_TYPES[selectedDiceType.toUpperCase()]?.label || selectedDiceType }}
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <!-- Dice selection -->
      <div class="dice-selection">
        <div class="selection-row">
          <select v-model="selectedDiceType" class="dice-type-select">
            <option v-for="dice in diceOptions" :key="dice.value" :value="dice.value">
              {{ dice.label }}
            </option>
          </select>
        </div>

        <div class="selection-row">
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
        </div>
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
  margin: 0.5rem auto;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 400px;
  align-items: center;
  margin: 0 auto;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 400px;
  align-items: center;
  margin: 0 auto;
}

.selection {
  width: 100%;
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
}

.dice-type-select {
  padding: 0.5rem;
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
  width: 120px;
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

.button-group {
  display: flex;
  gap: 0.5rem;
}

.roll-button {
  padding: 0.75rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1rem;
  width: 120px;
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
  width: auto;
  min-width: fit-content;
}

.camera-reset-button:hover {
  background: #444;
}

.result {
  background: #1a1a1a;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  width: 100%;
  max-width: 400px;
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