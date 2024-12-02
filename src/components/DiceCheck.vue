<template>
  <div class="dice-check">
    <h2>Würfelprobe</h2>
    
    <!-- Dice roller container -->
    <div class="dice-rollers">
      <!-- Always show first dice -->
      <div class="dice-wrapper">
        <DiceRoller ref="diceRoller1" class="dice-roller" />
        <div v-if="selectedTalent && checkType === 'talent'" class="dice-label">
          {{ selectedTalentData?.attributes[0] }} ({{ getAttributeValue(selectedTalentData?.attributes[0]) }})
        </div>
      </div>
      
      <!-- Show additional dice for talent checks -->
      <template v-if="checkType === 'talent'">
        <div class="dice-wrapper">
          <DiceRoller ref="diceRoller2" class="dice-roller" />
          <div class="dice-label">
            {{ selectedTalentData?.attributes[1] }} ({{ getAttributeValue(selectedTalentData?.attributes[1]) }})
          </div>
        </div>
        
        <div class="dice-wrapper">
          <DiceRoller ref="diceRoller3" class="dice-roller" />
          <div class="dice-label">
            {{ selectedTalentData?.attributes[2] }} ({{ getAttributeValue(selectedTalentData?.attributes[2]) }})
          </div>
        </div>
      </template>
    </div>
    
    <!-- Controls -->
    <div class="controls">
      <div class="check-type">
        <button 
          :class="{ active: checkType === 'attribute' }"
          @click="checkType = 'attribute'"
        >
          Eigenschaftsprobe
        </button>
        <button 
          :class="{ active: checkType === 'talent' }"
          @click="checkType = 'talent'"
        >
          Talentprobe
        </button>
      </div>
      
      <div class="selection" v-if="checkType === 'attribute'">
        <select v-model="selectedAttribute">
          <option value="MU">Mut</option>
          <option value="KL">Klugheit</option>
          <option value="IN">Intuition</option>
          <option value="CH">Charisma</option>
          <option value="FF">Fingerfertigkeit</option>
          <option value="GE">Gewandheit</option>
          <option value="KO">Konstitution</option>
          <option value="KK">Körperkraft</option>
        </select>
      </div>
      
      <div v-if="checkType === 'talent'" class="talent-selection">
        <select v-model="selectedTalent">
          <option v-for="talent in talents" :key="talent.name" :value="talent.name">
            {{ talent.name }} ({{ talent.value }})
          </option>
        </select>
        <div v-if="selectedTalentData" class="talent-info">
          Talentwert: {{ selectedTalentData.value }}
        </div>
      </div>
      
      <button class="roll-button" @click="performCheck">
        Würfeln
      </button>
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import DiceRoller from './DiceRoller.vue'

const characterStore = useCharacterStore()
const diceRoller1 = ref(null)
const diceRoller2 = ref(null)
const diceRoller3 = ref(null)
const checkType = ref('attribute')
const selectedAttribute = ref('MU')
const selectedTalent = ref('')
const result = ref(null)

// Get talents from store
const talents = computed(() => {
  const allTalents = []
  for (const category in characterStore.talents) {
    allTalents.push(...characterStore.talents[category])
  }
  return allTalents
})

const selectedTalentData = computed(() => {
  if (!selectedTalent.value) return null
  
  for (const category in characterStore.talents) {
    const talent = characterStore.talents[category].find(t => t.name === selectedTalent.value)
    if (talent) return talent
  }
  return null
})

// Helper function to get attribute value
const getAttributeValue = (attr) => {
  return characterStore.stats.attributes[attr] || 0
}

const calculateQS = (remainingPoints) => {
  if (remainingPoints >= 16) return 6;
  if (remainingPoints >= 13) return 5;
  if (remainingPoints >= 10) return 4;
  if (remainingPoints >= 7) return 3;
  if (remainingPoints >= 4) return 2;
  return 1;
}

const checkCriticalRolls = (rolls) => {
  const ones = rolls.filter(r => r === 1).length;
  const twenties = rolls.filter(r => r === 20).length;
  
  if (ones >= 2) return { type: 'spectacular', success: true, message: 'Spektakulärer Erfolg!' };
  if (twenties >= 2) return { type: 'catastrophic', success: false, message: 'Spektakulärer Patzer!' };
  if (ones === 1) return { type: 'critical', success: true, message: 'Kritischer Erfolg!' };
  if (twenties === 1) return { type: 'fumble', success: false, message: 'Patzer!' };
  return null;
}

const performCheck = async () => {
  try {
    if (checkType.value === 'attribute') {
      const roll = await diceRoller1.value.rollDice('d20', 1)
      const attributeValue = characterStore.stats.attributes[selectedAttribute.value]
      
      // Automatic success on 1, automatic failure on 20
      const success = roll[0] === 1 || (roll[0] <= attributeValue && roll[0] !== 20)
      const remainingPoints = success ? attributeValue - roll[0] : 0
      const qualityLevel = success ? calculateQS(remainingPoints) : 0
      
      result.value = {
        type: 'attribute',
        attribute: selectedAttribute.value,
        roll: roll[0],
        target: attributeValue,
        success,
        remainingPoints,
        qualityLevel,
        critical: roll[0] === 1 ? 'Kritischer Erfolg!' : (roll[0] === 20 ? 'Patzer!' : null)
      }
    } else {
      const talent = talents.value.find(t => t.name === selectedTalent.value)
      if (!talent) return
      
      diceRoller1.value.startRoll()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      diceRoller2.value.startRoll()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      diceRoller3.value.startRoll()
      
      const [roll1, roll2, roll3] = await Promise.all([
        diceRoller1.value.waitForSettling(),
        diceRoller2.value.waitForSettling(),
        diceRoller3.value.waitForSettling()
      ])
      
      const rolls = [roll1[0], roll2[0], roll3[0]]
      
      // Check for critical rolls first
      const criticalResult = checkCriticalRolls(rolls)
      
      if (criticalResult) {
        const pointsNeeded = criticalResult.success ? 0 : talent.value + 1 
        const remainingPoints = criticalResult.success ? talent.value : -1
        const qualityLevel = criticalResult.success ? calculateQS(remainingPoints) : 0
        
        result.value = {
          type: 'talent',
          talent: talent.name,
          rolls,
          pointsNeeded,
          remainingPoints,
          success: criticalResult.success,
          qualityLevel,
          critical: criticalResult.message
        }
      } else {
        let pointsNeeded = 0
        talent.attributes.forEach((attr, index) => {
          const attrValue = characterStore.stats.attributes[attr]
          if (rolls[index] > attrValue) {
            pointsNeeded += rolls[index] - attrValue
          }
        })
        
        const remainingPoints = talent.value - pointsNeeded
        const success = pointsNeeded <= talent.value
        const qualityLevel = success ? calculateQS(remainingPoints) : 0

        result.value = {
          type: 'talent',
          talent: talent.name,
          rolls,
          pointsNeeded,
          remainingPoints,
          success,
          qualityLevel
        }
      }
    }
  } catch (error) {
    console.error('Error during check:', error)
  }
}

const formatResult = (res) => {
  if (res.type === 'attribute') {
    return `Würfelwurf: ${res.roll} gegen ${res.target} (${res.attribute}) - ${res.success ? 'Erfolg!' : 'Misserfolg!'}`
  } else {
    return `Würfe: ${res.rolls.join(', ')} - Benötigte Punkte: ${res.pointsNeeded} - ${res.success ? 'Erfolg!' : 'Misserfolg!'}`
  }
}
</script>

<style scoped>
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

.dice-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.dice-label {
  color: #999;
  font-size: 0.9rem;
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
}

.check-type {
  display: flex;
  gap: 0.5rem;
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

.roll-button {
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