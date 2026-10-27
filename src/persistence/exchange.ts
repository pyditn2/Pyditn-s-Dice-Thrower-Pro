/** Character export/import as JSON files (desktop ↔ web, backups). */
import { characterDisplayName, newId, type Character } from '@/domain/character'
import { convertLegacyCharacters } from './legacyImport'
import { SCHEMA_VERSION, isObject, normalizeCharacter } from './schema'

export const EXPORT_KIND = 'pdtp-characters'

export interface CharacterExport {
  kind: typeof EXPORT_KIND
  version: number
  exportedAt: string
  characters: Character[]
}

export function exportCharacters(characters: Character[], now = new Date()): string {
  const file: CharacterExport = {
    kind: EXPORT_KIND,
    version: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    characters,
  }
  return JSON.stringify(file, null, 2)
}

export function exportFileName(characters: Character[], now = new Date()): string {
  const date = now.toISOString().slice(0, 10)
  const single = characters.length === 1 ? characters[0] : undefined
  const label = single
    ? characterDisplayName(single)
        .replace(/[^\p{L}\p{N}_-]+/gu, '-')
        .replace(/^-+|-+$/g, '')
    : 'Charaktere'
  return `PDTP-${label || 'Charakter'}-${date}.json`
}

export class ImportError extends Error {}

/**
 * Parses an exported file. Also accepts the old app's raw `character` localStorage value, so data
 * can be rescued by hand if the automatic import ever fails. Imported characters always get fresh
 * ids, so importing never overwrites an existing character.
 */
export function parseCharacterImport(text: string): Character[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ImportError('Die Datei ist kein gültiges JSON.')
  }

  let characters: Character[]
  if (isObject(parsed) && parsed.kind === EXPORT_KIND && Array.isArray(parsed.characters)) {
    characters = parsed.characters.map(normalizeCharacter)
  } else {
    const legacy = convertLegacyCharacters(parsed)
    if (!legacy) throw new ImportError('Die Datei enthält keine PDTP-Charaktere.')
    characters = legacy.state.characters
  }

  if (characters.length === 0) throw new ImportError('Die Datei enthält keine Charaktere.')
  return characters.map((c) => ({
    ...c,
    id: newId(),
    weapons: c.weapons.map((w) => ({ ...w, id: newId() })),
  }))
}
