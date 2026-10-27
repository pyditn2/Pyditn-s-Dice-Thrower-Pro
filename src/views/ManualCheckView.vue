<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import CheckOutcome from '@/components/CheckOutcome.vue'
import NoCharacter from '@/components/NoCharacter.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { talentCheck, type TalentCheckResult } from '@/domain/rules'
import { TALENTS, getTalent } from '@/domain/talents'
import { useCharacterStore } from '@/stores/characters'

const characters = useCharacterStore()
const character = computed(() => characters.active)

const talentId = ref<string | null>(null)
const rolls = ref<(number | '')[]>(['', '', ''])
const modifier = ref(0)
const result = ref<TalentCheckResult | null>(null)
const error = ref<string | null>(null)

const talent = computed(() => (talentId.value ? getTalent(talentId.value) : undefined))
const talentItems = computed(() =>
  TALENTS.map((t) => ({
    value: t.id,
    label: t.name,
    hint: String(character.value?.talents[t.id] ?? 0),
  })),
)

function reset() {
  rolls.value = ['', '', '']
  modifier.value = 0
  result.value = null
  error.value = null
}

watch(talentId, () => {
  rolls.value = ['', '', '']
  result.value = null
  error.value = null
})
watch(() => characters.activeCharacterId, reset)

function calculate() {
  const c = character.value
  const t = talent.value
  if (!c || !t) return
  const values = rolls.value.map(Number)
  if (
    rolls.value.some((r) => r === '') ||
    values.some((r) => !Number.isInteger(r) || r < 1 || r > 20)
  ) {
    error.value = 'Die Würfelwerte müssen ganze Zahlen zwischen 1 und 20 sein.'
    result.value = null
    return
  }
  error.value = null
  result.value = talentCheck({
    talentValue: c.talents[t.id] ?? 0,
    modifier: modifier.value || 0,
    attributes: t.attributes.map((a) => ({ attribute: a, value: c.attributes[a] })),
    rolls: values,
  })
}
</script>

<template>
  <div class="manual">
    <h2>Manuelle Talentprobe</h2>
    <NoCharacter v-if="!character" action="eine Talentprobe auszuwerten" />

    <template v-else>
      <form class="controls" @submit.prevent="calculate">
        <SearchSelect
          v-model="talentId"
          :items="talentItems"
          label="Talent"
          placeholder="Talent auswählen…"
        />

        <template v-if="talent">
          <div class="dice">
            <label v-for="(attr, i) in talent.attributes" :key="i" class="die">
              <span class="attr">{{ attr }} {{ character.attributes[attr] }}</span>
              <input
                v-model.number="rolls[i]"
                type="number"
                min="1"
                max="20"
                placeholder="1–20"
                :aria-label="`Wurf für ${attr}`"
              />
            </label>
          </div>

          <label class="field modifier">
            <span>Erleichterung/Erschwernis</span>
            <input v-model.number="modifier" type="number" step="1" />
          </label>

          <p v-if="error" class="error" role="alert">{{ error }}</p>

          <div class="actions">
            <button type="submit" class="primary">Ergebnis berechnen</button>
            <button type="button" @click="reset">Zurücksetzen</button>
          </div>
        </template>
      </form>

      <CheckOutcome v-if="result && talent" :result="result" :title="talent.name" />
    </template>
  </div>
</template>

<style scoped>
.manual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 26rem;
}

.dice {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.die {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.attr {
  color: var(--accent);
  font-weight: bold;
}

.field {
  justify-content: center;
}

.field span {
  color: var(--muted);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.error {
  color: var(--danger);
  margin: 0;
}
</style>
