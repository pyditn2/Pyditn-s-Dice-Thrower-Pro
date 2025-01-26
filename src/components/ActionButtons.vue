// ActionButtons.vue
<script setup>
import { computed } from 'vue'
import { CHECK_TYPES } from '../constants/diceTypes'

const props = defineProps({
  currentCheckType: {
    type: String,
    required: true
  },
  showDamageRoll: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['roll', 'rollD6', 'resetCameras'])

const showW6Button = computed(() => {
  return props.currentCheckType === CHECK_TYPES.COMBAT
})

const showCameraReset = computed(() => {
  return props.currentCheckType === CHECK_TYPES.TALENT || 
    (props.currentCheckType === CHECK_TYPES.COMBAT && props.showDamageRoll)
})
</script>

<template>
  <div class="button-group">
    <button class="roll-button" @click="$emit('roll')">
      Würfeln
    </button>
    
    <button 
      v-if="showW6Button" 
      class="w6-button"
      @click="$emit('rollD6')"
    >
      W6
    </button>
    
    <button
      v-if="showCameraReset"
      class="camera-reset-button"
      @click="$emit('resetCameras')"
    >
      🎲
    </button>
  </div>
</template>

<style scoped>
.button-group {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
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
  transition: background-color 0.2s;
}

.roll-button:hover {
  background: #3aa876;
}

.w6-button {
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.w6-button:hover {
  background: #3aa876;
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

/* Keep emojis consistent across platforms */
.camera-reset-button {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
}

@media (max-width: 768px) {
  .button-group {
    flex-wrap: wrap;
  }

  .roll-button {
    flex: 1 1 100%;
  }

  .w6-button,
  .camera-reset-button {
    flex: 1 1 auto;
  }
}
</style>