import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { clampAttribute, type AttributeId } from '@/domain/attributes'
import {
  characterDisplayName,
  createCharacter,
  createWeapon,
  type Character,
  type CharacterInfo,
  type Weapon,
} from '@/domain/character'
import { saveCharacters } from '@/persistence/storage'
import { getInitialState } from './persisted'

export const useCharacterStore = defineStore('characters', () => {
  const initial = getInitialState().characters
  const characters = ref<Character[]>(initial.characters)
  const activeCharacterId = ref<string | null>(initial.activeCharacterId)

  const active = computed(
    () => characters.value.find((c) => c.id === activeCharacterId.value) ?? null,
  )
  const options = computed(() =>
    characters.value.map((c) => ({ id: c.id, name: characterDisplayName(c) })),
  )

  watch(
    [characters, activeCharacterId],
    () =>
      saveCharacters({ characters: characters.value, activeCharacterId: activeCharacterId.value }),
    { deep: true },
  )

  function select(id: string | null) {
    activeCharacterId.value = characters.value.some((c) => c.id === id) ? id : null
  }

  function create(): Character {
    const character = createCharacter()
    characters.value.push(character)
    activeCharacterId.value = character.id
    return character
  }

  function remove(id: string) {
    const index = characters.value.findIndex((c) => c.id === id)
    if (index === -1) return
    characters.value.splice(index, 1)
    if (activeCharacterId.value === id) activeCharacterId.value = characters.value[0]?.id ?? null
  }

  function add(imported: Character[]) {
    if (imported.length === 0) return
    characters.value.push(...imported)
    activeCharacterId.value = imported[0]!.id
  }

  function setInfo(field: keyof CharacterInfo, value: string) {
    if (active.value) active.value.info[field] = value
  }

  function setAttribute(attribute: AttributeId, value: number) {
    if (active.value && Number.isFinite(value)) {
      active.value.attributes[attribute] = clampAttribute(value)
    }
  }

  function setTalent(talentId: string, value: number) {
    if (active.value && Number.isFinite(value)) {
      active.value.talents[talentId] = Math.max(0, Math.trunc(value))
    }
  }

  function addWeapon(): Weapon | null {
    if (!active.value) return null
    const weapon = createWeapon()
    active.value.weapons.push(weapon)
    return weapon
  }

  function updateWeapon(id: string, patch: Partial<Omit<Weapon, 'id'>>) {
    const weapon = active.value?.weapons.find((w) => w.id === id)
    if (weapon) Object.assign(weapon, patch)
  }

  function removeWeapon(id: string) {
    if (active.value) active.value.weapons = active.value.weapons.filter((w) => w.id !== id)
  }

  return {
    characters,
    activeCharacterId,
    active,
    options,
    select,
    create,
    remove,
    add,
    setInfo,
    setAttribute,
    setTalent,
    addWeapon,
    updateWeapon,
    removeWeapon,
  }
})
