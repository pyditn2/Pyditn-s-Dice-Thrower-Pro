<script setup>
import { CHECK_TYPES } from '../constants/diceTypes'

const props = defineProps({
  checkType: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:checkType'])

const checkTypeLabels = {
  [CHECK_TYPES.ATTRIBUTE]: 'Eigenschaftsprobe',
  [CHECK_TYPES.TALENT]: 'Talentprobe',
  [CHECK_TYPES.COMBAT]: 'Kampfprobe'
}

const updateCheckType = (type) => {
  emit('update:checkType', type)
}
</script>

<template>
  <div class="check-type">
    <button 
      v-for="(label, type) in checkTypeLabels" 
      :key="type"
      :class="{ active: checkType === type }"
      @click="updateCheckType(type)"
    >
      {{ label }}
    </button>
  </div>
</template>

<style scoped>
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
  transition: background-color 0.2s, border-color 0.2s;
}

.check-type button:hover {
  background: #404040;
}

.check-type button.active {
  background: #42b983;
  border-color: #42b983;
}

@media (max-width: 960px) {
  .check-type {
    flex-direction: column;
  }

  .check-type button {
    width: 100%;
  }
}
</style>