<script setup>
import SearchableDropdown from './SearchableDropdown.vue'

const props = defineProps({
  selectedAttribute: {
    type: Object,
    required: true
  },
  attributes: {
    type: Array,
    required: true,
    validator: (value) => {
      return value.every(attr => 'name' in attr && 'value' in attr)
    }
  }
})

const emit = defineEmits(['update:selectedAttribute'])

const updateAttribute = (newValue) => {
  emit('update:selectedAttribute', newValue)
}
</script>

<template>
  <div class="selection">
    <SearchableDropdown 
      :modelValue="selectedAttribute"
      @update:modelValue="updateAttribute"
      :items="attributes"
      :display-field="(item) => item.name"
      :value-field="(item) => item.value"
      placeholder="Attribut aussuchen..."
    />
  </div>
</template>

<style scoped>
.selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

/* Ensuring consistent width with other controls */
:deep(.searchable-dropdown) {
  width: 100%;
  max-width: 400px;
}

/* SearchableDropdown style overrides if needed */
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
</style>