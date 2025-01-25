<script setup>
import { CHECK_TYPES } from '../constants/diceTypes'

defineProps({
  checkType: {
    type: String,
    required: true
  },
  selectedAttribute: {
    type: String,
    required: true
  },
  selectedTalent: {
    type: Object,
    default: null
  },
  selectedWeapon: {
    type: Object,
    default: null
  },
  showDamageRoll: {
    type: Boolean,
    default: false
  },
  getAttributeValue: {
    type: Function,
    required: true
  }
})
</script>

<template>
  <div class="dice-labels">
    <!-- Attribute check label -->
    <div v-if="checkType === CHECK_TYPES.ATTRIBUTE" class="single-dice-label">
      {{ selectedAttribute }} ({{ getAttributeValue(selectedAttribute) }})
    </div>

    <!-- Talent check labels -->
    <div v-else-if="checkType === CHECK_TYPES.TALENT && selectedTalent" class="talent-dice-labels">
      <div v-for="(attr, index) in selectedTalent.attributes" :key="index" class="dice-label">
        {{ attr }} ({{ getAttributeValue(attr) }})
      </div>
    </div>

    <!-- Combat check labels -->
    <template v-else-if="checkType === CHECK_TYPES.COMBAT && selectedWeapon">
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
</template>

<style scoped>
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

@media (max-width: 960px) {
  .talent-dice-labels,
  .damage-dice-labels {
    gap: 0.5rem;
  }
}
</style>