<template>
    <div class="skill-check">
      <DiceRoller ref="diceRoller" />
      
      <div class="controls">
        <button @click="performAttributeCheck('MU')">
          Test Mut
        </button>
        
        <button @click="performTalentCheck('Klettern')">
          Test Klettern
        </button>
      </div>
      
      <div v-if="lastResult" class="result">
        {{ formatResult(lastResult) }}
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