<template>
  <div class="skill-check">
    <DiceRoller ref="diceRoller" />
    
    <div class="controls">
      <button @click="performAttributeCheck('MU')" class="check-button">
        Test Mut
      </button>
      
      <button @click="performTalentCheck('Klettern')" class="check-button">
        Test Klettern
      </button>
    </div>
    
    <div v-if="lastResult" class="result" :class="{ success: lastResult.success }">
      <h3>{{ lastResult.type === 'attribute' ? 'Eigenschaftsprobe' : 'Talentprobe' }}</h3>
      
      <template v-if="lastResult.type === 'attribute'">
        <div class="roll-info">
          Wurf: {{ lastResult.roll }} vs {{ lastResult.target }}
          ({{ lastResult.attribute }})
        </div>
        <div class="success-info">
          {{ lastResult.success ? 'Erfolg!' : 'Misserfolg!' }}
          <span v-if="lastResult.criticalSuccess" class="critical">Kritischer Erfolg!</span>
          <span v-if="lastResult.criticalFailure" class="critical">Patzer!</span>
        </div>
      </template>
      
      <template v-if="lastResult.type === 'talent'">
        <div class="talent-name">{{ lastResult.talent }}</div>
        <div class="rolls-info">
          <div v-for="(roll, index) in lastResult.rolls" :key="index" class="roll">
            {{ roll.attribute }}: {{ roll.roll }}/{{ roll.value }}
            <span v-if="roll.roll > roll.value" class="failure">
              (-{{ roll.roll - roll.value }})
            </span>
          </div>
        </div>
        <div class="points-info">
          <div>Benötigte Punkte: {{ lastResult.pointsNeeded }}</div>
          <div>Übrige Punkte: {{ lastResult.remainingPoints }}</div>
        </div>
        <div class="success-info">
          {{ lastResult.success ? 'Probe bestanden!' : 'Probe fehlgeschlagen!' }}
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { DiceService } from '../services/diceService'
import DiceRoller from './DiceRoller.vue'

const diceRoller = ref(null)
const lastResult = ref(null)

const performAttributeCheck = async (attribute) => {
  lastResult.value = await DiceService.performAttributeCheck(
    attribute, 
    0, 
    diceRoller.value
  )
}

const performTalentCheck = async (talent) => {
  lastResult.value = await DiceService.performTalentCheck(
    talent,
    0,
    diceRoller.value
  )
}
</script>

<style scoped>
.skill-check {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.controls {
  display: flex;
  gap: 1rem;
}

.check-button {
  padding: 0.5rem 1rem;
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
}

.check-button:hover {
  background: #444;
}

.result {
  background: #1a1a1a;
  padding: 1rem;
  border-radius: 8px;
  min-width: 300px;
}

.result.success {
  background: #1a472a;
}

.roll-info, .talent-name, .rolls-info, .points-info, .success-info {
  margin: 0.5rem 0;
}

.critical {
  color: #ff6b6b;
  font-weight: bold;
}

.failure {
  color: #ff6b6b;
}

.roll {
  margin: 0.25rem 0;
}
</style>