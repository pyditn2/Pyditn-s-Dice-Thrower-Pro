<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
const selectedTalentId = ref(null)
const selectedWeaponId = ref(null)
const showDamageRoll = ref(false)

const tempATBonus = ref(0)
const tempDamageBonus = ref(0)
const criticalDamage = ref(null)
const extraD6Result = ref(null)

const rollExtraD6 = async () => {
  diceRoller1.value.updateViewMode(false)
  const roll = await diceRoller1.value.rollDice('d6', 1)
  extraD6Result.value = roll[0]
}

const selectedTalent = computed({
  get: () => {
    if (selectedTalentId.value === null && talents.value.length > 0) {
      selectedTalentId.value = talents.value[0].name
    }
    return talents.value.find(talent => talent.name === selectedTalentId.value) || null
  },
  set: (newTalent) => {
    selectedTalentId.value = newTalent?.name || null
  }
})

const weapons = computed(() => {
  return characterStore.activeCharacter?.weapons || []
})

const selectedWeapon = computed({
  get: () => weapons.value.find(weapon => weapon.id === selectedWeaponId.value) || null,
  set: (newWeapon) => {
    selectedWeaponId.value = newWeapon?.id || null
    showDamageRoll.value = false
  }
})

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


const rollDamage = async (weapon) => {
  const { diceCount, diceType, modifier } = weapon.tp
  console.log("Starting damage roll for:", { diceCount, diceType, modifier });

  diceRoller1.value.updateViewMode(true)
  const rolls = await diceRoller1.value.rollDice(`d${diceType}`, diceCount)
  console.log("Damage roll results:", rolls);
  const tempBonus = tempDamageBonus.value || 0
  const damage = rolls.reduce((sum, roll) => sum + roll, 0) + modifier + tempBonus

  result.value = {
    ...result.value,
    damageRolls: rolls,
    totalDamage: damage,
    damageModifier: modifier,
    tempDamageBonus: tempBonus
  }
  console.log("Updated result with damage:", result.value);
}

const rollCriticalDamage = async () => {
  diceRoller1.value.updateViewMode(false)
  const roll = await diceRoller1.value.rollDice('d6', 1)
  criticalDamage.value = roll[0]
}

const performCheck = async () => {
  console.log('performCheck called', { currentCheckType: currentCheckType.value });
  if (!characterStore.activeCharacter) {
    alert('Bitte wählen Sie zuerst einen Charakter aus.')
    return
  }

  showDamageRoll.value = false

  try {
    if (currentCheckType.value === CHECK_TYPES.ATTRIBUTE) {
      diceRoller1.value.updateViewMode(false)
      const roll = await diceRoller1.value.rollDice('d20', 1)
      console.log("Attribute check roll result:", roll);
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
      console.log("Attribute check result set:", result.value);

    } else if (currentCheckType.value === CHECK_TYPES.TALENT) {
      const talent = selectedTalent.value
      if (!talent) return

      diceRoller1.value.updateViewMode(true)
      const rolls = await diceRoller1.value.rollDice('d20', 3)
      console.log("Talent check roll results:", rolls);
      const flatRolls = rolls.flat()
      console.log("Flattened talent rolls:", flatRolls);

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
        console.log("Talent check critical result set:", result.value);
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
        console.log("Talent check normal result set:", result.value);
      }
    } else if (currentCheckType.value === CHECK_TYPES.COMBAT) {
      if (!selectedWeapon.value) {
        alert('Bitte wählen Sie eine Waffe aus.')
        return
      }

      diceRoller1.value.updateViewMode(false)
      const roll = await diceRoller1.value.rollDice('d20', 1)
      const baseAttackValue = selectedWeapon.value.at + selectedWeapon.value.atBonus
      const tempBonus = tempATBonus.value || 0
      const attackValue = baseAttackValue + tempBonus

      const success = roll[0] === 1 || (roll[0] <= attackValue && roll[0] !== 20)
      const remainingPoints = success ? attackValue - roll[0] : 0
      const qualityLevel = success ? calculateQS(remainingPoints) : 0

      result.value = {
        type: 'combat',
        weapon: selectedWeapon.value.name,
        rolls: [roll[0]],
        baseTarget: baseAttackValue,
        tempATBonus: tempBonus,
        target: attackValue,
        success,
        remainingPoints,
        qualityLevel,
        critical: roll[0] === 1 ? 'Kritischer Treffer!' : (roll[0] === 20 ? 'Patzer!' : null)
      }

      if (success) {
        showDamageRoll.value = true
      }


    }
  } catch (error) {
    console.error('Error during check:', error)
  }
}

watch(currentCheckType, (newType) => {
  // Reset common states
  result.value = null
  modifier.value = 0
  criticalDamage.value = null
  extraD6Result.value = null
  showDamageRoll.value = false

  // Reset combat-specific states when switching to combat mode
  if (newType === CHECK_TYPES.COMBAT) {
    tempATBonus.value = 0
    tempDamageBonus.value = 0
  }
})

</script>

<template>
  <div class="dice-check">
    <div v-if="characterStore.activeCharacter">
      <h2>Würfelprobe</h2>

      <!-- Simplified dice roller container -->
      <DiceRoller ref="diceRoller1" class="dice-roller" />

      <!-- Labels container -->
      <div class="dice-labels">
        <!-- Single label for attribute check -->
        <div v-if="currentCheckType === CHECK_TYPES.ATTRIBUTE" class="single-dice-label">
          {{ selectedAttribute }} ({{ getAttributeValue(selectedAttribute) }})
        </div>
        <!-- Three labels for talent check -->
        <div v-else-if="currentCheckType === CHECK_TYPES.TALENT && selectedTalent" class="talent-dice-labels">
          <div v-for="(attr, index) in selectedTalent.attributes" :key="index" class="dice-label">
            {{ attr }} ({{ getAttributeValue(attr) }})
          </div>
        </div>
        <!-- Labels for combat check -->
        <template v-else-if="currentCheckType === CHECK_TYPES.COMBAT && selectedWeapon">
          <div v-if="!showDamageRoll" class="single-dice-label">
            {{ selectedWeapon.name }} (AT: {{ selectedWeapon.at + selectedWeapon.atBonus }})
          </div>
          <div v-else class="damage-dice-labels">
            <div v-for="(roll, index) in (selectedWeapon.tp.diceCount)" :key="index" class="dice-label">
              W{{ selectedWeapon.tp.diceType }}
            </div>
          </div>
        </template>
      </div>

      <!-- Controls -->
      <div class="controls">
        <div class="check-type">
          <button :class="{ active: currentCheckType === CHECK_TYPES.ATTRIBUTE }"
            @click="currentCheckType = CHECK_TYPES.ATTRIBUTE">
            Eigenschaftsprobe
          </button>
          <button :class="{ active: currentCheckType === CHECK_TYPES.TALENT }"
            @click="currentCheckType = CHECK_TYPES.TALENT">
            Talentprobe
          </button>
          <button :class="{ active: currentCheckType === CHECK_TYPES.COMBAT }"
            @click="currentCheckType = CHECK_TYPES.COMBAT">
            Kampfprobe
          </button>
        </div>

        <div class="selection" v-if="currentCheckType === CHECK_TYPES.ATTRIBUTE">
          <SearchableDropdown v-model="selectedAttributeObject" :items="attributes" :display-field="(item) => item.name"
            :value-field="(item) => item.value" placeholder="Attribut aussuchen..." />
        </div>

        <div v-if="currentCheckType === CHECK_TYPES.TALENT" class="talent-selection">
          <SearchableDropdown v-model="selectedTalent" :items="talents" :display-field="(item) => item.name"
            :value-field="(item) => item.value" placeholder="Talent aussuchen..." />
        </div>

        <div v-if="currentCheckType === CHECK_TYPES.COMBAT" class="weapon-selection">
          <SearchableDropdown v-model="selectedWeapon" :items="weapons" :display-field="(item) => item.name"
            :value-field="(item) => item.id" placeholder="Waffe aussuchen..." />

          <div v-if="selectedWeapon" class="weapon-info">
            <div>AT: {{ selectedWeapon.at + selectedWeapon.atBonus }}</div>
            <div>Schaden: {{ selectedWeapon.tp.diceCount }}W{{ selectedWeapon.tp.diceType }}+{{
              selectedWeapon.tp.modifier }}
            </div>
          </div>

          <!-- Temporary bonus section -->
          <div class="temp-bonuses">
            <div class="bonus-input">
              <label for="tempAT">Temp. AT Bonus:</label>
              <input id="tempAT" type="number" v-model.number="tempATBonus" class="bonus-number" />
            </div>
            <div class="bonus-input">
              <label for="tempDamage">Temp. TP Bonus:</label>
              <input id="tempDamage" type="number" v-model.number="tempDamageBonus" class="bonus-number" />
            </div>
          </div>
        </div>

        <div class="modifier" v-if="currentCheckType !== CHECK_TYPES.COMBAT">
          <label for="modifier">Erleichterung/Erschwernis:</label>
          <input id="modifier" type="number" v-model.number="modifier" />
        </div>

        <div class="button-group">
          <button class="roll-button" @click="performCheck">
            Würfeln
          </button>
          <button v-if="currentCheckType === CHECK_TYPES.COMBAT" class="w6-button" @click="rollExtraD6">
            W6
          </button>
          <button
            v-if="currentCheckType === CHECK_TYPES.TALENT || (currentCheckType === CHECK_TYPES.COMBAT && showDamageRoll)"
            class="camera-reset-button" @click="resetAllCameras">
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
        <div v-if="result.success && result.type !== 'combat'" class="result-qs">QS {{ result.qualityLevel }}</div>
        <div class="result-line">Würfe: {{ result.rolls.join(', ') }}</div>

        <template v-if="result.type === 'attribute'">
          <div class="result-line">Zielwert: {{ result.target }} (Angepasst: {{ result.adjustedTarget }})</div>
          <div v-if="result.success" class="result-line">Übrige Punkte: {{ result.remainingPoints }}</div>
          <div class="result-line">Modifikator: {{ result.modifier }}</div>
        </template>

        <template v-else-if="result.type === 'talent'">
          <div class="result-line">Benötigte Punkte: {{ result.pointsNeeded }}</div>
          <div v-if="result.success" class="result-line">Übrige Punkte: {{ result.remainingPoints }}</div>
          <div class="result-line" v-for="attr in result.adjustedAttributes" :key="attr.name">
            {{ attr.name }}: {{ attr.value }} (Angepasst: {{ attr.adjustedValue }})
          </div>
          <div class="result-line">Modifikator: {{ result.modifier }}</div>
        </template>

        <template v-else-if="result.type === 'combat'">
          <div class="result-line">
            <div>Waffe: {{ result.weapon }}</div>
            <div>Angriffswert: {{ result.baseTarget }}
              {{ result.tempATBonus ? ` + ${result.tempATBonus}` : '' }}
              = {{ result.target }}
            </div>

            <template v-if="result.success">
              <!-- Show damage roll button if attack was successful and damage hasn't been rolled yet -->
              <div v-if="!result.damageRolls" class="damage-roll-section">
                <button class="damage-roll-button" @click="rollDamage(selectedWeapon)">
                  Schaden würfeln
                </button>
              </div>
              <!-- Show damage results only after they've been rolled -->
              <div v-else class="damage-result">
                <div>Schaden: {{ result.totalDamage }}</div>
                <div class="damage-rolls">
                  ({{ result.damageRolls.join(' + ') }})
                  {{ result.damageModifier ? ' + ' + result.damageModifier : '' }}
                  {{ result.tempDamageBonus ? ' + ' + result.tempDamageBonus : '' }}
                </div>
              </div>
            </template>

            <!-- Critical damage section -->
            <template v-if="result.critical && result.critical.includes('Kritischer')">
              <div class="critical-damage-section">
                <div v-if="!criticalDamage">
                  <button class="critical-roll-button" @click="rollCriticalDamage">
                    Kritischen Schaden würfeln
                  </button>
                </div>
                <div v-else class="critical-damage-result">
                  Kritischer Schaden: {{ criticalDamage }}
                </div>
              </div>
            </template>
          </div>

          <!-- Remove or modify this section -->
          <div class="result-line">
            <div v-if="result.tempATBonus">Temporärer AT Bonus: {{ result.tempATBonus }}</div>
            <div v-if="result.tempDamageBonus">Temporärer Schaden Bonus: {{ result.tempDamageBonus }}</div>
          </div>
        </template>


      </div>
    </div>
    <div v-else class="no-character-selected">
      <p>Bitte wählen Sie einen Charakter aus um Würfelproben durchzuführen.</p>
    </div>
  </div>
</template>

<style scoped>
.d6-roll-section {
  margin-top: 0.5rem;
}

.d6-roll-button {
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.d6-roll-button:hover {
  background: #3aa876;
}

.extra-d6-result {
  margin-top: 0.5rem;
  font-weight: bold;
  color: #42b983;
}

.damage-roll-button {
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.damage-roll-button:hover {
  background: #3aa876;
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

.dice-roller {
  width: 100%;
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

.dice-labels {
  width: 100%;
  text-align: center;
  margin-bottom: 1rem;
}

.single-dice-label,
.dice-label {
  text-align: center;
  color: #42b983;
  text-shadow: #42b983 0 0 4px;
  font-weight: bold;
  font-size: 0.9rem;
  margin: 0.5rem auto;
}

.talent-dice-labels,
.damage-dice-labels {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
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
  white-space: nowrap;
}

.selection,
.talent-selection,
.weapon-selection {
  width: 100%;
}

.check-type button.active {
  background: #42b983;
  border-color: #42b983;
}

.weapon-info {
  display: flex;
  justify-content: center;
  gap: 2rem;
  color: #42b983;
  font-weight: bold;
  margin-top: 0.5rem;
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

.damage-result {
  margin-top: 0.5rem;
  font-size: 1.2rem;
  color: #ff6b6b;
}

.damage-rolls {
  font-size: 0.9rem;
  color: #999;
  margin-top: 0.25rem;
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

.roll-line,
.points-line {
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
  .check-type {
    flex-direction: column;
  }

  .dice-wrapper {
    width: 100%;
    max-width: 300px;
  }
}

.temp-bonuses {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.bonus-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bonus-input label {
  color: #999;
  font-size: 0.9rem;
  min-width: 160px;
}

.bonus-input .bonus-number {
  width: 60px;
  padding: 0.25rem;
  background: #444;
  border: 1px solid #555;
  color: white;
  border-radius: 4px;
  text-align: center;
}

@media (max-width: 768px) {
  .bonus-input {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }
  
  .bonus-input label {
    min-width: unset;
  }
  
  .bonus-input .bonus-number {
    width: 100%;
  }
}
</style>