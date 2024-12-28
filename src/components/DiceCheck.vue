<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import { useDiceRollerStore } from '../stores/diceRollerStore'
import DiceRoller from './DiceRoller.vue'
import CharacterSelector from './CharacterSelector.vue'
import SearchableDropdown from './SearchableDropdown.vue'
import { CHECK_TYPES, DICE_TYPES } from '../constants/diceTypes'

const characterStore = useCharacterStore()
const diceRollerStore = useDiceRollerStore()
const diceRoller1 = ref(null)
const selectedAttribute = ref('MU')
const selectedTalent = ref(null)
const result = ref(null)
const diceRollers = ref([])
const currentCheckType = ref(CHECK_TYPES.ATTRIBUTE)
const modifier = ref(0)

// Define attributes list
const attributes = [
  { name: 'Mut', value: 'MU' },
  { name: 'Klugheit', value: 'KL' },
  { name: 'Intuition', value: 'IN' },
  { name: 'Charisma', value: 'CH' },
  { name: 'Fingerfertigkeit', value: 'FF' },
  { name: 'Gewandheit', value: 'GE' },
  { name: 'Konstitution', value: 'KO' },
  { name: 'Körperkraft', value: 'KK' }
]

// Get talents from store
const talents = computed(() => {
  if (!characterStore.activeCharacter) return []
  
  const allTalents = []
  for (const category in characterStore.activeCharacter.talents) {
    allTalents.push(...characterStore.activeCharacter.talents[category])
  }
  return allTalents
})

const selectedAttributeObject = computed({
  get: () => attributes.find(attr => attr.value === selectedAttribute.value) || attributes[0],
  set: (newValue) => {
    selectedAttribute.value = newValue?.value || 'MU'
  }
})

const getAttributeValue = (attributeKey) => {
  return characterStore.activeCharacter?.stats.attributes[attributeKey] ?? 0
}

const resetAllCameras = () => {
  diceRoller1.value?.updateViewMode(true)
  setTimeout(() => { 
    diceRoller1.value?.resetCamera()
  }, 0)
}

const calculateQS = (remainingPoints) => {
  if (remainingPoints >= 16) return 6
  if (remainingPoints >= 13) return 5
  if (remainingPoints >= 10) return 4
  if (remainingPoints >= 7) return 3
  if (remainingPoints >= 4) return 2
  return 1
}

const checkCriticalRolls = (rolls) => {
  const ones = rolls.filter(r => r === 1).length
  const twenties = rolls.filter(r => r === 20).length
  
  if (ones >= 2) return { type: 'spectacular', success: true, message: 'Spektakulärer Erfolg!' }
  if (twenties >= 2) return { type: 'catastrophic', success: false, message: 'Spektakulärer Patzer!' }
  if (ones === 1) return { type: 'critical', success: true, message: 'Kritischer Erfolg!' }
  if (twenties === 1) return { type: 'fumble', success: false, message: 'Patzer!' }
  return null
}

const performCheck = async () => {
  console.log('performCheck called')
  if (!characterStore.activeCharacter) {
    alert('Bitte wählen Sie zuerst einen Charakter aus.')
    return
  }
  try {
    if (currentCheckType.value === CHECK_TYPES.ATTRIBUTE) {
      diceRoller1.value.updateViewMode(false)
      const roll = await diceRoller1.value.rollDice('d20', 1)
      const attributeValue = getAttributeValue(selectedAttribute.value)
      const adjustedAttributeValue = attributeValue + modifier.value
      
      const success = roll[0] === 1 || (roll[0] <= adjustedAttributeValue && roll[0] !== 20)
      const remainingPoints = success ? adjustedAttributeValue - roll[0] : 0
      const qualityLevel = success ? calculateQS(remainingPoints) : 0
      
      result.value = {
        type: 'attribute',
        attribute: selectedAttribute.value,
        rolls: [roll[0]],
        roll: roll[0],
        target: attributeValue,
        adjustedTarget: adjustedAttributeValue,
        modifier: modifier.value,
        success,
        remainingPoints,
        qualityLevel,
        critical: roll[0] === 1 ? 'Kritischer Erfolg!' : (roll[0] === 20 ? 'Patzer!' : null)
      }
    } else if (currentCheckType.value === CHECK_TYPES.TALENT) {
      const talent = selectedTalent.value
      if (!talent) return

      diceRoller1.value.updateViewMode(true)
      const rolls = await diceRoller1.value.rollDice('d20', 3)
      const flatRolls = rolls.flat()
      
      const criticalResult = checkCriticalRolls(flatRolls)
      
      if (criticalResult) {
        const pointsNeeded = criticalResult.success ? 0 : talent.value + 1 
        const remainingPoints = criticalResult.success ? talent.value : -1
        const qualityLevel = criticalResult.success ? calculateQS(remainingPoints) : 0
        
        result.value = {
          type: 'talent',
          talent: talent.name,
          rolls: flatRolls,
          pointsNeeded,
          remainingPoints,
          success: criticalResult.success,
          qualityLevel,
          critical: criticalResult.message,
          modifier: modifier.value
        }
      } else {
        let pointsNeeded = 0
        const adjustedAttributes = talent.attributes.map(attr => ({
          name: attr,
          value: getAttributeValue(attr),
          adjustedValue: getAttributeValue(attr) + modifier.value
        }))
        
        adjustedAttributes.forEach((attr, index) => {
          if (flatRolls[index] > attr.adjustedValue) {
            pointsNeeded += flatRolls[index] - attr.adjustedValue
          }
        })
        
        const remainingPoints = talent.value - pointsNeeded
        const success = pointsNeeded <= talent.value
        const qualityLevel = success ? calculateQS(remainingPoints) : 0

        result.value = {
          type: 'talent',
          talent: talent.name,
          rolls: flatRolls,
          pointsNeeded,
          remainingPoints,
          success,
          qualityLevel,
          adjustedAttributes,
          modifier: modifier.value
        }
      }
    }
  } catch (error) {
    console.error('Error during check:', error)
  }
}
</script>

<template>
  <div class="dice-check">
    <CharacterSelector />
    
    <div v-if="characterStore.activeCharacter">
      <h2>Würfelprobe</h2>
      
      <!-- Dice roller container -->
      <div class="dice-rollers">
        <div class="dice-views">
          <div class="dice-wrapper">
            <DiceRoller ref="diceRoller1" class="dice-roller" />
            <!-- Single label for attribute check -->
            <div v-if="currentCheckType === CHECK_TYPES.ATTRIBUTE" class="single-dice-label">
              {{ selectedAttribute }} ({{ getAttributeValue(selectedAttribute) }})
            </div>
            <!-- Three labels for talent check -->
            <div v-else-if="selectedTalent" class="talent-dice-labels">
              <div v-for="(attr, index) in selectedTalent.attributes" 
                   :key="index" 
                   class="dice-label"
                   :style="{ width: '300px' }">
                {{ attr }} ({{ getAttributeValue(attr) }})
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Controls -->
      <div class="controls">
        <div class="check-type">
          <button 
            :class="{ active: currentCheckType === CHECK_TYPES.ATTRIBUTE }"
            @click="currentCheckType = CHECK_TYPES.ATTRIBUTE"
          >
            Eigenschaftsprobe
          </button>
          <button 
            :class="{ active: currentCheckType === CHECK_TYPES.TALENT }"
            @click="currentCheckType = CHECK_TYPES.TALENT"
          >
            Talentprobe
          </button>
        </div>
        
        <div class="selection" v-if="currentCheckType === CHECK_TYPES.ATTRIBUTE">
          <SearchableDropdown
            v-model="selectedAttributeObject"
            :items="attributes"
            :display-field="(item) => item.name"
            :value-field="(item) => item.value"
            placeholder="Select an attribute..."
          />
        </div>
        
        <div v-if="currentCheckType === CHECK_TYPES.TALENT" class="talent-selection">
          <SearchableDropdown
            v-model="selectedTalent"
            :items="talents"
            :display-field="(item) => item.name"
            :value-field="(item) => item.value"
            placeholder="Search for a talent..."
          />
        </div>
        
        <div class="modifier">
          <label for="modifier">Erleichterung/Erschwernis:</label>
          <input id="modifier" type="number" v-model.number="modifier" />
        </div>
        
        <div class="button-group">
          <button class="roll-button" @click="performCheck">
            Würfeln
          </button>
          <button 
            v-if="currentCheckType === CHECK_TYPES.TALENT" 
            class="camera-reset-button" 
            @click="resetAllCameras"
          >
            🎲
          </button>
        </div>
      </div>
      
      <!-- Result display -->
      <div v-if="result" class="result" :class="{ 
        success: result.success,
        critical: result.critical && result.success,
        fumble: result.critical && !result.success
      }">
        <div class="success-indicator">
          {{ result.critical || (result.success ? 'Erfolg!' : 'Misserfolg!') }}
        </div>
        <div v-if="result.success" class="result-qs">QS {{ result.qualityLevel }}</div>
        <div class="result-line">Würfe: {{ result.rolls.join(', ') }}</div>
        <div class="result-line">Benötigte Punkte: {{ result.pointsNeeded }}</div>
        <div v-if="result.success" class="result-line">Übrige Punkte: {{ result.remainingPoints }}</div>
        <div class="result-line">Modifikator: {{ result.modifier }}</div>
        <div v-if="result.type === 'attribute'" class="result-line">
          Zielwert: {{ result.target }} (Angepasst: {{ result.adjustedTarget }})
        </div>
        <div v-if="result.type === 'talent'" class="result-line">
          <div v-for="attr in result.adjustedAttributes" :key="attr.name">
            {{ attr.name }}: {{ attr.value }} (Angepasst: {{ attr.adjustedValue }})
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-character-selected">
      <p>Bitte wählen Sie einen Charakter aus um Würfelproben durchzuführen.</p>
    </div>
  </div>
</template>

<style scoped>


.talent-search:focus {
  outline: none;
  border-color: #42b983;
}


.talent-option:hover {
  background: #333;
}

.talent-option.selected {
  background: #42b983;
  color: white;
}

.character-selection-bar {
  margin-bottom: 1rem;
  width: 100%;
  max-width: 400px;
}

.character-select {
  width: 100%;
  padding: 0.5rem;
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
}

.no-character-selected {
  text-align: center;
  padding: 2rem;
  background: #1a1a1a;
  border-radius: 4px;
  color: #999;
}

.dice-check {
  color: white;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.dice-rollers {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  max-width: 1000px;
}

.modifier {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modifier input {
  width: 60px;
  padding: 0.5rem;
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
}

.dice-views {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.dice-roller {
  width: 300px;
  height: 300px;
}

.talent-dice-views {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.dice-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.single-dice-label {
  text-align: center;
  color: #42b983;
  font-weight: bold;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.talent-dice-labels {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 0 1rem;
  margin-top: 0.5rem;
}

.dice-label {
  text-align: center;
  color: #42b983;
  font-weight: bold;
  font-size: 0.9rem;
  flex: 1;
  margin: 0 0.5rem;
}

.dice-roller {
  width: 300px;
  height: 300px;
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

.check-type {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.check-type button {
  flex: 1;
  padding: 0.5rem;
  background: #333;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}
.selection, .talent-selection {
  width: 100%;
}

.check-type button.active {
  background: #42b983;
  border-color: #42b983;
}

.selection select {
  width: 100%;
  padding: 0.5rem;
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
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

.result {
  background: #1a472a;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  width: 100%;
  max-width: 400px;
  margin: 1rem auto;
}

.result:not(.success) {
  background: #4a1a1a;
}

.result.critical {
  background: #2a5a3a;
  animation: glow 1s ease-in-out infinite alternate;
}

.result.fumble {
  background: #5a2a2a; 
  animation: glow 1s ease-in-out infinite alternate;
}

@keyframes glow {
  from {
    box-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #e60073;
  }
  to {
    box-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #e60073;
  }
}

.success-indicator {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.result-qs {
  font-size: 1.8rem;
  font-weight: bold;
  margin: 0.5rem 0;
}

.result-line {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.roll-line, .points-line {
  font-size: 1.1rem;
}

.talent-selection {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.talent-info {
  color: #42b983;
  text-align: center;
  font-weight: bold;
}

.quality-level {
  font-size: 1.2em;
  font-weight: bold;
  color: #42b983;
  margin: 0.5rem 0;
}

.camera-controls {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
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

@media (max-width: 960px) {
  .dice-rollers {
    flex-direction: column;
    align-items: center;
  }
  
  .dice-wrapper {
    width: 100%;
    max-width: 300px;
  }
}
</style>