/**
 * Persisted data (version 1) plus the normalizers that turn untrusted JSON (localStorage, imported
 * files) into valid objects. Normalizers never throw; they fall back to defaults field by field.
 */
import { ATTRIBUTE_IDS, clampAttribute, type AttributeId } from '@/domain/attributes'
import {
  createCharacter,
  createWeapon,
  newId,
  type Character,
  type Weapon,
} from '@/domain/character'
import { isDieSides } from '@/domain/dice'
import { TALENTS } from '@/domain/talents'

export const SCHEMA_VERSION = 1

export interface CharacterState {
  activeCharacterId: string | null
  characters: Character[]
}

export interface DiceColors {
  attribute: Record<AttributeId, string>
  talent: string
  combat: string
  damage: string
  critical: string
  extra: string
}

export interface ThrowSettings {
  /** Direction the dice come from, in degrees (0–360). */
  angle: number
  /** Distance of the throw start from the bowl centre (5–15). */
  distance: number
  /** Throw speed towards the centre (5–30). */
  strength: number
}

export type SimSpeed = 1 | 2 | 3

export interface Settings {
  diceColors: DiceColors
  /** Colour talent-check dice by their attribute instead of the single talent colour. */
  talentDiceInAttributeColors: boolean
  throw: ThrowSettings
  simSpeed: SimSpeed
  muted: boolean
  background: { animated: boolean; icosahedronColor: string; cubeColor: string }
}

export const THROW_LIMITS = {
  distance: { min: 5, max: 15 },
  strength: { min: 5, max: 30 },
} as const

export function defaultDiceColors(): DiceColors {
  return {
    attribute: {
      MU: '#ff0000',
      KL: '#00ff00',
      IN: '#0000ff',
      CH: '#ffff00',
      FF: '#ff00ff',
      GE: '#00ffff',
      KO: '#ff8800',
      KK: '#88ff00',
    },
    talent: '#ff0000',
    combat: '#ff0000',
    damage: '#ff0000',
    critical: '#8800ff',
    extra: '#00ff88',
  }
}

export function defaultSettings(): Settings {
  return {
    diceColors: defaultDiceColors(),
    talentDiceInAttributeColors: false,
    throw: { angle: 0, distance: 10, strength: 15 },
    simSpeed: 1,
    muted: false,
    background: { animated: false, icosahedronColor: '#258141', cubeColor: '#331127' },
  }
}

// --- small coercion helpers ----------------------------------------------------------------------

type Json = Record<string, unknown>

export function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function asInt(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : value
  return typeof n === 'number' && Number.isFinite(n) ? Math.trunc(n) : fallback
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function asColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback
}

// --- characters ----------------------------------------------------------------------------------

export function normalizeWeapon(raw: unknown): Weapon {
  const w = isObject(raw) ? raw : {}
  const base = createWeapon(asString(w.id) || newId())
  const dmg = isObject(w.damage) ? w.damage : {}
  return {
    ...base,
    name: asString(w.name),
    type: asString(w.type),
    notes: asString(w.notes),
    at: asInt(w.at),
    pa: asInt(w.pa),
    atBonus: asInt(w.atBonus),
    paBonus: asInt(w.paBonus),
    damage: {
      count: Math.max(1, asInt(dmg.count, 1)),
      sides: isDieSides(dmg.sides) ? dmg.sides : 6,
      modifier: asInt(dmg.modifier),
    },
  }
}

export function normalizeCharacter(raw: unknown): Character {
  const c = isObject(raw) ? raw : {}
  const character = createCharacter(asString(c.id) || newId())
  const info = isObject(c.info) ? c.info : {}
  character.info = {
    name: asString(info.name),
    species: asString(info.species),
    culture: asString(info.culture),
    profession: asString(info.profession),
  }
  const attributes = isObject(c.attributes) ? c.attributes : {}
  for (const a of ATTRIBUTE_IDS) {
    if (a in attributes) character.attributes[a] = clampAttribute(asInt(attributes[a], 8))
  }
  const talents = isObject(c.talents) ? c.talents : {}
  for (const t of TALENTS) {
    if (t.id in talents) character.talents[t.id] = Math.max(0, asInt(talents[t.id]))
  }
  character.weapons = Array.isArray(c.weapons) ? c.weapons.map(normalizeWeapon) : []
  return character
}

/** Ensures ids are unique, renaming later duplicates. */
function dedupeIds<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.map((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      return item
    }
    const copy = { ...item, id: newId() }
    seen.add(copy.id)
    return copy
  })
}

export function normalizeCharacterState(raw: unknown): CharacterState {
  const s = isObject(raw) ? raw : {}
  const characters = dedupeIds(
    (Array.isArray(s.characters) ? s.characters : []).map(normalizeCharacter),
  ).map((c) => ({ ...c, weapons: dedupeIds(c.weapons) }))
  const requested = asString(s.activeCharacterId)
  const activeCharacterId = characters.some((c) => c.id === requested)
    ? requested
    : (characters[0]?.id ?? null)
  return { activeCharacterId, characters }
}

// --- settings ------------------------------------------------------------------------------------

export function normalizeSettings(raw: unknown): Settings {
  const s = isObject(raw) ? raw : {}
  const d = defaultSettings()
  const colors = isObject(s.diceColors) ? s.diceColors : {}
  const attributeColors = isObject(colors.attribute) ? colors.attribute : {}
  const throwRaw = isObject(s.throw) ? s.throw : {}
  const bg = isObject(s.background) ? s.background : {}
  const speed = asInt(s.simSpeed, 1)
  return {
    diceColors: {
      attribute: Object.fromEntries(
        ATTRIBUTE_IDS.map((a) => [a, asColor(attributeColors[a], d.diceColors.attribute[a])]),
      ) as Record<AttributeId, string>,
      talent: asColor(colors.talent, d.diceColors.talent),
      combat: asColor(colors.combat, d.diceColors.combat),
      damage: asColor(colors.damage, d.diceColors.damage),
      critical: asColor(colors.critical, d.diceColors.critical),
      extra: asColor(colors.extra, d.diceColors.extra),
    },
    talentDiceInAttributeColors:
      typeof s.talentDiceInAttributeColors === 'boolean'
        ? s.talentDiceInAttributeColors
        : d.talentDiceInAttributeColors,
    throw: {
      angle: asNumber(throwRaw.angle, d.throw.angle, 0, 360),
      distance: asNumber(
        throwRaw.distance,
        d.throw.distance,
        THROW_LIMITS.distance.min,
        THROW_LIMITS.distance.max,
      ),
      strength: asNumber(
        throwRaw.strength,
        d.throw.strength,
        THROW_LIMITS.strength.min,
        THROW_LIMITS.strength.max,
      ),
    },
    simSpeed: speed === 2 || speed === 3 ? speed : 1,
    muted: typeof s.muted === 'boolean' ? s.muted : d.muted,
    background: {
      animated: typeof bg.animated === 'boolean' ? bg.animated : d.background.animated,
      icosahedronColor: asColor(bg.icosahedronColor, d.background.icosahedronColor),
      cubeColor: asColor(bg.cubeColor, d.background.cubeColor),
    },
  }
}
