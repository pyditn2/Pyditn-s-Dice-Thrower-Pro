/**
 * Optional check against a real save of the old app. Point PDTP_REAL_DATA at a file containing the
 * old `character` localStorage value (as JSON) and run `npx vitest run realData`.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { convertLegacyCharacters } from '../legacyImport'

const path = process.env.PDTP_REAL_DATA

describe.skipIf(!path)('real old save', () => {
  it('converts without losing characters, weapons or talent values', () => {
    const raw = JSON.parse(readFileSync(path!, 'utf8')) as {
      characters?: Record<
        string,
        { weapons?: unknown[]; talents?: Record<string, { value: number }[]> }
      >
    }
    const result = convertLegacyCharacters(raw)
    expect(result).not.toBeNull()
    const { characters } = result!.state
    const old = Object.values(raw.characters ?? {})

    console.log(
      `characters: ${characters.length}, weapons: ${characters.map((c) => c.weapons.length).join('/')}, ` +
        `unknown talents: ${JSON.stringify(result!.unknownTalents)}`,
    )
    expect(result!.unknownTalents).toEqual([])
    expect(characters).toHaveLength(old.length)
    characters.forEach((c, i) => {
      expect(c.weapons).toHaveLength(old[i]!.weapons?.length ?? 0)
      const oldSum = Object.values(old[i]!.talents ?? {})
        .flat()
        .reduce((s, t) => s + Math.max(0, Number(t.value) || 0), 0)
      const newSum = Object.values(c.talents).reduce((s, v) => s + v, 0)
      expect(newSum).toBe(oldSum)
    })
  })
})
