<script setup lang="ts">
import type { Weapon } from '@/domain/character'
import { DIE_SIDES, isDieSides } from '@/domain/dice'
import { useCharacterStore } from '@/stores/characters'

const props = defineProps<{ weapon: Weapon }>()
const store = useCharacterStore()

const int = (value: string, fallback = 0) => {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

function setNumber(field: 'at' | 'pa' | 'atBonus' | 'paBonus', value: string) {
  store.updateWeapon(props.weapon.id, { [field]: int(value) })
}

function setDamage(field: 'count' | 'modifier', value: string) {
  const n = field === 'count' ? Math.max(1, int(value, 1)) : int(value)
  store.updateWeapon(props.weapon.id, { damage: { ...props.weapon.damage, [field]: n } })
}

function setSides(value: string) {
  const sides = Number(value)
  if (isDieSides(sides)) {
    store.updateWeapon(props.weapon.id, { damage: { ...props.weapon.damage, sides } })
  }
}

function remove() {
  const name = props.weapon.name || 'diese Waffe'
  if (confirm(`„${name}“ wirklich löschen?`)) store.removeWeapon(props.weapon.id)
}
</script>

<template>
  <article class="weapon">
    <header>
      <input
        :value="weapon.name"
        placeholder="Waffenname"
        aria-label="Waffenname"
        class="name"
        @input="store.updateWeapon(weapon.id, { name: ($event.target as HTMLInputElement).value })"
      />
      <button class="delete" aria-label="Waffe löschen" title="Waffe löschen" @click="remove">
        ×
      </button>
    </header>

    <label class="field stacked">
      <span>Typ</span>
      <input
        :value="weapon.type"
        placeholder="Waffentyp"
        @input="store.updateWeapon(weapon.id, { type: ($event.target as HTMLInputElement).value })"
      />
    </label>

    <div class="stats">
      <label
        v-for="f in ['at', 'pa', 'atBonus', 'paBonus'] as const"
        :key="f"
        class="field stacked"
      >
        <span>{{ { at: 'AT', pa: 'PA', atBonus: 'AT-Bonus', paBonus: 'PA-Bonus' }[f] }}</span>
        <input
          type="number"
          :value="weapon[f]"
          @input="setNumber(f, ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <div class="field stacked">
      <span>Trefferpunkte</span>
      <div class="tp">
        <input
          type="number"
          min="1"
          aria-label="Anzahl Würfel"
          :value="weapon.damage.count"
          @input="setDamage('count', ($event.target as HTMLInputElement).value)"
        />
        <select
          aria-label="Würfelart"
          :value="weapon.damage.sides"
          @change="setSides(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="sides in DIE_SIDES" :key="sides" :value="sides">W{{ sides }}</option>
        </select>
        <span>+</span>
        <input
          type="number"
          aria-label="TP-Modifikator"
          :value="weapon.damage.modifier"
          @input="setDamage('modifier', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <label class="field stacked">
      <span>Notizen</span>
      <textarea
        :value="weapon.notes"
        rows="2"
        placeholder="Zusätzliche Informationen"
        @input="
          store.updateWeapon(weapon.id, { notes: ($event.target as HTMLTextAreaElement).value })
        "
      />
    </label>
  </article>
</template>

<style scoped>
.weapon {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.9rem;
  border-radius: var(--radius);
  background: var(--surface);
  text-align: left;
}

header {
  display: flex;
  gap: 0.5rem;
}

.name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}

.delete {
  padding: 0 0.7rem;
  font-size: 1.2rem;
}

.stacked {
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
}

.stacked > span {
  color: var(--muted);
  font-size: 0.85rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.stats input {
  width: 100%;
}

.tp {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tp input {
  width: 4.5rem;
}

textarea {
  resize: vertical;
}
</style>
