import { loadPersistedState, type PersistedState } from '@/persistence/storage'

let initial: PersistedState | null = null

/** Saved state, loaded (and the old app's data imported) once per page load. */
export function getInitialState(): PersistedState {
  initial ??= loadPersistedState()
  return initial
}
