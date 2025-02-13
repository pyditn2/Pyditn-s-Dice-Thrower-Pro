// ModifierControl.vue
<script setup>
const props = defineProps({
  modifier: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modifier'])

const updateModifier = (event) => {
  emit('update:modifier', Number(event.target.value))
}
</script>

<template>
  <div class="modifier">
    <label for="modifier">Erleichterung/Erschwernis:</label>
    <input 
      id="modifier" 
      type="number" 
      :value="modifier"
      @input="updateModifier"
    />
  </div>
</template>

<style scoped>
.modifier {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.modifier label {
  color: white;
  font-size: 0.9rem;
  white-space: nowrap;
}

.modifier input {
  width: 60px;
  padding: 0.5rem;
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
  text-align: center;
}

.modifier input:focus {
  border-color: #42b983;
  outline: none;
}

@media (max-width: 768px) {
  .modifier {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }

  .modifier input {
    width: 100%;
  }
}
</style>