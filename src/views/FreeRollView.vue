<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import DiceStage from '@/components/DiceStage.vue'
import { useDiceEngine } from '@/composables/useDiceEngine'
import {
  ATTRIBUTE_IDS,
  ATTRIBUTE_NAMES,
  isAttributeId,
  type AttributeId,
} from '@/domain/attributes'
import { DIE_SIDES, type DieSides } from '@/domain/dice'
import { critLabel, singleCheck, type SingleCheckResult } from '@/domain/rules'
import { EngineBusyError, dieTypeFor } from '@/engine'
import { useCharacterStore } from '@/stores/characters'
import { useSettingsStore } from '@/stores/settings'

const MAX_DICE = 6

const characters = useCharacterStore()
const settingsStore = useSettingsStore()
const { roll, rolling, resetCameras } = useDiceEngine()

const sides = ref<DieSides>(20)
const count = ref(1)
/** Attribute per W20 ('' = none). */
const attributes = ref<string[]>([''])

interface DieResult {
  value: number
  attribute: AttributeId | null
  attributeValue: number | null
  check: SingleCheckResult | null
}
const results = ref<DieResult[] | null>(null)
const rolledLabels = ref<string[] | null>(null)

const character = computed(() => characters.active)
const diceCount = computed(() => Math.min(MAX_DICE, Math.max(1, Math.trunc(count.value) || 1)))
const dieLabel = computed(() => `W${sides.value}`)
const total = computed(() => results.value?.reduce((sum, r) => sum + r.value, 0) ?? 0)

watch(diceCount, (n) => {
  attributes.value = Array.from({ length: n }, (_, i) => attributes.value[i] ?? '')
})

function attributeFor(index: number): AttributeId | null {
  const a = attributes.value[index]
  return sides.value === 20 && character.value && isAttributeId(a) ? a : null
}

function labelFor(index: number): string {
  const a = attributeFor(index)
  return a ? `${a} (${character.value!.attributes[a]})` : dieLabel.value
}

const labels = computed(
  () => rolledLabels.value ?? Array.from({ length: diceCount.value }, (_, i) => labelFor(i)),
)

async function performRoll() {
  const n = diceCount.value
  const type = dieTypeFor(sides.value)
  // W20 use the attribute colours (MU when none is chosen), all other dice the damage colour.
  const dice = Array.from({ length: n }, (_, i) => ({
    type,
    color:
      type === 'd20'
        ? settingsStore.attributeColor(attributeFor(i) ?? 'MU')
        : settingsStore.settings.diceColors.damage,
  }))
  const chosen = Array.from({ length: n }, (_, i) => attributeFor(i))
  rolledLabels.value = Array.from({ length: n }, (_, i) => labelFor(i))
  let values: number[]
  try {
    values = await roll(dice)
  } catch (e) {
    if (e instanceof EngineBusyError) return
    throw e
  }
  results.value = values.map((value, i) => {
    const attribute = chosen[i] ?? null
    const attributeValue = attribute ? (character.value?.attributes[attribute] ?? null) : null
    return {
      value,
      attribute,
      attributeValue,
      check: attribute && attributeValue !== null ? singleCheck(value, attributeValue) : null,
    }
  })
}
</script>

<template>
  <div class="free">
    <h2>Freies Würfeln</h2>
    <DiceStage :labels="labels" />

    <div class="controls">
      <div class="row">
        <div class="segmented" role="group" aria-label="Würfelart">
          <button
            v-for="option in DIE_SIDES"
            :key="option"
            :class="{ active: sides === option }"
            :aria-pressed="sides === option"
            @click="sides = option"
          >
            W{{ option }}
          </button>
        </div>
        <label class="field">
          <span>Anzahl</span>
          <input v-model.number="count" type="number" min="1" :max="MAX_DICE" />
        </label>
      </div>

      <div v-if="sides === 20 && character" class="attributes">
        <label v-for="i in diceCount" :key="i" class="field">
          <span>Würfel {{ i }}</span>
          <select v-model="attributes[i - 1]">
            <option value="">Keine Eigenschaft</option>
            <option v-for="a in ATTRIBUTE_IDS" :key="a" :value="a">
              {{ ATTRIBUTE_NAMES[a] }} ({{ character.attributes[a] }})
            </option>
          </select>
        </label>
      </div>

      <div class="actions">
        <button class="primary roll" :disabled="rolling" @click="performRoll">
          {{ rolling ? 'Würfelt…' : 'Würfeln' }}
        </button>
        <button
          title="Kameras zurücksetzen"
          aria-label="Kameras zurücksetzen"
          @click="resetCameras"
        >
          🎲
        </button>
      </div>
    </div>

    <section v-if="results" class="result" aria-live="polite">
      <h3>Ergebnis</h3>
      <ul>
        <li v-for="(r, i) in results" :key="i">
          <span class="value">Würfel {{ i + 1 }}: {{ r.value }}</span>
          <span v-if="r.check" :class="['check', r.check.success ? 'success' : 'failure']">
            {{ r.attribute }} ({{ r.attributeValue }}):
            {{ r.check.success ? 'Erfolg' : 'Misserfolg' }}
          </span>
          <span v-if="r.check?.crit" class="crit">{{ critLabel(r.check.crit, 'attribute') }}</span>
        </li>
      </ul>
      <p v-if="results.length > 1" class="total">Summe: {{ total }}</p>
    </section>
  </div>
</template>

<style scoped>
.free {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  width: 100%;
  max-width: 40rem;
  align-items: center;
}

.row {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.segmented {
  display: flex;
  gap: 0.4rem;
}

.segmented button.active {
  background: var(--accent);
  border-color: var(--accent);
}

.field span {
  color: var(--muted);
  font-size: 0.9rem;
}

.attributes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 0.6rem 1rem;
  width: 100%;
}

.attributes .field {
  justify-content: space-between;
}

.attributes select {
  flex: 1;
  min-width: 0;
}

.actions {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  max-width: 20rem;
}

.roll {
  flex: 1;
  font-size: 1.1rem;
}

.result {
  width: 100%;
  max-width: 22rem;
  padding: 1rem;
  border-radius: var(--radius);
  background: var(--surface-strong);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

li {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.value {
  font-size: 1.1rem;
}

.check {
  font-size: 0.9rem;
  padding: 0.2rem;
  border-radius: 4px;
}

.check.success {
  color: var(--accent);
  background: rgba(66, 185, 131, 0.1);
}

.check.failure {
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.crit {
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--gold);
}

.total {
  margin: 0.75rem 0 0;
  padding-top: 0.5rem;
  border-top: 1px solid #333;
  font-size: 1.1rem;
}
</style>
