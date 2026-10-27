import { beforeEach, describe, expect, it } from 'vitest'

import { TALENTS } from '@/domain/talents'
import { exportCharacters, parseCharacterImport, ImportError } from '../exchange'
import { convertLegacyCharacters, convertLegacySettings, LEGACY_KEYS } from '../legacyImport'
import { loadPersistedState, saveCharacters, STORAGE_KEYS } from '../storage'
import oldTalents from './fixtures/old-talents.json'

type OldTalents = Record<string, { name: string; value: number; attributes: string[] }[]>

/** A character exactly as the old app's createCharacter() stored it, with some values filled in. */
function oldCharacter(name: string, talentValues: Record<string, number> = {}) {
  const talents = structuredClone(oldTalents) as OldTalents
  for (const list of Object.values(talents)) {
    for (const t of list) t.value = talentValues[t.name] ?? 0
  }
  return {
    characterInfo: { name, spezies: 'Mensch', kultur: 'Mittelreich', profession: 'Söldner' },
    stats: { attributes: { MU: 14, KL: 11, IN: 13, CH: 10, FF: 12, GE: 14, KO: 13, KK: 15 } },
    talents,
    weapons: [
      {
        id: '1733500000000',
        name: 'Langschwert',
        type: 'Schwerter',
        at: 14,
        pa: 8,
        atBonus: 1,
        paBonus: 0,
        tp: { diceCount: 1, diceType: 6, modifier: 4 },
        notes: '',
      },
    ],
  }
}

/** The current old format: Pinia store state, with the leftover single-character fields on top. */
function oldStore() {
  const leftover = oldCharacter('')
  return {
    activeCharacterId: '1733400000000',
    characters: {
      '1733300000000': oldCharacter('Alrik', { Klettern: 7, 'Brett-und Glücksspiel': 3 }),
      '1733400000000': oldCharacter('Thorwalerin', { Zechen: 12 }),
    },
    characterInfo: leftover.characterInfo,
    stats: leftover.stats,
    talents: leftover.talents,
  }
}

describe('convertLegacyCharacters', () => {
  it('fixture covers every talent in the catalog', () => {
    const names = Object.values(oldTalents as OldTalents).flatMap((l) => l.map((t) => t.name))
    expect(names).toHaveLength(TALENTS.length)
  })

  it('converts the multi-character store format', () => {
    const result = convertLegacyCharacters(oldStore())!
    expect(result.unknownTalents).toEqual([])
    expect(result.state.activeCharacterId).toBe('1733400000000')
    expect(result.state.characters.map((c) => c.info.name)).toEqual(['Alrik', 'Thorwalerin'])

    const alrik = result.state.characters[0]!
    expect(alrik.info).toEqual({
      name: 'Alrik',
      species: 'Mensch',
      culture: 'Mittelreich',
      profession: 'Söldner',
    })
    expect(alrik.attributes.KK).toBe(15)
    expect(alrik.talents.klettern).toBe(7)
    expect(alrik.talents['brett-gluecksspiel']).toBe(3)
    expect(alrik.weapons[0]).toEqual({
      id: '1733500000000',
      name: 'Langschwert',
      type: 'Schwerter',
      notes: '',
      at: 14,
      pa: 8,
      atBonus: 1,
      paBonus: 0,
      damage: { count: 1, sides: 6, modifier: 4 },
    })
  })

  it('does not resurrect the leftover top-level character when all characters were deleted', () => {
    const store = { ...oldStore(), characters: {}, activeCharacterId: null }
    expect(convertLegacyCharacters(store)!.state).toEqual({
      characters: [],
      activeCharacterId: null,
    })
  })

  it('converts the older single-character format, including the Menschkenntnis typo', () => {
    const single = oldCharacter('Solo')
    single.talents.gesellschaftstalente!.find((t) => t.name === 'Menschenkenntnis')!.name =
      'Menschkenntnis'
    single.talents.gesellschaftstalente!.find((t) => t.name === 'Menschkenntnis')!.value = 9
    const result = convertLegacyCharacters(single)!
    expect(result.state.characters).toHaveLength(1)
    expect(result.state.characters[0]!.talents.menschenkenntnis).toBe(9)
    expect(result.state.activeCharacterId).toBe('1')
  })

  it('reports unknown talents and clamps out-of-range values', () => {
    const c = oldCharacter('X')
    c.talents.koerpertalente!.push({
      name: 'Hausregel-Talent',
      value: 4,
      attributes: ['MU', 'MU', 'MU'],
    })
    c.stats.attributes.MU = 3
    c.talents.koerpertalente![0]!.value = -2
    const result = convertLegacyCharacters({ activeCharacterId: 'a', characters: { a: c } })!
    expect(result.unknownTalents).toEqual(['Hausregel-Talent'])
    expect(result.state.characters[0]!.attributes.MU).toBe(8)
    expect(result.state.characters[0]!.talents.fliegen).toBe(0)
  })

  it('ignores data that is not an old save', () => {
    expect(convertLegacyCharacters(null)).toBeNull()
    expect(convertLegacyCharacters({ foo: 1 })).toBeNull()
  })
})

describe('convertLegacySettings', () => {
  it('returns null when the old app never saved settings', () => {
    expect(convertLegacySettings(() => null)).toBeNull()
  })

  it('imports background settings as saved by the old app', () => {
    const old: Record<string, string> = {
      [LEGACY_KEYS.background]: 'animiert',
      [LEGACY_KEYS.squareColor]: '#123456',
    }
    const settings = convertLegacySettings((k) => old[k] ?? null)!
    expect(settings.background).toEqual({
      animated: true,
      icosahedronColor: '#258141',
      cubeColor: '#123456',
    })
    expect(settings.talentDiceInAttributeColors).toBe(false)
  })

  it('imports dice colours and the talent colour preference', () => {
    const old: Record<string, string> = {
      [LEGACY_KEYS.diceAppearances]: JSON.stringify({
        d20: {
          attribute: { MU: { color: '#aa0000', opacity: 1, shininess: 30 } },
          talent: { default: { color: '#00aa00' } },
          combat: { default: { color: '#0000aa' } },
        },
        d6: {
          damage: { color: '#111111' },
          critical: { color: '#222222' },
          extra: { color: '#333333' },
        },
      }),
      [LEGACY_KEYS.diceAppearancePrefs]: JSON.stringify({ useTalentColors: false }),
    }
    const settings = convertLegacySettings((k) => old[k] ?? null)!
    expect(settings.diceColors.attribute.MU).toBe('#aa0000')
    expect(settings.diceColors.attribute.KL).toBe('#00ff00')
    expect(settings.diceColors).toMatchObject({
      talent: '#00aa00',
      combat: '#0000aa',
      damage: '#111111',
      critical: '#222222',
      extra: '#333333',
    })
    expect(settings.talentDiceInAttributeColors).toBe(true)
  })
})

describe('loadPersistedState', () => {
  beforeEach(() => localStorage.clear())

  it('starts empty without old data', () => {
    const state = loadPersistedState()
    expect(state.importReport).toBeNull()
    expect(state.characters.characters).toEqual([])
  })

  it('imports old data once and leaves the old keys untouched', () => {
    const oldValue = JSON.stringify(oldStore())
    localStorage.setItem(LEGACY_KEYS.characters, oldValue)
    localStorage.setItem(LEGACY_KEYS.background, 'animiert')

    const first = loadPersistedState()
    expect(first.importReport).toEqual({
      characterCount: 2,
      settingsImported: true,
      unknownTalents: [],
    })
    expect(first.settings.background.animated).toBe(true)
    expect(localStorage.getItem(LEGACY_KEYS.characters)).toBe(oldValue)

    // Deleting every character must not trigger a second import.
    saveCharacters({ characters: [], activeCharacterId: null })
    const second = loadPersistedState()
    expect(second.importReport).toBeNull()
    expect(second.characters.characters).toEqual([])
  })

  it('survives corrupted storage', () => {
    localStorage.setItem(STORAGE_KEYS.characters, '{not json')
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ version: 1, data: { simSpeed: 9 } }),
    )
    const state = loadPersistedState()
    expect(state.characters.characters).toEqual([])
    expect(state.settings.simSpeed).toBe(1)
  })
})

describe('character export/import', () => {
  it('round-trips characters with fresh ids', () => {
    const { characters } = convertLegacyCharacters(oldStore())!.state
    const imported = parseCharacterImport(exportCharacters(characters))
    expect(imported).toHaveLength(2)
    expect(imported[0]!.id).not.toBe(characters[0]!.id)
    expect({ ...imported[0], id: 'x', weapons: [] }).toEqual({
      ...characters[0],
      id: 'x',
      weapons: [],
    })
    expect(imported[0]!.weapons[0]!.name).toBe('Langschwert')
  })

  it("accepts the old app's raw localStorage value", () => {
    expect(parseCharacterImport(JSON.stringify(oldStore())).map((c) => c.info.name)).toEqual([
      'Alrik',
      'Thorwalerin',
    ])
  })

  it('rejects unrelated files with a readable message', () => {
    expect(() => parseCharacterImport('nope')).toThrow(ImportError)
    expect(() => parseCharacterImport('{"hello": 1}')).toThrow('keine PDTP-Charaktere')
  })
})
