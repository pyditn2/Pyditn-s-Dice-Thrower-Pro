<script setup>
import { computed } from 'vue'
import SearchableDropdown from './SearchableDropdown.vue'
import { useCharacterStore } from '../stores/characterStore'

const props = defineProps({
  diceIndex: {
    type: Number,
    required: true
  },
  selectedAttribute: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:selectedAttribute'])

const characterStore = useCharacterStore()

const attributes = [
  { name: 'Mut', value: 'MU' },
  { name: 'Klugheit', value: 'KL' },
  { name: 'Intuition', value: 'IN' },
  { name: 'Charisma', value: 'CH' },
  { name: 'Fingerfertigkeit', value: 'FF' },
  { name: 'Gewandheit', value: 'GE' },
  { name: 'Konstitution', value: 'KO' },
  { name: 'Körperkraft', value: 'KK' }
]

const dropdownItems = computed(() => {
  return [
    { name: 'Kein Attribut', value: '' },
    ...attributes
  ]
})

const selectedAttributeObject = computed({
  get: () => dropdownItems.value.find(attr => attr.value === props.selectedAttribute) || dropdownItems.value[0],
  set: (newValue) => {
    emit('update:selectedAttribute', newValue.value)
  }
})

const getAttributeValue = (attributeKey) => {
  return characterStore.activeCharacter?.stats.attributes[attributeKey] ?? 0
}
</script>

<template>
  <div class="attribute-selector">
    <SearchableDropdown
      v-model="selectedAttributeObject"
      :items="dropdownItems"
      :display-field="item => item.name"
      :value-field="item => item.value"
      :placeholder="`Attribut für Würfel ${diceIndex + 1}...`"
    />
    <div v-if="selectedAttribute && characterStore.activeCharacter" class="attribute-value">
      {{ selectedAttribute }}: {{ getAttributeValue(selectedAttribute) }}
    </div>
  </div>
</template>

<style scoped>
.attribute-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0; /* Allows the flex item to shrink below its minimum content size */
}

.attribute-value {
  font-size: 0.9rem;
  color: #42b983;
  text-align: center;
}
</style>