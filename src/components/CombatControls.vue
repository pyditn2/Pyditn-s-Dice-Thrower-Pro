// CombatControls.vue
<script setup>
import SearchableDropdown from './SearchableDropdown.vue'

const props = defineProps({
  selectedWeapon: {
    type: Object,
    default: null
  },
  selectedSecondaryWeapon: {
    type: Object,
    default: null
  },
  isDualWielding: {
    type: Boolean,
    default: false
  },
  weapons: {
    type: Array,
    required: true
  },
  tempATBonus: {
    type: Number,
    default: 0
  },
  tempDamageBonus: {
    type: Number,
    default: 0
  },
  tempSecondaryATBonus: {
    type: Number,
    default: 0
  },
  tempSecondaryDamageBonus: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  'update:selectedWeapon',
  'update:selectedSecondaryWeapon',
  'update:isDualWielding',
  'update:tempATBonus',
  'update:tempDamageBonus',
  'update:tempSecondaryATBonus',
  'update:tempSecondaryDamageBonus'
])

const updateWeapon = (newWeapon) => {
  emit('update:selectedWeapon', newWeapon)
}

const updateSecondaryWeapon = (newWeapon) => {
  emit('update:selectedSecondaryWeapon', newWeapon)
}

const updateDualWielding = (event) => {
  emit('update:isDualWielding', event.target.checked)
}

const updateTempBonus = (type, value, isSecondary = false) => {
  const eventName = isSecondary ? 
    (type === 'at' ? 'update:tempSecondaryATBonus' : 'update:tempSecondaryDamageBonus') :
    (type === 'at' ? 'update:tempATBonus' : 'update:tempDamageBonus')
  
  emit(eventName, Number(value))
}
</script>

<template>
  <div class="weapon-selection">
    <!-- Primary weapon -->
    <div class="weapon-primary">
      <SearchableDropdown
        :modelValue="selectedWeapon"
        @update:modelValue="updateWeapon"
        :items="weapons"
        :display-field="(item) => item.name"
        :value-field="(item) => item.id"
        placeholder="Hauptwaffe aussuchen..."
      />

      <div v-if="selectedWeapon" class="weapon-info">
        <div>AT: {{ selectedWeapon.at + selectedWeapon.atBonus }}</div>
        <div>Schaden: {{ selectedWeapon.tp.diceCount }}W{{ selectedWeapon.tp.diceType }}+{{
          selectedWeapon.tp.modifier
        }}</div>
      </div>

      <!-- Primary weapon bonuses -->
      <div class="temp-bonuses">
        <div class="bonus-input">
          <label for="tempAT">Temp. AT Bonus:</label>
          <input
            id="tempAT"
            type="number"
            :value="tempATBonus"
            @input="e => updateTempBonus('at', e.target.value)"
            class="bonus-number"
          />
        </div>
        <div class="bonus-input">
          <label for="tempDamage">Temp. TP Bonus:</label>
          <input
            id="tempDamage"
            type="number"
            :value="tempDamageBonus"
            @input="e => updateTempBonus('damage', e.target.value)"
            class="bonus-number"
          />
        </div>
      </div>
    </div>

    <!-- Dual wielding checkbox -->
    <div class="dual-wield-toggle">
      <label>
        <input
          type="checkbox"
          :checked="isDualWielding"
          @change="updateDualWielding"
        />
        Beidhändig
      </label>
    </div>

    <!-- Secondary weapon (shown when dual wielding) -->
    <div v-if="isDualWielding" class="weapon-secondary">
      <SearchableDropdown
        :modelValue="selectedSecondaryWeapon"
        @update:modelValue="updateSecondaryWeapon"
        :items="weapons"
        :display-field="(item) => item.name"
        :value-field="(item) => item.id"
        placeholder="Nebenwaffe aussuchen..."
      />

      <div v-if="selectedSecondaryWeapon" class="weapon-info">
        <div>AT: {{ selectedSecondaryWeapon.at + selectedSecondaryWeapon.atBonus }}</div>
        <div>Schaden: {{ selectedSecondaryWeapon.tp.diceCount }}W{{ selectedSecondaryWeapon.tp.diceType }}+{{
          selectedSecondaryWeapon.tp.modifier }}</div>
      </div>

      <!-- Secondary weapon bonuses -->
      <div class="temp-bonuses">
        <div class="bonus-input">
          <label for="tempSecondaryAT">Temp. AT Bonus:</label>
          <input
            id="tempSecondaryAT"
            type="number"
            :value="tempSecondaryATBonus"
            @input="e => updateTempBonus('at', e.target.value, true)"
            class="bonus-number"
          />
        </div>
        <div class="bonus-input">
          <label for="tempSecondaryDamage">Temp. TP Bonus:</label>
          <input
            id="tempSecondaryDamage"
            type="number"
            :value="tempSecondaryDamageBonus"
            @input="e => updateTempBonus('damage', e.target.value, true)"
            class="bonus-number"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.weapon-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.weapon-primary,
.weapon-secondary {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.weapon-info {
  display: flex;
  justify-content: center;
  gap: 2rem;
  color: #42b983;
  font-weight: bold;
  margin-top: 0.5rem;
}

.dual-wield-toggle {
  display: flex;
  justify-content: center;
  padding: 0.5rem;
}

.dual-wield-toggle label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: white;
}

.dual-wield-toggle input[type="checkbox"] {
  width: 1.2rem;
  height: 1.2rem;
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

/* SearchableDropdown styling consistency */
:deep(.searchable-dropdown) {
  width: 100%;
  max-width: 400px;
}

:deep(.dropdown-input) {
  background: #333;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
  padding: 0.5rem;
  width: 100%;
}

:deep(.dropdown-input:focus) {
  border-color: #42b983;
  outline: none;
}

:deep(.dropdown-list) {
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  margin-top: 0.25rem;
}

:deep(.dropdown-item) {
  padding: 0.5rem;
  cursor: pointer;
  color: white;
}

:deep(.dropdown-item:hover) {
  background: #444;
}

:deep(.dropdown-item.selected) {
  background: #42b983;
  color: white;
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

  .weapon-info {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
</style>