import { describe, expect, it } from 'vitest'

import { ATTRIBUTE_IDS } from '../attributes'
import { createCharacter } from '../character'
import { TALENT_CATEGORIES, TALENTS, findTalentByName, talentsInCategory } from '../talents'

describe('talent catalog', () => {
  it('has the 59 talents of the old app with unique ids and names', () => {
    expect(TALENTS).toHaveLength(59)
    expect(new Set(TALENTS.map((t) => t.id)).size).toBe(59)
    expect(new Set(TALENTS.map((t) => t.name)).size).toBe(59)
  })

  it('keeps the old category sizes', () => {
    expect(TALENT_CATEGORIES.map((c) => talentsInCategory(c.id).length)).toEqual([14, 9, 7, 12, 17])
  })

  it('only uses known attributes', () => {
    for (const t of TALENTS) for (const a of t.attributes) expect(ATTRIBUTE_IDS).toContain(a)
  })

  it('resolves old names, including fixed typos', () => {
    expect(findTalentByName('Menschkenntnis')?.id).toBe('menschenkenntnis')
    expect(findTalentByName('Brett-und Glücksspiel')?.id).toBe('brett-gluecksspiel')
    expect(findTalentByName('Körperbeherrschung')?.attributes).toEqual(['GE', 'GE', 'KO'])
    expect(findTalentByName('Unbekannt')).toBeUndefined()
  })
})

describe('createCharacter', () => {
  it('starts with all attributes at 8 and every talent at 0', () => {
    const c = createCharacter('x')
    expect(Object.values(c.attributes)).toEqual(Array(8).fill(8))
    expect(Object.keys(c.talents)).toHaveLength(59)
    expect(Object.values(c.talents).every((v) => v === 0)).toBe(true)
  })
})
