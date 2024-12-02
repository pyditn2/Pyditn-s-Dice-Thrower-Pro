<script setup>
import { ref, computed } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import DiceRoller from './DiceRoller.vue' 

const characterStore = useCharacterStore()
const selectedCheckType = ref('attribute')
const selectedAttribute = ref('MU')
const selectedTalent = ref('')
const selectedDice = ref('d20')
const diceCount = ref(1)
const modification = ref(0)



const throwDelay = 300

// Create refs for multiple dice rollers
const diceRollers = ref([])
const setDiceRollerRef = (el, index) => {
  if (el) {
    while (diceRollers.value.length <= index) {
      diceRollers.value.push(null)
    }
    diceRollers.value[index] = el
  }
}

const visibleDiceRollers = computed(() => {
  switch (selectedCheckType.value) {
    case 'attribute':
      return 1
    case 'talent':
      return 3
    case 'free':
      return 1
    default:
      return 1
  }
})

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

const categoryNames = {
  koerpertalente: 'Körpertalente',
  gesellschaftstalente: 'Gesellschaftstalente',
  naturtalente: 'Naturtalente',
  wissentalente: 'Wissenstalente',
  handwerkstalente: 'Handwerkstalente'
}

const performCheck = async () => {
  console.log('Check started')
  const THROW_DELAY = 100; // 100ms delay between throws
  
  try {
    let results = [];
    console.log('Selected check type:', selectedCheckType.value)
    
    switch (selectedCheckType.value) {
      case 'attribute':
        console.log('Rolling for attribute check')
        results = await diceRollers.value[0].rollDice('d20', 1);
        break;
        
  case 'talent':
  console.log('Rolling for talent check')
  
  // Start all rolls in quick succession
  diceRollers.value[0].startRoll()
  await new Promise(resolve => setTimeout(resolve, THROW_DELAY))
  
  diceRollers.value[1].startRoll()
  await new Promise(resolve => setTimeout(resolve, THROW_DELAY))
  
  diceRollers.value[2].startRoll()
  
  // Wait for all dice to settle
  const [result1, result2, result3] = await Promise.all([
    diceRollers.value[0].waitForSettling(),
    diceRollers.value[1].waitForSettling(),
    diceRollers.value[2].waitForSettling()
  ])
  
  // After all dice have settled, wait 4 seconds then reset all cameras
  setTimeout(() => {
    diceRollers.value.forEach(roller => {
      roller.resetCamera()
    })
  }, 4000)
  
  results = [...result1, ...result2, ...result3]
  break
        
      case 'free':
        console.log('Rolling free dice', selectedDice.value, diceCount.value)
        results = await diceRollers.value[0].rollDice(selectedDice.value, diceCount.value);
        break;
    }
    console.log('Roll results:', results);
  } catch (error) {
    console.error('Error during roll:', error);
    console.error(error.stack);
  }
}
</script>

<template>
  <div class="dice-check">
    <h2>Würfelprobe</h2>
    
    <!-- Check Type Selection -->
    <div class="check-type-selection">
      <div class="check-buttons">
        <button 
          :class="{ active: selectedCheckType === 'attribute' }"
          @click="selectedCheckType = 'attribute'"
        >
          Eigenschaftsprobe
        </button>
        <button 
          :class="{ active: selectedCheckType === 'talent' }"
          @click="selectedCheckType = 'talent'"
        >
          Talentprobe
        </button>
        <button 
          :class="{ active: selectedCheckType === 'free' }"
          @click="selectedCheckType = 'free'"
        >
          Freier Wurf
        </button>
      </div>

      <div class="character-info">
        <h3>{{ characterStore.characterInfo.name || 'Unbenannter Held' }}</h3>
        <div class="character-details" v-if="characterStore.characterInfo.spezies || characterStore.characterInfo.kultur">
          <span>{{ characterStore.characterInfo.spezies }}</span>
          <span v-if="characterStore.characterInfo.spezies && characterStore.characterInfo.kultur">•</span>
          <span>{{ characterStore.characterInfo.kultur }}</span>
        </div>
      </div>

      <!-- Dice Roller Container -->
      <div class="dice-rollers-container">
    <template v-for="index in visibleDiceRollers" :key="index">
      <div class="dice-roller-wrapper">
        <div class="dice-roller-label">
          {{ selectedCheckType === 'talent' ? `Würfel ${index}` : '' }}
        </div>
        <DiceRoller 
          :ref="(el) => setDiceRollerRef(el, index-1)"
          class="dice-roller"
        />
      </div>
    </template>
  </div>

      <!-- Check Configuration -->
      <div class="check-config">
        <div v-if="selectedCheckType === 'attribute'" class="attribute-select">
          <label>Eigenschaft:</label>
          <select v-model="selectedAttribute">
            <option v-for="(value, attr) in characterStore.stats.attributes" 
                    :key="attr" 
                    :value="attr">
              {{ attributeNames[attr] }} ({{ value }})
            </option>
          </select>
        </div>

        <div v-if="selectedCheckType === 'talent'" class="talent-select">
          <label>Talent:</label>
          <select v-model="selectedTalent">
            <optgroup v-for="(talents, category) in characterStore.talents" 
                      :key="category" 
                      :label="categoryNames[category]">
              <option v-for="talent in talents" 
                      :key="talent.name" 
                      :value="talent.name">
                {{ talent.name }} ({{ talent.value }})
              </option>
            </optgroup>
          </select>
        </div>

        <div v-if="selectedCheckType === 'free'" class="dice-select">
          <label>Würfel:</label>
          <select v-model="selectedDice">
            <option value="d4">D4</option>
            <option value="d6">D6</option>
            <option value="d8">D8</option>
            <option value="d10">D10</option>
            <option value="d12">D12</option>
            <option value="d20">D20</option>
            <option value="d100">D100</option>
          </select>
          <label class="ml-4">Anzahl:</label>
          <input type="number" v-model="diceCount" min="1" max="10" class="dice-count">
        </div>

        <div v-if="selectedCheckType !== 'free'" class="modification">
          <label>Erschwernis/Erleichterung:</label>
          <input type="number" v-model="modification" step="1" class="modification-input">
        </div>

        <button class="roll-button" @click="performCheck">Würfeln</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dice-check {
  color: #ffffff;
  padding: 1rem;
}

.check-type-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.check-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1rem 0;
}

.check-buttons button {
  padding: 0.5rem 1rem;
  background: #333333;
  color: #ffffff;
  border: 1px solid #444444;
  border-radius: 4px;
  cursor: pointer;
  min-width: 120px;
}

.check-buttons button:hover {
  background: #444444;
}

.check-buttons button.active {
  background: #42b983;
  border-color: #42b983;
}

.character-info {
  text-align: center;
  margin: 1rem 0;
}

.character-details {
  color: #999;
  margin-top: 0.5rem;
}

.dice-rollers-container {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin: 1rem 0;
  width: 100%;
}

.dice-roller-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 300px; /* Fixed width for each roller */
}

.dice-roller-label {
  color: #999;
  font-size: 0.9rem;
}

.dice-roller {
  width: 100%; /* Take full width of wrapper */
}

.check-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
  margin: 0 auto;
  padding: 1rem;
  background: #1a1a1a;
  border-radius: 8px;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #999;
}

select, input {
  width: 100%;
  padding: 0.5rem;
  background: #333333;
  color: #ffffff;
  border: 1px solid #444444;
  border-radius: 4px;
}

.dice-select {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: end;
}

.dice-count {
  width: 80px;
}

.modification-input {
  width: 100px;
}

.roll-button {
  padding: 0.75rem 2rem;
  background: #42b983;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1rem;
  margin-top: 1rem;
  width: 100%;
}

.roll-button:hover {
  background: #3aa876;
}

@media (max-width: 960px) {
  .dice-rollers-container {
    flex-direction: column;
    align-items: center;
  }
  
  .dice-roller-wrapper {
    width: 100%;
    max-width: 300px;
  }
}
</style>