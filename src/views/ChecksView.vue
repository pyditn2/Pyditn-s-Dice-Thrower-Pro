<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import CheckOutcome from '@/components/CheckOutcome.vue'
import DiceStage from '@/components/DiceStage.vue'
import NoCharacter from '@/components/NoCharacter.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { useDiceEngine } from '@/composables/useDiceEngine'
import { ATTRIBUTE_IDS, ATTRIBUTE_NAMES, type AttributeId } from '@/domain/attributes'
import { weaponAttack, weaponDamageLabel, type Weapon } from '@/domain/character'
import {
  attackCheck,
  attributeCheck,
  damage,
  isCritSuccess,
  talentCheck,
  type AttackCheckResult,
  type AttributeCheckResult,
  type DamageResult,
  type TalentCheckResult,
} from '@/domain/rules'
import { TALENTS, getTalent } from '@/domain/talents'
import { EngineBusyError, dieTypeFor, type DieSpec } from '@/engine'
import { useCharacterStore } from '@/stores/characters'
import { useSettingsStore } from '@/stores/settings'

type CheckType = 'attribute' | 'talent' | 'combat'

interface Hand {
  title: string
  weapon: Weapon
  tempDamage: () => number
  attack: AttackCheckResult
  damage: DamageResult | null
  criticalDamage: number | null
}

type Result =
  | { kind: 'attribute'; check: AttributeCheckResult }
  | { kind: 'talent'; check: TalentCheckResult; talentName: string }
  | { kind: 'combat'; hands: Hand[] }

const characters = useCharacterStore()
const settingsStore = useSettingsStore()
const { settings } = settingsStore
const { roll, rolling, resetCameras } = useDiceEngine()

const checkTypes: { value: CheckType; label: string }[] = [
  { value: 'attribute', label: 'Eigenschaftsprobe' },
  { value: 'talent', label: 'Talentprobe' },
  { value: 'combat', label: 'Kampfprobe' },
]
const checkType = ref<CheckType>('attribute')
const attribute = ref<string | null>('MU')
const talentId = ref<string | null>(TALENTS[0]!.id)
const modifier = ref(0)

const weaponId = ref<string | null>(null)
const secondaryWeaponId = ref<string | null>(null)
const dualWield = ref(false)
const tempAttack = ref(0)
const tempDamage = ref(0)
const secondaryTempAttack = ref(0)
const secondaryTempDamage = ref(0)

const result = ref<Result | null>(null)
const extraD6 = ref<number | null>(null)
const rolledLabels = ref<string[] | null>(null)
const error = ref<string | null>(null)

const character = computed(() => characters.active)
const value = (a: AttributeId) => character.value?.attributes[a] ?? 0

const attributeItems = computed(() =>
  ATTRIBUTE_IDS.map((a) => ({ value: a, label: ATTRIBUTE_NAMES[a], hint: String(value(a)) })),
)
const talentItems = computed(() =>
  TALENTS.map((t) => ({
    value: t.id,
    label: t.name,
    hint: String(character.value?.talents[t.id] ?? 0),
  })),
)
const weapons = computed(() => character.value?.weapons ?? [])
const weaponItems = computed(() =>
  weapons.value.map((w) => ({
    value: w.id,
    label: w.name || 'Unbenannte Waffe',
    hint: `AT ${weaponAttack(w)} · ${weaponDamageLabel(w)}`,
  })),
)
const weapon = computed(() => weapons.value.find((w) => w.id === weaponId.value) ?? null)
const secondaryWeapon = computed(
  () => weapons.value.find((w) => w.id === secondaryWeaponId.value) ?? null,
)
const talent = computed(() => (talentId.value ? getTalent(talentId.value) : undefined))

/** Captions under the dice: what was last rolled, or what the next roll will be. */
const labels = computed(() => {
  if (rolledLabels.value) return rolledLabels.value
  if (checkType.value === 'attribute' && attribute.value) {
    return [`${attribute.value} (${value(attribute.value as AttributeId)})`]
  }
  if (checkType.value === 'talent' && talent.value) {
    return talent.value.attributes.map((a) => `${a} (${value(a)})`)
  }
  if (checkType.value === 'combat' && weapon.value) {
    return [`${weapon.value.name} (AT ${weaponAttack(weapon.value)})`]
  }
  return []
})

const canRoll = computed(() => {
  if (!character.value || rolling.value) return false
  if (checkType.value === 'attribute') return attribute.value !== null
  if (checkType.value === 'talent') return talent.value !== undefined
  return weapon.value !== null && (!dualWield.value || secondaryWeapon.value !== null)
})

function resetResults() {
  result.value = null
  extraD6.value = null
  rolledLabels.value = null
  error.value = null
}

watch(checkType, () => {
  resetResults()
  modifier.value = 0
  tempAttack.value = tempDamage.value = 0
  secondaryTempAttack.value = secondaryTempDamage.value = 0
})

watch(
  () => characters.activeCharacterId,
  () => {
    resetResults()
    weaponId.value = secondaryWeaponId.value = null
  },
)

async function rollDice(dice: DieSpec[], diceLabels: string[]): Promise<number[] | null> {
  error.value = null
  rolledLabels.value = diceLabels
  try {
    return await roll(dice)
  } catch (e) {
    if (!(e instanceof EngineBusyError)) error.value = 'Der Wurf ist fehlgeschlagen.'
    return null
  }
}

async function performCheck() {
  const c = character.value
  if (!c || !canRoll.value) return
  extraD6.value = null

  if (checkType.value === 'attribute') {
    const a = attribute.value as AttributeId
    const rolls = await rollDice(
      [{ type: 'd20', color: settingsStore.attributeColor(a) }],
      [`${a} (${c.attributes[a]})`],
    )
    if (!rolls) return
    result.value = {
      kind: 'attribute',
      check: attributeCheck({
        attribute: a,
        attributeValue: c.attributes[a],
        modifier: modifier.value,
        roll: rolls[0]!,
      }),
    }
  } else if (checkType.value === 'talent') {
    const t = talent.value!
    const rolls = await rollDice(
      t.attributes.map((a) => ({ type: 'd20', color: settingsStore.talentDieColor(a) })),
      t.attributes.map((a) => `${a} (${c.attributes[a]})`),
    )
    if (!rolls) return
    result.value = {
      kind: 'talent',
      talentName: t.name,
      check: talentCheck({
        talentValue: c.talents[t.id] ?? 0,
        modifier: modifier.value,
        attributes: t.attributes.map((a) => ({ attribute: a, value: c.attributes[a] })),
        rolls,
      }),
    }
  } else {
    const hands = [
      { title: 'Hauptwaffe', weapon: weapon.value!, tempAttack, tempDamage },
      ...(dualWield.value
        ? [
            {
              title: 'Nebenwaffe',
              weapon: secondaryWeapon.value!,
              tempAttack: secondaryTempAttack,
              tempDamage: secondaryTempDamage,
            },
          ]
        : []),
    ]
    const rolls = await rollDice(
      hands.map(() => ({ type: 'd20', color: settings.diceColors.combat })),
      hands.map((h) => `${h.weapon.name || 'Waffe'} (AT ${weaponAttack(h.weapon)})`),
    )
    if (!rolls) return
    result.value = {
      kind: 'combat',
      hands: hands.map((h, i) => ({
        title: h.title,
        weapon: { ...h.weapon, damage: { ...h.weapon.damage } },
        tempDamage: () => h.tempDamage.value,
        attack: attackCheck({
          baseAttack: weaponAttack(h.weapon),
          tempBonus: h.tempAttack.value,
          roll: rolls[i]!,
        }),
        damage: null,
        criticalDamage: null,
      })),
    }
  }
}

async function rollDamage(hand: Hand) {
  const { count, sides, modifier: weaponModifier } = hand.weapon.damage
  const rolls = await rollDice(
    Array.from({ length: count }, () => ({
      type: dieTypeFor(sides),
      color: settings.diceColors.damage,
    })),
    Array.from({ length: count }, () => `W${sides}`),
  )
  if (rolls) hand.damage = damage(rolls, weaponModifier, hand.tempDamage())
}

async function rollCriticalDamage(hand: Hand) {
  const rolls = await rollDice(
    [{ type: 'd6', color: settings.diceColors.critical }],
    ['Kritisch W6'],
  )
  if (rolls) hand.criticalDamage = rolls[0]!
}

async function rollExtraD6() {
  const rolls = await rollDice([{ type: 'd6', color: settings.diceColors.extra }], ['W6'])
  if (rolls) extraD6.value = rolls[0]!
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
</script>

<template>
  <div class="checks">
    <NoCharacter v-if="!character" action="Würfelproben durchzuführen" />

    <template v-else>
      <h2>Würfelprobe</h2>
      <DiceStage :labels="labels" />

      <div class="controls">
        <div class="segmented" role="tablist" aria-label="Art der Probe">
          <button
            v-for="type in checkTypes"
            :key="type.value"
            role="tab"
            :aria-selected="checkType === type.value"
            :class="{ active: checkType === type.value }"
            @click="checkType = type.value"
          >
            {{ type.label }}
          </button>
        </div>

        <SearchSelect
          v-if="checkType === 'attribute'"
          v-model="attribute"
          :items="attributeItems"
          label="Eigenschaft"
          placeholder="Eigenschaft suchen…"
        />

        <SearchSelect
          v-if="checkType === 'talent'"
          v-model="talentId"
          :items="talentItems"
          label="Talent"
          placeholder="Talent suchen…"
        />

        <template v-if="checkType === 'combat'">
          <p v-if="weapons.length === 0" class="hint">
            Dieser Charakter hat noch keine Waffen. Waffen lassen sich unter „Charakterwerte“
            anlegen.
          </p>
          <template v-else>
            <fieldset class="weapon">
              <legend>Hauptwaffe</legend>
              <SearchSelect
                v-model="weaponId"
                :items="weaponItems"
                label="Hauptwaffe"
                placeholder="Hauptwaffe auswählen…"
              />
              <div class="bonuses">
                <label class="field">
                  <span>Temp. AT-Bonus</span>
                  <input v-model.number="tempAttack" type="number" />
                </label>
                <label class="field">
                  <span>Temp. TP-Bonus</span>
                  <input v-model.number="tempDamage" type="number" />
                </label>
              </div>
            </fieldset>

            <label class="check">
              <input v-model="dualWield" type="checkbox" />
              Beidhändig
            </label>

            <fieldset v-if="dualWield" class="weapon">
              <legend>Nebenwaffe</legend>
              <SearchSelect
                v-model="secondaryWeaponId"
                :items="weaponItems"
                label="Nebenwaffe"
                placeholder="Nebenwaffe auswählen…"
              />
              <div class="bonuses">
                <label class="field">
                  <span>Temp. AT-Bonus</span>
                  <input v-model.number="secondaryTempAttack" type="number" />
                </label>
                <label class="field">
                  <span>Temp. TP-Bonus</span>
                  <input v-model.number="secondaryTempDamage" type="number" />
                </label>
              </div>
            </fieldset>
          </template>
        </template>

        <label v-if="checkType !== 'combat'" class="field modifier">
          <span>Erleichterung/Erschwernis</span>
          <input v-model.number="modifier" type="number" />
        </label>

        <div class="actions">
          <button class="primary roll" :disabled="!canRoll" @click="performCheck">
            {{ rolling ? 'Würfelt…' : 'Würfeln' }}
          </button>
          <button
            v-if="checkType === 'combat'"
            :disabled="rolling"
            title="Einen zusätzlichen W6 würfeln"
            @click="rollExtraD6"
          >
            W6
          </button>
          <button
            title="Kameras zurücksetzen"
            aria-label="Kameras zurücksetzen"
            @click="resetCameras"
          >
            🎲
          </button>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </div>

      <div class="results" aria-live="polite">
        <CheckOutcome v-if="result?.kind === 'attribute'" :result="result.check" />
        <CheckOutcome
          v-else-if="result?.kind === 'talent'"
          :result="result.check"
          :title="result.talentName"
        />
        <template v-else-if="result?.kind === 'combat'">
          <CheckOutcome
            v-for="hand in result.hands"
            :key="hand.title"
            :result="hand.attack"
            :title="
              result.hands.length > 1 ? `${hand.title}: ${hand.weapon.name}` : hand.weapon.name
            "
          >
            <template v-if="hand.attack.success">
              <div v-if="hand.damage" class="damage">
                <strong>Schaden: {{ hand.damage.total }}</strong>
                <span class="breakdown">
                  ({{ hand.damage.rolls.join(' + ') }}
                  <template v-if="hand.damage.modifier">
                    {{ signed(hand.damage.modifier) }}</template
                  >
                  <template v-if="hand.damage.tempBonus">
                    {{ signed(hand.damage.tempBonus) }}</template
                  >)
                </span>
              </div>
              <button v-else class="primary" :disabled="rolling" @click="rollDamage(hand)">
                Schaden würfeln ({{ weaponDamageLabel(hand.weapon) }})
              </button>

              <template v-if="isCritSuccess(hand.attack.crit)">
                <p v-if="hand.criticalDamage !== null" class="critical">
                  Kritischer Schaden: {{ hand.criticalDamage }}
                </p>
                <button
                  v-else
                  class="primary"
                  :disabled="rolling"
                  @click="rollCriticalDamage(hand)"
                >
                  Kritischen Schaden würfeln
                </button>
              </template>
            </template>
          </CheckOutcome>
        </template>

        <p v-if="extraD6 !== null" class="extra">W6 Ergebnis: {{ extraD6 }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.checks {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.9rem;
  width: 100%;
  max-width: 26rem;
}

.segmented {
  display: flex;
  gap: 0.4rem;
}

.segmented button {
  flex: 1;
  white-space: nowrap;
}

.segmented button.active {
  background: var(--accent);
  border-color: var(--accent);
}

.weapon {
  border: 1px solid #333;
  border-radius: var(--radius);
  padding: 0.75rem;
  margin: 0;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

legend {
  color: var(--muted);
  padding: 0 0.3rem;
}

.bonuses {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.field span {
  color: var(--muted);
  font-size: 0.9rem;
}

.modifier {
  justify-content: center;
}

.check {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.roll {
  flex: 1;
  font-size: 1.1rem;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.damage {
  margin-top: 0.75rem;
  color: var(--danger);
  font-size: 1.2rem;
}

.breakdown {
  display: block;
  font-size: 0.9rem;
  color: var(--muted);
}

.critical {
  color: var(--danger);
  font-weight: bold;
}

.outcome button {
  margin-top: 0.6rem;
}

.extra {
  color: var(--accent);
  font-weight: bold;
}

.hint {
  color: var(--muted);
}

.error {
  color: var(--danger);
  margin: 0;
}

@media (max-width: 640px) {
  .segmented {
    flex-direction: column;
  }
}
</style>
