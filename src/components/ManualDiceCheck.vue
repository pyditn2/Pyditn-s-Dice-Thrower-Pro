<script setup>
import { ref, computed } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import CheckResults from './CheckResults.vue'
import SearchableDropdown from './SearchableDropdown.vue'

const characterStore = useCharacterStore()
const selectedTalent = ref(null)
const diceValues = ref([0, 0, 0]) // Three dice for talent checks
const modifier = ref(0)
const result = ref(null)

// Talent related computed properties
const talents = computed(() => {
  if (!characterStore.activeCharacter || !characterStore.activeCharacter.talents) return []
  
  const allTalents = []
  
  // Process each talent category
  Object.entries(characterStore.activeCharacter.talents).forEach(([category, talentList]) => {
    if (Array.isArray(talentList)) {
      // Add each talent to our flat list with its attributes
      talentList.forEach(talent => {
        allTalents.push({
          value: talent.name,
          label: `${talent.name} (${talent.value})`,
          attributes: talent.attributes,
          talentValue: talent.value
        })
      })
    }
  })
  
  return allTalents
})

const talentAttributes = computed(() => {
  if (!selectedTalent.value) return []
  
  const talent = talents.value.find(t => t.value === selectedTalent.value.value)
  if (!talent) return []
  
  return talent.attributes.map(attrKey => ({
    key: attrKey,
    value: characterStore.activeCharacter?.stats?.attributes?.[attrKey] || 0,
    adjustedValue: Math.max(1, (characterStore.activeCharacter?.stats?.attributes?.[attrKey] || 0) + modifier.value)
  }))
})

const talentValue = computed(() => {
  if (!selectedTalent.value) return null
  
  const talent = talents.value.find(t => t.value === selectedTalent.value.value)
  return talent ? talent.talentValue : null
})

// Function to update talent selection
const updateTalent = (newValue) => {
  selectedTalent.value = newValue
  result.value = null
}

const calculateResult = () => {
  if (!selectedTalent.value || !talentAttributes.value.length || talentValue.value === null) {
    return
  }

  const rolls = [...diceValues.value]
  
  // Check if the dice values are within the valid range
  if (rolls.some(roll => roll < 1 || roll > 20)) {
    alert('Die Würfelwerte müssen zwischen 1 und 20 liegen.')
    return
  }

  // Check for critical success (all 1s)
  const isCriticalSuccess = rolls.every(roll => roll === 1)
  
  // Check for critical failure (all 20s)
  const isCriticalFailure = rolls.every(roll => roll === 20)

  // Calculate difficulty for talent check
  let pointsNeeded = 0
  const adjustedAttributes = talentAttributes.value.map((attr, index) => {
    const roll = rolls[index]
    const difference = roll - attr.adjustedValue
    
    // If roll is a 1, it's always successful for this attribute
    if (roll === 1) return { ...attr, difference: 0 }
    
    // If roll is a 20, it's always a failure for this attribute
    if (roll === 20) return { ...attr, difference: Math.max(1, roll - attr.adjustedValue) }
    
    return { ...attr, difference: Math.max(0, difference) }
  })
  
  // Calculate total points needed
  pointsNeeded = adjustedAttributes.reduce((sum, attr) => sum + attr.difference, 0)

  // Calculate success
  const talentPoints = talentValue.value
  const remainingPoints = talentPoints - pointsNeeded
  const success = remainingPoints >= 0 || isCriticalSuccess

  // Calculate quality level
  let qualityLevel = 0
  if (success) {
    qualityLevel = 1 + Math.min(6, Math.floor(remainingPoints / 3))
    qualityLevel = Math.max(1, Math.min(qualityLevel, 6))
  }
  
  let criticalText = null
  if (isCriticalSuccess) {
    criticalText = 'Kritischer Erfolg!'
  } else if (isCriticalFailure) {
    criticalText = 'Patzer!'
  }

  // Set the result
  result.value = {
    type: 'talent',
    success: success,
    critical: criticalText,
    qualityLevel: qualityLevel,
    rolls: rolls,
    pointsNeeded: pointsNeeded,
    remainingPoints: remainingPoints,
    talentValue: talentValue.value,
    adjustedAttributes: adjustedAttributes.map(attr => ({
      name: attr.key,
      value: attr.value,
      adjustedValue: attr.adjustedValue,
      roll: rolls[adjustedAttributes.indexOf(attr)]
    })),
    modifier: modifier.value
  }
}

const reset = () => {
  diceValues.value = [0, 0, 0]
  modifier.value = 0
  result.value = null
}
</script>

<template>
  <div class="manual-dice-check">
    <h2>Manuelle Talentprobe</h2>
    
    <div class="controls">
      <!-- Talent Selection -->
      <div class="selection-panel">
        <h3>Talent auswählen</h3>
        <div v-if="characterStore.activeCharacter">
          <SearchableDropdown 
            v-model="selectedTalent" 
            @update:modelValue="updateTalent" 
            :items="talents"
            :display-field="item => item.label"
            :value-field="item => item"
            placeholder="Talent auswählen..."
          />
          
          <div class="talent-details" v-if="selectedTalent">
            <div class="talent-value">
              <strong>{{ selectedTalent.value }}:</strong> {{ talentValue }}
            </div>
            <div class="talent-attributes">
              <div v-for="(attr, index) in talentAttributes" :key="attr.key" class="talent-attribute">
                <strong>{{ attr.key }}:</strong> {{ attr.value }}
                <span v-if="modifier !== 0">
                  (Modifiziert: {{ attr.adjustedValue }})
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-character">
          Bitte wählen Sie einen Charakter aus.
        </div>
      </div>
      
      <!-- Dice Values Input -->
      <div class="dice-values" v-if="selectedTalent && talentAttributes.length > 0">
        <h3>Würfelwerte eingeben</h3>
        <div class="dice-inputs">
          <div v-for="(attr, index) in talentAttributes" :key="index" class="dice-input">
            <label>
              {{ attr.key }}:
            </label>
            <input 
              type="number" 
              v-model.number="diceValues[index]" 
              min="1" 
              max="20"
              placeholder="1-20"
            />
          </div>
        </div>
        
        <!-- Modifier -->
        <div class="modifier">
          <label for="modifier">Modifikator:</label>
          <input 
            id="modifier" 
            type="number" 
            v-model.number="modifier" 
            step="1"
          />
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="actions" v-if="selectedTalent && talentAttributes.length > 0">
        <button 
          class="calculate-button" 
          @click="calculateResult" 
          :disabled="!selectedTalent"
        >
          Ergebnis berechnen
        </button>
        <button class="reset-button" @click="reset">
          Zurücksetzen
        </button>
      </div>
    </div>
    
    <!-- Results -->
    <CheckResults v-if="result" :result="result" />
  </div>
</template>

<style scoped>
.manual-dice-check {
    color: white;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.controls {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
    max-width: 600px;
}

.selection-panel,
.dice-values {
    background: rgba(0, 0, 0, 0.2);
    padding: 1rem;
    border-radius: 8px;
    width: 100%;
}

.talent-value {
    margin-top: 1rem;
    font-size: 1.1rem;
    color: #42b983;
}

.talent-attributes {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.talent-attribute {
    padding: 0.25rem 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
}

.dice-inputs {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1rem;
}

.dice-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dice-input input {
    width: 70px;
    padding: 0.5rem;
    background: #333;
    color: white;
    border: 1px solid #444;
    border-radius: 4px;
    text-align: center;
}

.modifier {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 1rem;
}

.modifier input {
    width: 70px;
    padding: 0.5rem;
    background: #333;
    color: white;
    border: 1px solid #444;
    border-radius: 4px;
    text-align: center;
}

.actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
}

.calculate-button {
    padding: 0.75rem 1.5rem;
    background: #42b983;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.1rem;
}

.calculate-button:disabled {
    background: #2a7253;
    cursor: not-allowed;
}

.reset-button {
    padding: 0.75rem 1.5rem;
    background: #333;
    color: white;
    border: 1px solid #444;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.1rem;
}

.no-character {
    padding: 1rem;
    color: #ff6b6b;
    text-align: center;
}

@media (max-width: 600px) {
    .dice-inputs {
        flex-direction: column;
        align-items: center;
    }

    .actions {
        flex-direction: column;
    }
}
</style>