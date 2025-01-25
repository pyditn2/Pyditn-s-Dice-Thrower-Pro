<script setup>
import SearchableDropdown from './SearchableDropdown.vue'

const props = defineProps({
  selectedTalent: {
    type: Object,
    default: null
  },
  talents: {
    type: Array,
    required: true,
    validator: (value) => {
      return value.every(talent => 'name' in talent && 'value' in talent)
    }
  }
})

const emit = defineEmits(['update:selectedTalent'])

const updateTalent = (newValue) => {
  emit('update:selectedTalent', newValue)
}
</script>

<template>
  <div class="talent-selection">
    <SearchableDropdown 
      :modelValue="selectedTalent"
      @update:modelValue="updateTalent"
      :items="talents"
      :display-field="(item) => item.name"
      :value-field="(item) => item.value"
      placeholder="Talent aussuchen..."
    />

    <!-- Display talent info if a talent is selected -->
    //Might put stuff here later
  </div>
</template>

<style scoped>
.talent-selection {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.talent-info {
  color: #42b983;
  text-align: center;
  font-weight: bold;
  margin-top: 0.5rem;
}

/* Consistent dropdown styling with AttributeControls */
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .talent-info {
    font-size: 0.9rem;
  }
}
</style>