<script setup lang="ts">
import { computed } from 'vue'

import {
  isCritSuccess,
  outcomeLabel,
  type AttackCheckResult,
  type AttributeCheckResult,
  type TalentCheckResult,
} from '@/domain/rules'

const props = defineProps<{
  result: AttributeCheckResult | TalentCheckResult | AttackCheckResult
  title?: string
}>()

const context = computed(() => props.result.kind)
const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
const tone = computed(() => {
  const r = props.result
  if (r.crit) return isCritSuccess(r.crit) ? 'crit' : 'fumble'
  return r.success ? 'success' : 'failure'
})
</script>

<template>
  <section class="outcome" :class="tone">
    <h3 v-if="title" class="title">{{ title }}</h3>
    <p class="headline">{{ outcomeLabel(result, context) }}</p>
    <p v-if="result.success && result.kind !== 'attack'" class="qs">QS {{ result.qualityLevel }}</p>

    <template v-if="result.kind === 'attribute'">
      <p>
        Wurf: <strong>{{ result.roll }}</strong>
      </p>
      <p>
        {{ result.attribute }} {{ result.attributeValue }}
        <template v-if="result.modifier"
          >({{ signed(result.modifier) }}) = {{ result.target }}</template
        >
      </p>
      <p v-if="result.success">Übrige Punkte: {{ result.remainingPoints }}</p>
    </template>

    <template v-else-if="result.kind === 'talent'">
      <table class="dice">
        <thead>
          <tr>
            <th>Eigenschaft</th>
            <th>Ziel</th>
            <th>Wurf</th>
            <th>Punkte</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(die, i) in result.dice" :key="i">
            <td>{{ die.attribute }} {{ die.attributeValue }}</td>
            <td>{{ die.target }}</td>
            <td>
              <strong>{{ die.roll }}</strong>
            </td>
            <td>{{ result.crit ? '–' : die.pointsNeeded }}</td>
          </tr>
        </tbody>
      </table>
      <p>
        FW {{ result.talentValue }}
        <template v-if="result.modifier"> · Modifikator {{ signed(result.modifier) }}</template>
      </p>
      <p v-if="!result.crit">Benötigte Punkte: {{ result.pointsNeeded }}</p>
      <p v-if="result.success">Übrige Punkte: {{ result.remainingPoints }}</p>
    </template>

    <template v-else>
      <p>
        Wurf: <strong>{{ result.roll }}</strong>
      </p>
      <p>
        Angriffswert: {{ result.baseAttack }}
        <template v-if="result.tempBonus"
          >{{ signed(result.tempBonus) }} = {{ result.target }}</template
        >
      </p>
    </template>

    <slot />
  </section>
</template>

<style scoped>
.outcome {
  width: 100%;
  max-width: 26rem;
  margin: 0 auto;
  padding: 1rem;
  border-radius: var(--radius);
  background: var(--success-bg);
}

.outcome.failure {
  background: var(--failure-bg);
}

.outcome.crit {
  background: #2a5a3a;
  animation: glow 1s ease-in-out infinite alternate;
}

.outcome.fumble {
  background: #5a2a2a;
  animation: glow 1s ease-in-out infinite alternate;
}

@keyframes glow {
  from {
    box-shadow:
      0 0 5px #fff,
      0 0 10px #fff,
      0 0 15px #e60073;
  }
  to {
    box-shadow:
      0 0 10px #fff,
      0 0 20px #fff,
      0 0 30px #e60073;
  }
}

@media (prefers-reduced-motion: reduce) {
  .outcome.crit,
  .outcome.fumble {
    animation: none;
    box-shadow: 0 0 12px #e60073;
  }
}

.title {
  margin-bottom: 0.25rem;
}

p {
  margin: 0.4rem 0;
}

.headline {
  font-size: 1.5rem;
  font-weight: bold;
}

.qs {
  font-size: 1.8rem;
  font-weight: bold;
}

.dice {
  margin: 0.5rem auto;
  border-collapse: collapse;
}

.dice th,
.dice td {
  padding: 0.2rem 0.6rem;
}

.dice th {
  color: rgba(255, 255, 255, 0.65);
  font-weight: normal;
  font-size: 0.85rem;
}
</style>
