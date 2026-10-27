<script setup lang="ts">
import { computed, ref } from 'vue'

import WeaponEditor from '@/components/WeaponEditor.vue'
import {
  ATTRIBUTE_IDS,
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  ATTRIBUTE_NAMES,
  type AttributeId,
} from '@/domain/attributes'
import type { CharacterInfo } from '@/domain/character'
import { TALENT_CATEGORIES, talentsInCategory } from '@/domain/talents'
import {
  exportCharacters,
  exportFileName,
  ImportError,
  parseCharacterImport,
} from '@/persistence/exchange'
import { openTextFile, saveTextFile } from '@/platform/files'
import { useCharacterStore } from '@/stores/characters'

const store = useCharacterStore()
const character = computed(() => store.active)
const message = ref<{ text: string; error?: boolean } | null>(null)

const infoFields: { key: keyof CharacterInfo; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'species', label: 'Spezies' },
  { key: 'culture', label: 'Kultur' },
  { key: 'profession', label: 'Profession' },
]
const categories = TALENT_CATEGORIES.map((c) => ({ ...c, talents: talentsInCategory(c.id) }))

function onAttribute(attribute: AttributeId, event: Event) {
  const input = event.target as HTMLInputElement
  if (input.value !== '') store.setAttribute(attribute, Number(input.value))
}

function onAttributeBlur(attribute: AttributeId, event: Event) {
  // Show the clamped value once editing is done.
  ;(event.target as HTMLInputElement).value = String(character.value?.attributes[attribute] ?? '')
}

function onTalent(talentId: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (input.value !== '') store.setTalent(talentId, Number(input.value))
}

async function exportList(all: boolean) {
  const list = all ? store.characters : character.value ? [character.value] : []
  if (list.length === 0) return
  try {
    const saved = await saveTextFile(exportFileName(list), exportCharacters(list))
    if (saved) {
      message.value = {
        text: list.length === 1 ? 'Charakter exportiert.' : `${list.length} Charaktere exportiert.`,
      }
    }
  } catch (error) {
    console.error(error)
    message.value = { text: 'Export fehlgeschlagen.', error: true }
  }
}

async function importFile() {
  try {
    const text = await openTextFile()
    if (text === null) return
    const imported = parseCharacterImport(text)
    store.add(imported)
    message.value = {
      text:
        imported.length === 1
          ? 'Charakter importiert.'
          : `${imported.length} Charaktere importiert.`,
    }
  } catch (error) {
    message.value = {
      text: error instanceof ImportError ? error.message : 'Import fehlgeschlagen.',
      error: true,
    }
  }
}
</script>

<template>
  <div class="character-view">
    <div class="data-actions">
      <button :disabled="!character" @click="exportList(false)">Charakter exportieren</button>
      <button :disabled="store.characters.length < 2" @click="exportList(true)">
        Alle exportieren
      </button>
      <button @click="importFile">Importieren…</button>
      <p v-if="message" :class="['message', { error: message.error }]" role="status">
        {{ message.text }}
      </p>
    </div>

    <p v-if="!character" class="empty">Charakter auswählen, erstellen oder importieren.</p>

    <div v-else class="layout">
      <aside class="info panel-section">
        <h3>Charakterinformationen</h3>
        <label v-for="f in infoFields" :key="f.key" class="stacked">
          <span>{{ f.label }}</span>
          <input
            :value="character.info[f.key]"
            :placeholder="f.label"
            @input="store.setInfo(f.key, ($event.target as HTMLInputElement).value)"
          />
        </label>
      </aside>

      <div class="main">
        <section class="panel-section">
          <h3>Eigenschaften</h3>
          <div class="attributes">
            <label v-for="a in ATTRIBUTE_IDS" :key="a" class="stacked">
              <span>{{ ATTRIBUTE_NAMES[a] }}</span>
              <input
                type="number"
                :min="ATTRIBUTE_MIN"
                :max="ATTRIBUTE_MAX"
                :value="character.attributes[a]"
                @input="onAttribute(a, $event)"
                @blur="onAttributeBlur(a, $event)"
              />
            </label>
          </div>
        </section>

        <section class="panel-section">
          <h3>Talente</h3>
          <div v-for="category in categories" :key="category.id" class="category">
            <h4>{{ category.name }}</h4>
            <div class="talents">
              <label v-for="t in category.talents" :key="t.id" class="talent">
                <span class="talent-name">
                  {{ t.name }}
                  <small>({{ t.attributes.join(', ') }})</small>
                </span>
                <input
                  type="number"
                  min="0"
                  :value="character.talents[t.id] ?? 0"
                  @input="onTalent(t.id, $event)"
                />
              </label>
            </div>
          </div>
        </section>

        <section class="panel-section">
          <div class="section-header">
            <h3>Waffen</h3>
            <button class="primary" @click="store.addWeapon()">+ Waffe hinzufügen</button>
          </div>
          <p v-if="character.weapons.length === 0" class="empty-hint">Noch keine Waffen.</p>
          <div class="weapons">
            <WeaponEditor v-for="w in character.weapons" :key="w.id" :weapon="w" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.character-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.data-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
}

.message {
  flex-basis: 100%;
  margin: 0;
  color: var(--accent);
}

.message.error {
  color: var(--danger);
}

.empty {
  color: var(--muted);
  padding: 2rem;
}

.layout {
  display: grid;
  grid-template-columns: 16rem minmax(0, 1fr);
  gap: 1.5rem;
  text-align: left;
  align-items: start;
}

.panel-section {
  background: var(--surface-strong);
  border-radius: 8px;
  padding: 1rem;
}

.main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: sticky;
  top: 1rem;
}

.stacked {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stacked > span {
  color: var(--muted);
  font-size: 0.9rem;
}

.attributes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.75rem;
}

.attributes input {
  width: 100%;
}

.category h4 {
  margin-top: 0.5rem;
}

.talents {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.4rem 1rem;
}

.talent {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius);
}

.talent:hover {
  background: var(--surface);
}

.talent-name small {
  color: var(--muted);
}

.talent input {
  width: 4.5rem;
  flex-shrink: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0;
}

.weapons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: 1rem;
}

.empty-hint {
  color: var(--muted);
}

@media (max-width: 800px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .info {
    position: static;
  }
}
</style>
