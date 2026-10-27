import { importLegacy } from './legacyImport'
import {
  SCHEMA_VERSION,
  defaultSettings,
  isObject,
  normalizeCharacterState,
  normalizeSettings,
  type CharacterState,
  type Settings,
} from './schema'

export const STORAGE_KEYS = {
  characters: 'pdtp:characters',
  settings: 'pdtp:settings',
} as const

/** What happened on first launch after updating from the old app (shown once in the UI). */
export interface ImportReport {
  characterCount: number
  settingsImported: boolean
  unknownTalents: string[]
}

export interface PersistedState {
  characters: CharacterState
  settings: Settings
  importReport: ImportReport | null
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ version: SCHEMA_VERSION, data }))
  } catch (error) {
    console.error(`Could not save ${key}`, error)
  }
}

function readVersioned(key: string): unknown {
  const text = read(key)
  if (text === null) return undefined
  try {
    const parsed: unknown = JSON.parse(text)
    return isObject(parsed) ? parsed.data : undefined
  } catch {
    return undefined
  }
}

export function saveCharacters(state: CharacterState): void {
  write(STORAGE_KEYS.characters, state)
}

export function saveSettings(settings: Settings): void {
  write(STORAGE_KEYS.settings, settings)
}

/**
 * Loads saved state. On the first launch after the old app, imports its data once and saves it in
 * the new format right away, so the import never runs again (even after all characters are deleted).
 */
export function loadPersistedState(): PersistedState {
  const storedCharacters = readVersioned(STORAGE_KEYS.characters)
  const storedSettings = readVersioned(STORAGE_KEYS.settings)

  if (storedCharacters !== undefined || storedSettings !== undefined) {
    return {
      characters: normalizeCharacterState(storedCharacters),
      settings: normalizeSettings(storedSettings),
      importReport: null,
    }
  }

  const legacy = importLegacy(read)
  const characters = legacy.characters?.state ?? normalizeCharacterState(undefined)
  const settings = legacy.settings ?? defaultSettings()
  saveCharacters(characters)
  saveSettings(settings)

  const imported = legacy.characters !== null || legacy.settings !== null
  return {
    characters,
    settings,
    importReport: imported
      ? {
          characterCount: characters.characters.length,
          settingsImported: legacy.settings !== null,
          unknownTalents: legacy.characters?.unknownTalents ?? [],
        }
      : null,
  }
}
