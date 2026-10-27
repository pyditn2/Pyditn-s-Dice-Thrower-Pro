<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

export interface SelectItem {
  value: string
  label: string
  /** Shown dimmed next to the label, e.g. a talent value. */
  hint?: string
}

const props = defineProps<{
  items: SelectItem[]
  placeholder?: string
  label?: string
}>()

const model = defineModel<string | null>({ required: true })

const id = useId()
const open = ref(false)
const query = ref('')
const highlighted = ref(0)
const input = ref<HTMLInputElement | null>(null)

const selected = computed(() => props.items.find((i) => i.value === model.value) ?? null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? props.items.filter((i) => i.label.toLowerCase().includes(q)) : props.items
})

const inputText = computed({
  get: () => (open.value ? query.value : (selected.value?.label ?? '')),
  set: (value: string) => {
    query.value = value
    open.value = true
  },
})

watch(filtered, () => (highlighted.value = 0))

function openList() {
  query.value = ''
  open.value = true
  highlighted.value = Math.max(
    0,
    filtered.value.findIndex((i) => i.value === model.value),
  )
}

function choose(item: SelectItem | undefined) {
  if (item) model.value = item.value
  open.value = false
  query.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value && (event.key === 'ArrowDown' || event.key === 'Enter')) {
    openList()
    event.preventDefault()
    return
  }
  switch (event.key) {
    case 'ArrowDown':
      highlighted.value = Math.min(filtered.value.length - 1, highlighted.value + 1)
      break
    case 'ArrowUp':
      highlighted.value = Math.max(0, highlighted.value - 1)
      break
    case 'Enter':
      choose(filtered.value[highlighted.value])
      input.value?.blur()
      break
    case 'Escape':
      open.value = false
      input.value?.blur()
      break
    default:
      return
  }
  event.preventDefault()
}
</script>

<template>
  <div class="search-select">
    <label v-if="label" :for="id" class="visually-hidden">{{ label }}</label>
    <input
      :id="id"
      ref="input"
      v-model="inputText"
      type="text"
      role="combobox"
      autocomplete="off"
      :placeholder="placeholder ?? 'Suchen…'"
      :aria-expanded="open"
      :aria-controls="`${id}-list`"
      :aria-activedescendant="open && filtered.length ? `${id}-${highlighted}` : undefined"
      @focus="openList"
      @click="!open && openList()"
      @blur="open = false"
      @keydown="onKeydown"
    />
    <span v-if="selected?.hint && !open" class="selected-hint">{{ selected.hint }}</span>
    <ul v-show="open" :id="`${id}-list`" role="listbox" class="list">
      <li v-if="filtered.length === 0" class="empty">Keine Ergebnisse</li>
      <li
        v-for="(item, index) in filtered"
        :id="`${id}-${index}`"
        :key="item.value"
        role="option"
        :aria-selected="item.value === model"
        :class="{ highlighted: index === highlighted, selected: item.value === model }"
        @mousedown.prevent="choose(item)"
        @mousemove="highlighted = index"
      >
        <span>{{ item.label }}</span>
        <span v-if="item.hint" class="hint">{{ item.hint }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search-select {
  position: relative;
  width: 100%;
}

input {
  width: 100%;
  padding-right: 3rem;
}

.selected-hint {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  translate: 0 -50%;
  color: var(--muted);
  pointer-events: none;
}

.list {
  position: absolute;
  z-index: 50;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
}

li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  text-align: left;
}

li.highlighted {
  background: var(--control);
}

li.selected {
  color: var(--accent);
  font-weight: 600;
}

.hint {
  color: var(--muted);
}

.empty {
  color: var(--muted);
  cursor: default;
}
</style>
