/**
 * Converts data saved by the old app (PDTP ≤ 0.1.x) into the current schema.
 *
 * Old localStorage keys:
 * - `character`: Pinia store `{ activeCharacterId, characters: { [id]: OldCharacter }, … }`, or the
 *   even older single-character shape `OldCharacter` (no `characters` key).
 * - `diceAppearances`, `diceAppearancePrefs`, `currentBackground`, `hexagonColor`, `squareColor`.
 *
 * The old keys are never modified, so they stay around as a backup.
 */
import { ATTRIBUTE_IDS, clampAttribute } from '@/domain/attributes'
import {
  createCharacter,
  createWeapon,
  newId,
  type Character,
  type Weapon,
} from '@/domain/character'
import { isDieSides } from '@/domain/dice'
import { findTalentByName } from '@/domain/talents'
import {
  asInt,
  asString,
  defaultSettings,
  isObject,
  normalizeSettings,
  type CharacterState,
  type Settings,
} from './schema'

export const LEGACY_KEYS = {
  characters: 'character',
  diceAppearances: 'diceAppearances',
  diceAppearancePrefs: 'diceAppearancePrefs',
  background: 'currentBackground',
  hexagonColor: 'hexagonColor',
  squareColor: 'squareColor',
} as const

export interface LegacyCharactersResult {
  state: CharacterState
  /** Talent names in the old data that are not in the catalog (their values are dropped). */
  unknownTalents: string[]
}

function convertWeapon(raw: unknown): Weapon {
  const w = isObject(raw) ? raw : {}
  const tp = isObject(w.tp) ? w.tp : {}
  return {
    ...createWeapon(asString(w.id) || newId()),
    name: asString(w.name),
    type: asString(w.type),
    notes: asString(w.notes),
    at: asInt(w.at),
    pa: asInt(w.pa),
    atBonus: asInt(w.atBonus),
    paBonus: asInt(w.paBonus),
    damage: {
      count: Math.max(1, asInt(tp.diceCount, 1)),
      sides: isDieSides(tp.diceType) ? tp.diceType : 6,
      modifier: asInt(tp.modifier),
    },
  }
}

export function convertLegacyCharacter(
  raw: unknown,
  id: string,
  unknownTalents: Set<string> = new Set(),
): Character {
  const old = isObject(raw) ? raw : {}
  const character = createCharacter(id)

  const info = isObject(old.characterInfo) ? old.characterInfo : {}
  character.info = {
    name: asString(info.name),
    species: asString(info.spezies),
    culture: asString(info.kultur),
    profession: asString(info.profession),
  }

  const stats = isObject(old.stats) ? old.stats : {}
  const attributes = isObject(stats.attributes) ? stats.attributes : {}
  for (const a of ATTRIBUTE_IDS) {
    if (a in attributes) character.attributes[a] = clampAttribute(asInt(attributes[a], 8))
  }

  const categories = isObject(old.talents) ? Object.values(old.talents) : []
  for (const list of categories) {
    if (!Array.isArray(list)) continue
    for (const entry of list) {
      if (!isObject(entry)) continue
      const name = asString(entry.name)
      const talent = findTalentByName(name)
      if (talent) character.talents[talent.id] = Math.max(0, asInt(entry.value))
      else if (name) unknownTalents.add(name)
    }
  }

  character.weapons = Array.isArray(old.weapons) ? old.weapons.map(convertWeapon) : []
  return character
}

/** Accepts the parsed value of the old `character` key in either of its historic shapes. */
export function convertLegacyCharacters(raw: unknown): LegacyCharactersResult | null {
  if (!isObject(raw)) return null
  const unknown = new Set<string>()
  let characters: Character[]
  let activeCharacterId: string | null = null

  if (isObject(raw.characters)) {
    characters = Object.entries(raw.characters).map(([id, c]) =>
      convertLegacyCharacter(c, id || newId(), unknown),
    )
    const active = asString(raw.activeCharacterId)
    activeCharacterId = characters.some((c) => c.id === active) ? active : null
  } else if ('characterInfo' in raw || 'stats' in raw || 'talents' in raw) {
    // Single-character format from before multiple characters existed.
    characters = [convertLegacyCharacter(raw, '1', unknown)]
  } else {
    return null
  }

  return {
    state: { characters, activeCharacterId: activeCharacterId ?? characters[0]?.id ?? null },
    unknownTalents: [...unknown],
  }
}

function parseJson(text: string | null): unknown {
  if (text === null) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Builds settings from the old keys; returns null when none of them exist. */
export function convertLegacySettings(read: (key: string) => string | null): Settings | null {
  const appearances = parseJson(read(LEGACY_KEYS.diceAppearances))
  const prefs = parseJson(read(LEGACY_KEYS.diceAppearancePrefs))
  const background = read(LEGACY_KEYS.background)
  const hexagonColor = read(LEGACY_KEYS.hexagonColor)
  const squareColor = read(LEGACY_KEYS.squareColor)
  if (
    appearances === undefined &&
    prefs === undefined &&
    background === null &&
    hexagonColor === null &&
    squareColor === null
  ) {
    return null
  }

  const d = defaultSettings()
  const colorOf = (value: unknown, fallback: string) =>
    isObject(value) ? asString(value.color, fallback) : fallback
  const a = isObject(appearances) ? appearances : {}
  const d20 = isObject(a.d20) ? a.d20 : {}
  const d6 = isObject(a.d6) ? a.d6 : {}
  const attr = isObject(d20.attribute) ? d20.attribute : {}
  const talent = isObject(d20.talent) ? d20.talent : {}
  const combat = isObject(d20.combat) ? d20.combat : {}

  return normalizeSettings({
    ...d,
    diceColors: {
      attribute: Object.fromEntries(
        ATTRIBUTE_IDS.map((id) => [id, colorOf(attr[id], d.diceColors.attribute[id])]),
      ),
      talent: colorOf(talent.default, d.diceColors.talent),
      combat: colorOf(combat.default, d.diceColors.combat),
      damage: colorOf(d6.damage, d.diceColors.damage),
      critical: colorOf(d6.critical, d.diceColors.critical),
      extra: colorOf(d6.extra, d.diceColors.extra),
    },
    // Old pref `useTalentColors: true` meant "one talent colour"; it defaulted to true.
    talentDiceInAttributeColors: isObject(prefs) && prefs.useTalentColors === false,
    background: {
      animated: background === 'animiert',
      icosahedronColor: hexagonColor ?? d.background.icosahedronColor,
      cubeColor: squareColor ?? d.background.cubeColor,
    },
  })
}

export interface LegacyImport {
  characters: LegacyCharactersResult | null
  settings: Settings | null
}

export function importLegacy(read: (key: string) => string | null): LegacyImport {
  return {
    characters: convertLegacyCharacters(parseJson(read(LEGACY_KEYS.characters))),
    settings: convertLegacySettings(read),
  }
}
