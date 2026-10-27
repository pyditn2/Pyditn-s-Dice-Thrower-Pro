/**
 * Saving and opening text files. Uses native dialogs in the Tauri app and download/upload in the
 * browser. The Tauri plugins are imported lazily so the web build never loads them.
 */
import { isTauri } from '@tauri-apps/api/core'

const JSON_FILTER = { name: 'PDTP-Charaktere', extensions: ['json'] }

/** Returns false when the user cancelled. */
export async function saveTextFile(fileName: string, contents: string): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await save({ defaultPath: fileName, filters: [JSON_FILTER] })
    if (!path) return false
    await writeTextFile(path, contents)
    return true
  }

  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return true
}

/** Returns null when the user cancelled. */
export async function openTextFile(): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await open({ multiple: false, directory: false, filters: [JSON_FILTER] })
    return typeof path === 'string' ? readTextFile(path) : null
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (file) file.text().then(resolve, reject)
      else resolve(null)
    })
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}
