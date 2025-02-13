 <script setup>
import { computed } from 'vue'

const props = defineProps({
  result: {
    type: Object,
    default: null
  },
  criticalDamage: {
    type: Number,
    default: null
  },
  extraD6Result: {
    type: Number,
    default: null
  },
  selectedWeapon: {
    type: Object,
    default: null
  },
  selectedSecondaryWeapon: {
    type: Object,
    default: null
  },
  tempDamageBonus: {
    type: Number,
    default: 0
  },
  tempSecondaryDamageBonus: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['rollDamage', 'rollCriticalDamage'])

const resultClass = computed(() => {
  if (!props.result) return {}
  
  return {
    success: props.result.isDualWielding ? 
      (props.result.primary?.success || props.result.secondary?.success) :
      props.result.success,
    critical: props.result.critical && props.result.success,
    fumble: props.result.critical && !props.result.success
  }
})

const resultComponents = {
  attribute: 'AttributeResult',
  talent: 'TalentResult',
  combat: 'CombatResult'
}
</script>

<template>
  <div v-if="result" class="result" :class="resultClass">
    <!-- Attribute check result -->
    <template v-if="result.type === 'attribute'">
      <div class="success-indicator">
        {{ result.critical || (result.success ? 'Erfolg!' : 'Misserfolg!') }}
      </div>
      <div v-if="result.success" class="result-qs">QS {{ result.qualityLevel }}</div>
      <div class="result-line">Würfe: {{ result.rolls.join(', ') }}</div>
      <div class="result-line">Zielwert: {{ result.target }} (Angepasst: {{ result.adjustedTarget }})</div>
      <div v-if="result.success" class="result-line">Übrige Punkte: {{ result.remainingPoints }}</div>
      <div class="result-line">Modifikator: {{ result.modifier }}</div>
    </template>

    <!-- Talent check result -->
    <template v-if="result.type === 'talent'">
      <div class="success-indicator">
        {{ result.critical || (result.success ? 'Erfolg!' : 'Misserfolg!') }}
      </div>
      <div v-if="result.success" class="result-qs">QS {{ result.qualityLevel }}</div>
      <div class="result-line">Würfe: {{ result.rolls.join(', ') }}</div>
      <div class="result-line">Benötigte Punkte: {{ result.pointsNeeded }}</div>
      <div v-if="result.success" class="result-line">Übrige Punkte: {{ result.remainingPoints }}</div>
      <div class="result-line" v-for="attr in result.adjustedAttributes" :key="attr.name">
        {{ attr.name }}: {{ attr.value }} (Angepasst: {{ attr.adjustedValue }})
      </div>
      <div class="result-line">Modifikator: {{ result.modifier }}</div>
    </template>

    <!-- Combat check result -->
    <template v-if="result.type === 'combat'">
      <!-- Dual wielding results -->
      <template v-if="result.isDualWielding">
        <!-- Primary weapon result -->
        <div class="weapon-result" :class="[
          'primary',
          result.primary.success ? 'hit' : 'miss'
        ]">
          <h3>Hauptwaffe: {{ result.primary.weapon }}</h3>
          <div class="success-indicator">
            {{ result.primary.critical || (result.primary.success ? 'Erfolg!' : 'Misserfolg!') }}
          </div>
          <div class="result-line">Wurf: {{ result.primary.rolls.join(', ') }}</div>
          <div class="result-line">
            Angriffswert: {{ result.primary.baseTarget }}
            {{ result.primary.tempATBonus ? ` + ${result.primary.tempATBonus}` : '' }}
            = {{ result.primary.target }}
          </div>

          <template v-if="result.primary.success">
            <!-- Primary weapon damage roll section -->
            <div v-if="!result.primary.damageRolls" class="damage-roll-section">
              <button class="damage-roll-button" @click="$emit('rollDamage', selectedWeapon, tempDamageBonus, 'primary')">
                Schaden würfeln
              </button>
            </div>
            <div v-else class="damage-result">
              <div>Schaden: {{ result.primary.totalDamage }}</div>
              <div class="damage-rolls">
                ({{ result.primary.damageRolls.join(' + ') }})
                {{ result.primary.damageModifier ? ' + ' + result.primary.damageModifier : '' }}
                {{ result.primary.tempDamageBonus ? ' + ' + result.primary.tempDamageBonus : '' }}
              </div>
            </div>

            <!-- Critical damage for primary weapon -->
            <template v-if="result.primary.critical && result.primary.critical.includes('Kritischer')">
              <div class="critical-damage-section">
                <div v-if="!criticalDamage">
                  <button class="critical-roll-button" @click="$emit('rollCriticalDamage')">
                    Kritischen Schaden würfeln
                  </button>
                </div>
                <div v-else class="critical-damage-result">
                  Kritischer Schaden: {{ criticalDamage }}
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- Secondary weapon result -->
        <div class="weapon-result" :class="[
          'secondary',
          result.secondary.success ? 'hit' : 'miss'
        ]">
          <h3>Nebenwaffe: {{ result.secondary.weapon }}</h3>
          <div class="success-indicator">
            {{ result.secondary.critical || (result.secondary.success ? 'Erfolg!' : 'Misserfolg!') }}
          </div>
          <div class="result-line">Wurf: {{ result.secondary.rolls.join(', ') }}</div>
          <div class="result-line">
            Angriffswert: {{ result.secondary.baseTarget }}
            {{ result.secondary.tempATBonus ? ` + ${result.secondary.tempATBonus}` : '' }}
            = {{ result.secondary.target }}
          </div>

          <template v-if="result.secondary.success">
            <!-- Secondary weapon damage roll section -->
            <div v-if="!result.secondary.damageRolls" class="damage-roll-section">
              <button class="damage-roll-button" 
                @click="$emit('rollDamage', selectedSecondaryWeapon, tempSecondaryDamageBonus, 'secondary')">
                Schaden würfeln
              </button>
            </div>
            <div v-else class="damage-result">
              <div>Schaden: {{ result.secondary.totalDamage }}</div>
              <div class="damage-rolls">
                ({{ result.secondary.damageRolls.join(' + ') }})
                {{ result.secondary.damageModifier ? ' + ' + result.secondary.damageModifier : '' }}
                {{ result.secondary.tempDamageBonus ? ' + ' + result.secondary.tempDamageBonus : '' }}
              </div>
            </div>
          </template>
        </div>
      </template>

      <!-- Single weapon result -->
      <template v-else>
        <div class="success-indicator">
          {{ result.critical || (result.success ? 'Erfolg!' : 'Misserfolg!') }}
        </div>
        <div class="result-line">Wurf: {{ result.rolls.join(', ') }}</div>
        <div class="result-line">
          Angriffswert: {{ result.baseTarget }}
          {{ result.tempATBonus ? ` + ${result.tempATBonus}` : '' }}
          = {{ result.target }}
        </div>

        <template v-if="result.success">
          <!-- Damage roll section -->
          <div v-if="!result.damageRolls && result.showDamageRoll" class="damage-roll-section">
            <button class="damage-roll-button" @click="$emit('rollDamage', selectedWeapon, tempDamageBonus)">
              Schaden würfeln
            </button>
          </div>
          <div v-else-if="result.damageRolls" class="damage-result">
            <div>Schaden: {{ result.totalDamage }}</div>
            <div class="damage-rolls">
              ({{ result.damageRolls.join(' + ') }})
              {{ result.damageModifier ? ' + ' + result.damageModifier : '' }}
              {{ result.tempDamageBonus ? ' + ' + result.tempDamageBonus : '' }}
            </div>
          </div>

          <!-- Critical damage section -->
          <template v-if="result.critical && result.critical.includes('Kritischer')">
            <div class="critical-damage-section">
              <div v-if="!criticalDamage">
                <button class="critical-roll-button" @click="$emit('rollCriticalDamage')">
                  Kritischen Schaden würfeln
                </button>
              </div>
              <div v-else class="critical-damage-result">
                Kritischer Schaden: {{ criticalDamage }}
              </div>
            </div>
          </template>
        </template>

        <!-- Display temp bonuses if they were used -->
        <div class="result-line">
          <div v-if="result.tempATBonus">Temporärer AT Bonus: {{ result.tempATBonus }}</div>
          <div v-if="result.tempDamageBonus">Temporärer Schaden Bonus: {{ result.tempDamageBonus }}</div>
        </div>
      </template>

      <!-- Extra D6 result (shown for both single and dual wielding) -->
      <div v-if="extraD6Result" class="extra-d6-result">
        W6 Ergebnis: {{ extraD6Result }}
      </div>
    </template>
  </div>
</template>

<style scoped>
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

.weapon-result {
  padding: 1rem;
  margin: 0.5rem 0;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid transparent;
}

.weapon-result h3 {
  color: #42b983;
  margin-bottom: 0.5rem;
}

.weapon-result.primary.hit {
  border-left-color: #42b983;
}

.weapon-result.primary.miss {
  border-left-color: #b94242;
}

.weapon-result.secondary.hit {
  border-left-color: #42b983;
}

.weapon-result.secondary.miss {
  border-left-color: #b94242;
}

.weapon-result + .weapon-result {
  margin-top: 1rem;
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

.damage-roll-button,
.critical-roll-button {
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.damage-roll-button:hover,
.critical-roll-button:hover {
  background: #3aa876;
}

.extra-d6-result {
  margin-top: 0.5rem;
  font-weight: bold;
  color: #42b983;
}

.critical-damage-section {
  margin-top: 1rem;
}

.critical-damage-result {
  color: #ff6b6b;
  font-weight: bold;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .result {
    font-size: 0.9rem;
  }

  .success-indicator {
    font-size: 1.3rem;
  }

  .result-qs {
    font-size: 1.5rem;
  }

  .damage-result {
    font-size: 1.1rem;
  }
}
</style>