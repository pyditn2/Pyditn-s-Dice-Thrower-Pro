import { ATTRIBUTE_DEFAULT, ATTRIBUTE_IDS, type AttributeId } from './attributes'
import type { DieSides } from './dice'
import { TALENTS } from './talents'

export interface CharacterInfo {
  name: string
  species: string
  culture: string
  profession: string
}

export interface Weapon {
  id: string
  name: string
  type: string
  notes: string
  at: number
  pa: number
  atBonus: number
  paBonus: number
  /** Damage is `count` dice with `sides` sides (W6 unless changed) plus `modifier`. */
  damage: { count: number; sides: DieSides; modifier: number }
}

export interface Character {
  id: string
  info: CharacterInfo
  attributes: Record<AttributeId, number>
  /** Talent value (FW) by talent id. Every catalog talent has an entry. */
  talents: Record<string, number>
  weapons: Weapon[]
}

export const UNNAMED_CHARACTER = 'Unbenannter Charakter'

/** Random id that also works outside secure contexts (plain-http web hosting). */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function createCharacter(id = newId()): Character {
  return {
    id,
    info: { name: '', species: '', culture: '', profession: '' },
    attributes: Object.fromEntries(ATTRIBUTE_IDS.map((a) => [a, ATTRIBUTE_DEFAULT])) as Record<
      AttributeId,
      number
    >,
    talents: Object.fromEntries(TALENTS.map((t) => [t.id, 0])),
    weapons: [],
  }
}

export function createWeapon(id = newId()): Weapon {
  return {
    id,
    name: '',
    type: '',
    notes: '',
    at: 0,
    pa: 0,
    atBonus: 0,
    paBonus: 0,
    damage: { count: 1, sides: 6, modifier: 0 },
  }
}

export function characterDisplayName(character: Character): string {
  return character.info.name.trim() || UNNAMED_CHARACTER
}

/** Attack value shown on the weapon (AT + AT bonus), before temporary bonuses. */
export function weaponAttack(weapon: Weapon): number {
  return weapon.at + weapon.atBonus
}

export function weaponDamageLabel(weapon: Weapon): string {
  const { count, sides, modifier } = weapon.damage
  const dice = `${count}W${sides}`
  if (modifier === 0) return dice
  return `${dice}${modifier > 0 ? '+' : ''}${modifier}`
}
