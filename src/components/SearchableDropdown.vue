<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  displayField: {
    type: Function,
    default: (item) => item.name
  },
  valueField: {
    type: Function,
    default: (item) => item.value
  },
  placeholder: {
    type: String,
    default: 'Search or select...'
  },
  modelValue: {
    type: [Object, String, Number],
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const searchQuery = ref('')
const isDropdownOpen = ref(false)
const searchInput = ref(null)

const filteredItems = computed(() => {
  if (!searchQuery.value) return props.items
  const query = searchQuery.value.toLowerCase()
  return props.items.filter(item => 
    props.displayField(item).toLowerCase().includes(query)
  )
})

const selectedDisplay = computed(() => {
  if (!props.modelValue) return ''
  try {
    return props.displayField(props.modelValue)
  } catch (e) {
    return ''
  }
})

const selectItem = (item) => {
  emit('update:modelValue', item)
  searchQuery.value = ''
  isDropdownOpen.value = false
  if (searchInput.value) {
    searchInput.value.blur()
  }
}

const onInputFocus = () => {
  isDropdownOpen.value = true
}

const onClickOutside = (event) => {
  const container = event.target.closest('.search-dropdown-container')
  if (!container) {
    isDropdownOpen.value = false
    searchQuery.value = ''
  }
}

const selectFirstFiltered = () => {
  if (filteredItems.value.length > 0) {
    selectItem(filteredItems.value[0])
  }
}

const onKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    selectFirstFiltered()
  } else if (event.key === 'Escape') {
    isDropdownOpen.value = false
    searchQuery.value = ''
    searchInput.value?.blur()
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div class="search-dropdown-container">
    <input
      ref="searchInput"
      type="text"
      class="searchable-input"
      v-model="searchQuery"
      :placeholder="placeholder"
      @focus="onInputFocus"
      @keydown="onKeydown"
    />
    
    <div v-if="modelValue" class="selected-item">
      Ausgewählt: {{ selectedDisplay }}
      <div v-if="valueField(modelValue)" class="selected-value">
        ({{ valueField(modelValue) }})
      </div>
    </div>
    
    <div v-show="isDropdownOpen" class="searchable-dropdown">
      <div v-if="filteredItems.length === 0" class="no-results">
        Nichts gefunden
      </div>
      <div
        v-for="item in filteredItems"
        :key="displayField(item)"
        class="dropdown-item"
        :class="{ 'selected': item === modelValue }"
        @mousedown.prevent="selectItem(item)"
      >
        {{ displayField(item) }}
        <span v-if="valueField(item)" class="item-value">
          ({{ valueField(item) }})
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-dropdown-container {
  position: relative;
  width: 100%;
}

.searchable-input {
  width: 100%;
  padding: 0.5rem;
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.searchable-input:focus {
  outline: none;
  border-color: #42b983;
}

.selected-item {
  font-size: 0.9rem;
  color: #42b983;
  margin-bottom: 0.5rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.selected-value {
  color: #666;
}

.searchable-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  z-index: 1000;
}

.dropdown-item {
  padding: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.dropdown-item:hover {
  background: #333;
}

.dropdown-item.selected {
  background: #42b983;
  color: white;
}

.item-value {
  color: #666;
}

.dropdown-item.selected .item-value {
  color: rgba(255, 255, 255, 0.8);
}

.no-results {
  padding: 0.5rem;
  text-align: center;
  color: #666;
}
</style>