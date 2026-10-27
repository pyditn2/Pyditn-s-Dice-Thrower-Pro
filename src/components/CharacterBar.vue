<script setup lang="ts">
import { ref } from 'vue'

import throwIcon from '@/assets/icons/wurfsettings.png'
import { useClickOutside } from '@/composables/useClickOutside'
import { characterDisplayName } from '@/domain/character'
import { useCharacterStore } from '@/stores/characters'
import ThrowSettings from './ThrowSettings.vue'

const store = useCharacterStore()
const throwOpen = ref(false)
const throwContainer = ref<HTMLElement | null>(null)
useClickOutside(throwContainer, () => (throwOpen.value = false))

function onSelect(event: Event) {
  store.select((event.target as HTMLSelectElement).value || null)
}

function removeActive() {
  const active = store.active
  if (!active) return
  if (confirm(`„${characterDisplayName(active)}“ wirklich löschen?`)) store.remove(active.id)
}
</script>

<template>
  <div class="character-bar panel">
    <div ref="throwContainer" class="throw">
      <button
        class="icon-button"
        title="Wurf-Einstellungen"
        aria-label="Wurf-Einstellungen"
        :aria-expanded="throwOpen"
        @click="throwOpen = !throwOpen"
      >
        <img :src="throwIcon" alt="" width="20" height="20" />
      </button>
      <div v-if="throwOpen" class="popover panel" role="dialog" aria-label="Wurf-Einstellungen">
        <div class="popover-header">
          <h3>Wurf-Einstellungen</h3>
          <button class="close" aria-label="Schließen" @click="throwOpen = false">×</button>
        </div>
        <ThrowSettings />
      </div>
    </div>

    <label class="visually-hidden" for="character-select">Charakter</label>
    <select id="character-select" :value="store.activeCharacterId ?? ''" @change="onSelect">
      <option value="" disabled>Charakter auswählen</option>
      <option v-for="option in store.options" :key="option.id" :value="option.id">
        {{ option.name }}
      </option>
    </select>
    <button class="primary" @click="store.create()">Neuer Charakter</button>
    <button class="danger" :disabled="!store.active" @click="removeActive">
      Charakter löschen
    </button>
  </div>
</template>

<style scoped>
.character-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto 1rem;
  padding: 0.6rem;
}

select {
  min-width: 12rem;
}

.throw {
  position: relative;
}

.icon-button {
  display: grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  padding: 0;
}

.popover {
  position: absolute;
  z-index: 100;
  top: calc(100% + 0.5rem);
  left: 0;
  width: min(22rem, calc(100vw - 2rem));
  background: #222;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popover-header h3 {
  margin: 0;
  font-size: 1rem;
}

.close {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  padding: 0 0.25rem;
}
</style>
