<script setup lang="ts">
import { ref } from 'vue'

import { ATTRIBUTE_IDS, ATTRIBUTE_NAMES } from '@/domain/attributes'
import { useClickOutside } from '@/composables/useClickOutside'
import type { SimSpeed } from '@/persistence/schema'
import { useSettingsStore } from '@/stores/settings'

const store = useSettingsStore()
const { settings } = store

const open = ref(false)
const container = ref<HTMLElement | null>(null)
useClickOutside(container, () => (open.value = false))

const speeds: SimSpeed[] = [1, 2, 3]
const d6Colors = [
  { key: 'damage', label: 'Schaden' },
  { key: 'critical', label: 'Kritisch' },
  { key: 'extra', label: 'Extra' },
] as const
</script>

<template>
  <div ref="container" class="options">
    <button
      class="toggle"
      :class="{ open }"
      aria-label="Optionen"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span /><span /><span />
    </button>

    <Transition name="pop">
      <div v-if="open" class="menu panel" role="dialog" aria-label="Optionen">
        <section>
          <h3>Animationsgeschwindigkeit</h3>
          <div class="segmented" role="group" aria-label="Animationsgeschwindigkeit">
            <button
              v-for="speed in speeds"
              :key="speed"
              :class="{ active: settings.simSpeed === speed }"
              :aria-pressed="settings.simSpeed === speed"
              @click="settings.simSpeed = speed"
            >
              {{ speed }}x
            </button>
          </div>
        </section>

        <section>
          <h3>Audio</h3>
          <label class="check">
            <input v-model="settings.muted" type="checkbox" />
            Ton aus
          </label>
        </section>

        <details>
          <summary><h3>Würfelfarben</h3></summary>
          <h4>W20 Eigenschaften</h4>
          <div class="colors">
            <label v-for="attr in ATTRIBUTE_IDS" :key="attr" :title="ATTRIBUTE_NAMES[attr]">
              <input v-model="settings.diceColors.attribute[attr]" type="color" />
              {{ attr }}
            </label>
          </div>
          <h4>W20 Spezial</h4>
          <div class="colors">
            <label><input v-model="settings.diceColors.talent" type="color" /> Talent</label>
            <label><input v-model="settings.diceColors.combat" type="color" /> Kampf</label>
          </div>
          <label class="check">
            <input v-model="settings.talentDiceInAttributeColors" type="checkbox" />
            Talentproben in Eigenschaftsfarben
          </label>
          <h4>W6</h4>
          <div class="colors">
            <label v-for="c in d6Colors" :key="c.key">
              <input v-model="settings.diceColors[c.key]" type="color" /> {{ c.label }}
            </label>
          </div>
          <button class="reset" @click="store.resetDiceColors()">Farben zurücksetzen</button>
        </details>

        <details>
          <summary><h3>Hintergrund</h3></summary>
          <label class="check">
            <input v-model="settings.background.animated" type="checkbox" />
            Animierter Hintergrund
          </label>
          <div v-if="settings.background.animated" class="colors">
            <label>
              <input v-model="settings.background.icosahedronColor" type="color" /> Ikosaeder
            </label>
            <label><input v-model="settings.background.cubeColor" type="color" /> Würfel</label>
          </div>
        </details>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.options {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 200;
}

.toggle {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0;
}

.toggle.open {
  flex-direction: row;
}

.toggle span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text);
}

.menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: min(20rem, calc(100vw - 2rem));
  max-height: calc(100vh - 5rem);
  overflow-y: auto;
  background: #222;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  text-align: left;
}

section,
details {
  padding: 0.5rem 0;
  border-bottom: 1px solid #333;
}

details:last-child {
  border-bottom: none;
}

h3 {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}

summary {
  cursor: pointer;
  list-style: none;
}

summary h3 {
  display: inline;
}

summary::after {
  content: '▾';
  float: right;
  color: var(--muted);
}

details[open] summary::after {
  content: '▴';
}

.segmented {
  display: flex;
  gap: 0.25rem;
}

.segmented button {
  flex: 1;
}

.segmented button.active {
  background: var(--accent);
  border-color: var(--accent);
}

.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  cursor: pointer;
}

.colors {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
  gap: 0.4rem;
}

.colors label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
}

.reset {
  margin-top: 0.75rem;
  width: 100%;
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
  transform-origin: top right;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
