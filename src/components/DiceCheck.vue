<script setup>
import { ref, computed, watch } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import { useDiceRollerStore } from '../stores/diceRollerStore'
import { useDiceAppearanceStore } from '../stores/diceAppearanceStore'
import { CHECK_TYPES } from '../constants/diceTypes'
import DiceRoller from './DiceRoller.vue'
import DiceLabels from './DiceLabels.vue'
import CheckTypeSelector from './CheckTypeSelector.vue'
import AttributeControls from './AttributeControls.vue'
import TalentControls from './TalentControls.vue'
import CombatControls from './CombatControls.vue'
import ModifierControl from './ModifierControl.vue'
import ActionButtons from './ActionButtons.vue'
import CheckResults from './CheckResults.vue'

// Store initialization
const characterStore = useCharacterStore()
const diceRollerStore = useDiceRollerStore()
const diceAppearanceStore = useDiceAppearanceStore()

// Core refs
const diceRoller1 = ref(null)
const selectedAttribute = ref('MU')
const selectedTalentId = ref(null)
const selectedWeaponId = ref(null)
const showDamageRoll = ref(false)
const result = ref(null)
const modifier = ref(0)
const currentCheckType = ref(CHECK_TYPES.ATTRIBUTE)

// Combat-specific refs
const tempATBonus = ref(0)
const tempDamageBonus = ref(0)
const criticalDamage = ref(null)
const extraD6Result = ref(null)
const isDualWielding = ref(false)
const selectedSecondaryWeaponId = ref(null)
const tempSecondaryATBonus = ref(0)
const tempSecondaryDamageBonus = ref(0)

// Attributes definition
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

// Computed properties
const selectedAttributeObject = computed({
  get: () => attributes.find(attr => attr.value === selectedAttribute.value) || attributes[0],
  set: (newValue) => {
    selectedAttribute.value = newValue?.value || 'MU'
  }
})

const talents = computed(() => {
  if (!characterStore.activeCharacter) return []
  const allTalents = []
  for (const category in characterStore.activeCharacter.talents) {
    allTalents.push(...characterStore.activeCharacter.talents[category])
  }
  return allTalents
})

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

const selectedSecondaryWeapon = computed({
  get: () => weapons.value.find(weapon => weapon.id === selectedSecondaryWeaponId.value) || null,
  set: (newWeapon) => {
    selectedSecondaryWeaponId.value = newWeapon?.id || null
  }
})

// Core methods
const getAttributeValue = (attributeKey) => {
  return characterStore.activeCharacter?.stats.attributes[attributeKey] ?? 0
}

const resetAllCameras = () => {
  diceRoller1.value?.updateViewMode(true)
  setTimeout(() => {
    diceRoller1.value?.resetCamera()
  }, 0)
}

const rollExtraD6 = async () => {
  diceRoller1.value.updateViewMode(false)
  const appearance = diceAppearanceStore.getD6Appearance('extra')
  const roll = await diceRoller1.value.rollDice('d6', 1, appearance)
  extraD6Result.value = roll[0]
}

// Original methods for checks and calculations remain the same
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

const rollDamage = async (weapon, tempBonus = 0, hand = 'primary') => {
  const { diceCount, diceType, modifier } = weapon.tp

  diceRoller1.value.updateViewMode(true)
  const appearance = diceAppearanceStore.getD6Appearance('damage')
  const rolls = await diceRoller1.value.rollDice(`d${diceType}`, diceCount, appearance)

  const damage = rolls.reduce((sum, roll) => sum + roll, 0) + modifier + tempBonus

  if (result.value.isDualWielding) {
    result.value[hand] = {
      ...result.value[hand],
      damageRolls: rolls,
      totalDamage: damage,
      damageModifier: modifier,
      tempDamageBonus: tempBonus
    }
  } else {
    result.value = {
      ...result.value,
      damageRolls: rolls,
      totalDamage: damage,
      damageModifier: modifier,
      tempDamageBonus: tempBonus
    }
  }
}

const rollCriticalDamage = async () => {
  diceRoller1.value.updateViewMode(false)
  const appearance = diceAppearanceStore.getD6Appearance('critical')
  const roll = await diceRoller1.value.rollDice('d6', 1, appearance)
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
      const appearance = diceAppearanceStore.getD20Appearance(
        CHECK_TYPES.ATTRIBUTE,
        selectedAttribute.value
      )
      const roll = await diceRoller1.value.rollDice('d20', 1, appearance)
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

      const appearances = talent.attributes.map(attribute =>
        diceAppearanceStore.getD20Appearance(
          CHECK_TYPES.TALENT,
          diceAppearanceStore.preferences.useTalentColors ? null : attribute
        )
      )

      const rolls = await diceRoller1.value.rollDice('d20', 3, appearances)
      console.log("Talent check roll results:", rolls)

      const criticalResult = checkCriticalRolls(rolls)

      if (criticalResult) {
        const pointsNeeded = criticalResult.success ? 0 : talent.value + 1
        const remainingPoints = criticalResult.success ? talent.value : -1
        const qualityLevel = criticalResult.success ? calculateQS(remainingPoints) : 0

        result.value = {
          type: 'talent',
          talent: talent.name,
          rolls: rolls,
          pointsNeeded,
          remainingPoints,
          success: criticalResult.success,
          qualityLevel,
          critical: criticalResult.message,
          modifier: modifier.value
        }
        console.log("Talent check critical result set:", result.value)
      } else {
        let pointsNeeded = 0
        const adjustedAttributes = talent.attributes.map(attr => ({
          name: attr,
          value: getAttributeValue(attr),
          adjustedValue: getAttributeValue(attr) + modifier.value
        }))

        adjustedAttributes.forEach((attr, index) => {
          if (rolls[index] > attr.adjustedValue) {
            pointsNeeded += rolls[index] - attr.adjustedValue
          }
        })

        const remainingPoints = talent.value - pointsNeeded
        const success = pointsNeeded <= talent.value
        const qualityLevel = success ? calculateQS(remainingPoints) : 0

        result.value = {
          type: 'talent',
          talent: talent.name,
          rolls: rolls,
          pointsNeeded,
          remainingPoints,
          success,
          qualityLevel,
          adjustedAttributes,
          modifier: modifier.value
        }
        console.log("Talent check normal result set:", result.value)
      }

    } else if (currentCheckType.value === CHECK_TYPES.COMBAT) {
      if (!selectedWeapon.value) {
        alert('Bitte wählen Sie eine Waffe aus.')
        return
      }

      // Handle primary weapon
      const primaryResult = await performWeaponCheck(
        selectedWeapon.value,
        tempATBonus.value || 0,
        tempDamageBonus.value || 0,
        'primary'
      )

      if (isDualWielding.value && selectedSecondaryWeapon.value) {
        // Handle secondary weapon
        const secondaryResult = await performWeaponCheck(
          selectedSecondaryWeapon.value,
          tempSecondaryATBonus.value || 0,
          tempSecondaryDamageBonus.value || 0,
          'secondary'
        )

        // Combine results for dual wielding
        result.value = {
          type: 'combat',
          isDualWielding: true,
          primary: {
            ...primaryResult,
            showDamageRoll: primaryResult.success
          },
          secondary: {
            ...secondaryResult,
            showDamageRoll: secondaryResult.success
          }
        }
      } else {
        // Single weapon result
        result.value = {
          type: 'combat',
          isDualWielding: false,
          weapon: primaryResult.weapon,
          rolls: primaryResult.rolls,
          baseTarget: primaryResult.baseTarget,
          tempATBonus: primaryResult.tempATBonus,
          target: primaryResult.target,
          success: primaryResult.success,
          remainingPoints: primaryResult.remainingPoints,
          qualityLevel: primaryResult.qualityLevel,
          critical: primaryResult.critical,
          showDamageRoll: primaryResult.success
        }
      }

      // Set showDamageRoll based on success
      if (!result.value.isDualWielding) {
        showDamageRoll.value = result.value.success
      }
    }
  } catch (error) {
    console.error('Error during check:', error)
  }
}

const performWeaponCheck = async (weapon, tempATBonus, tempDamageBonus, hand) => {
  const appearance = diceAppearanceStore.getD20Appearance(CHECK_TYPES.COMBAT)
  const roll = await diceRoller1.value.rollDice('d20', 1, appearance)

  const baseAttackValue = weapon.at + weapon.atBonus
  const attackValue = baseAttackValue + tempATBonus

  const success = roll[0] === 1 || (roll[0] <= attackValue && roll[0] !== 20)
  const remainingPoints = success ? attackValue - roll[0] : 0
  const qualityLevel = success ? calculateQS(remainingPoints) : 0

  return {
    weapon: weapon.name,
    hand,
    rolls: [roll[0]],
    baseTarget: baseAttackValue,
    tempATBonus,
    tempDamageBonus,
    target: attackValue,
    success,
    remainingPoints,
    qualityLevel,
    critical: roll[0] === 1 ? 'Kritischer Treffer!' : (roll[0] === 20 ? 'Patzer!' : null)
  }
}

// Watch handlers
watch(currentCheckType, (newType) => {
  result.value = null
  modifier.value = 0
  criticalDamage.value = null
  extraD6Result.value = null
  showDamageRoll.value = false

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
      
      <DiceRoller ref="diceRoller1" class="dice-roller" />
      
      <DiceLabels 
        :checkType="currentCheckType"
        :selectedAttribute="selectedAttribute"
        :selectedTalent="selectedTalent"
        :selectedWeapon="selectedWeapon"
        :showDamageRoll="showDamageRoll"
        :getAttributeValue="getAttributeValue"
      />

      <div class="controls">
        <CheckTypeSelector 
          v-model:checkType="currentCheckType"
        />

        <AttributeControls 
          v-if="currentCheckType === CHECK_TYPES.ATTRIBUTE"
          v-model:selectedAttribute="selectedAttributeObject"
          :attributes="attributes"
        />

        <TalentControls 
          v-if="currentCheckType === CHECK_TYPES.TALENT"
          v-model:selectedTalent="selectedTalent"
          :talents="talents"
        />

        <CombatControls 
          v-if="currentCheckType === CHECK_TYPES.COMBAT"
          v-model:selectedWeapon="selectedWeapon"
          v-model:selectedSecondaryWeapon="selectedSecondaryWeapon"
          v-model:isDualWielding="isDualWielding"
          v-model:tempATBonus="tempATBonus"
          v-model:tempDamageBonus="tempDamageBonus"
          v-model:tempSecondaryATBonus="tempSecondaryATBonus"
          v-model:tempSecondaryDamageBonus="tempSecondaryDamageBonus"
          :weapons="weapons"
        />

        <ModifierControl 
          v-if="currentCheckType !== CHECK_TYPES.COMBAT"
          v-model:modifier="modifier"
        />

        <ActionButtons 
          :currentCheckType="currentCheckType"
          :showDamageRoll="showDamageRoll"
          @roll="performCheck"
          @rollD6="rollExtraD6"
          @resetCameras="resetAllCameras"
        />
      </div>

      <CheckResults 
        :result="result"
        :criticalDamage="criticalDamage"
        :extraD6Result="extraD6Result"
        :selectedWeapon="selectedWeapon"
        :selectedSecondaryWeapon="selectedSecondaryWeapon"
        :tempDamageBonus="tempDamageBonus"
        :tempSecondaryDamageBonus="tempSecondaryDamageBonus"
        @rollDamage="rollDamage"
        @rollCriticalDamage="rollCriticalDamage"
      />
    </div>
    <div v-else class="no-character-selected">
      <p>Bitte wählen Sie einen Charakter aus um Würfelproben durchzuführen.</p>
    </div>
  </div>
</template>

<style scoped>
/* Keep all the original styles that are specific to the main container */
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
  max-width: 400px;
  align-items: center;
  margin: 0 auto;
}

.no-character-selected {
  text-align: center;
  padding: 2rem;
  background: #1a1a1a;
  border-radius: 4px;
  color: #999;
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
</style>

